import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import { mutate, remove } from "@/lib/admin/mutations";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
export const dynamic = "force-dynamic";
async function handle(
  req: Request,
  params: Promise<{ resource: string; id?: string[] }>,
  deleting = false,
) {
  if (
    !req.headers.get("origin") ||
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
  try {
    const { resource, id } = await params;
    if (id && id.length > 1)
      return NextResponse.json({ error: "Invalid route" }, { status: 404 });
    if (Number(req.headers.get("content-length") || 0) > 1000000)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    if (deleting) {
      if (!id?.[0]) throw new Error("Missing record");
      await remove(resource, id[0], admin);
      return NextResponse.json({ ok: true });
    }
    const body = await req.json();
    const result = await mutate(resource, id?.[0] ?? null, body, admin);
    return NextResponse.json({ ok: true, id: result.id });
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
    if (e instanceof Prisma.PrismaClientKnownRequestError)
      return NextResponse.json(
        {
          error:
            e.code === "P2002"
              ? "A record with this slug or unique field already exists."
              : e.code === "P2003"
                ? "This record is referenced by other records. Remove those relationships first."
                : "The record could not be saved.",
        },
        { status: 400 },
      );
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not save record" },
      { status: 400 },
    );
  }
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ resource: string; id?: string[] }> },
) {
  return handle(req, params);
}
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ resource: string; id?: string[] }> },
) {
  return handle(req, params, true);
}
