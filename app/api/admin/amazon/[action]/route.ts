import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { currentAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/auth/rate-limit";
import {
  searchAmazon,
  importAmazon,
  excludeAmazon,
  syncAmazon,
  saveAmazonRule,
  amazonLog,
} from "@/services/amazon/store";
import { AmazonApiError } from "@/services/amazon/creators";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  if (
    req.headers.get("origin") !==
    new URL(process.env.NEXTAUTH_URL || req.url).origin
  )
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  const admin = await currentAdmin();
  if (!admin)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  const { action } = await params;
  if (
    !["search", "import", "exclude", "sync", "rules", "unexclude"].includes(
      action,
    )
  )
    return NextResponse.json(
      { error: "Unknown Amazon action" },
      { status: 404 },
    );
  if (action === "rules" && admin.role !== "OWNER")
    return NextResponse.json(
      { error: "Only owners can edit Amazon import rules" },
      { status: 403 },
    );
  if (Number(req.headers.get("content-length") || 0) > 40000)
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 40000)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (
      !(await rateLimit(
        "amazon:admin:" +
          (action === "search" ? "search:" : "write:") +
          admin.id,
        action === "search" ? 6 : 40,
        60,
      ))
    ) {
      await amazonLog(
        "rate_limit",
        "WARN",
        "Admin Amazon request limit reached",
        admin.id,
      );
      return NextResponse.json(
        { error: "Too many requests. Try again shortly." },
        { status: 429 },
      );
    }
    let result: unknown;
    if (action === "search") result = await searchAmazon(body, admin.id);
    else if (action === "import") result = await importAmazon(body, admin.id);
    else if (action === "exclude") result = await excludeAmazon(body, admin.id);
    else if (action === "rules") result = await saveAmazonRule(body, admin.id);
    else if (action === "sync") {
      const v = z
        .object({ ids: z.array(z.string().min(1).max(200)).min(1).max(10) })
        .parse(body);
      result = await syncAmazon(v.ids, admin.id);
    } else {
      const v = z.object({ id: z.string().min(1).max(200) }).parse(body);
      await db.amazonExclusion.delete({ where: { id: v.id } });
      await amazonLog(
        "exclude",
        "OK",
        "Excluded ASIN restored to search eligibility",
        admin.id,
      );
      result = { ok: true };
    }
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json(
        {
          error: e.issues
            .map((i) => i.path.join(".") + ": " + i.message)
            .join("; "),
        },
        { status: 400 },
      );
    if (e instanceof AmazonApiError) {
      await amazonLog(
        e.code === "RATE_LIMIT" ? "rate_limit" : "api_error",
        "ERROR",
        e.message,
        admin.id,
      );
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    // Never return a Prisma error, provider payload, request body, or credentials.
    const safe =
      e instanceof Error &&
      [
        "Select an existing Petsmartinn category",
        "Destination category is no longer available",
        "Choose existing Amazon imports",
        "Sync mode and marketplace must match the imported products",
        "Search preview expired or belongs to another administrator. Search again.",
        "Amazon mode or marketplace changed. Search again.",
        "Product is not in this authorized search preview",
        "An excluded result cannot be imported. Search again.",
        "Fallback destination category does not exist",
        "Live ranking requires the operator to confirm Amazon analysis approval with AMAZON_ANALYSIS_APPROVED=true. See Amazon settings.",
      ].includes(e.message)
        ? e.message
        : "Amazon operation could not be completed. Check logs and retry.";
    await amazonLog("api_error", "ERROR", safe, admin.id).catch(() => {});
    return NextResponse.json({ error: safe }, { status: 400 });
  }
}
