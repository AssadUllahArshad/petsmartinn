import { db, databaseConfigured } from "@/lib/db";
import { demoProducts } from "@/lib/demo";
import {
  affiliateDestination,
  referrerHost,
  safeSource,
  deviceCategory,
} from "@/services/affiliate";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  const p = databaseConfigured()
    ? await db.product.findFirst({
        where: { id: productId, status: "PUBLISHED" },
        include: { brand: true, categories: { include: { category: true } } },
      })
    : demoProducts.find((p) => p.id === productId);
  if (!p) return new Response("Product unavailable", { status: 404 });
  let location: string;
  try {
    location = affiliateDestination(p.affiliateUrl);
  } catch {
    return new Response("Link unavailable", { status: 400 });
  }
  const url = new URL(request.url);
  if (databaseConfigured() && p.trackClicks) {
    await db.affiliateClick
      .create({
        data: {
          productId: p.id,
          productTitle: p.title,
          categoryNames: p.categories.map((c) => c.category.name),
          brandName: p.brand?.name,
          merchant: p.merchant,
          sourcePage: safeSource(url.searchParams.get("source")),
          referrer: referrerHost(request.headers.get("referer")),
          campaign: url.searchParams.get("campaign")?.slice(0, 100),
          utmSource: url.searchParams.get("utm_source")?.slice(0, 100),
          utmMedium: url.searchParams.get("utm_medium")?.slice(0, 100),
          utmCampaign: url.searchParams.get("utm_campaign")?.slice(0, 100),
          device: deviceCategory(request.headers.get("user-agent") || ""),
        },
      })
      .catch(() => console.error("Affiliate click could not be recorded"));
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
