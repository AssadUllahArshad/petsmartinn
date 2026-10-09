export const dynamic = "force-dynamic";
import type { MetadataRoute } from "next";
import { db, databaseConfigured } from "@/lib/db";
import { baseUrl } from "@/lib/seo";
import { settings } from "@/lib/catalog";
import { contentPath } from "@/lib/content";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!databaseConfigured() || (await settings()).demoMode) return [];
  const [ps, cs, bs, content] = await Promise.all([
    db.product.findMany({
      where: { status: "PUBLISHED", isDemo: false },
      select: { slug: true, updatedAt: true, seo: true },
    }),
    db.category.findMany({ where: { status: "PUBLISHED" } }),
    db.brand.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { products: { some: { status: "PUBLISHED", isDemo: false } } },
          { body: { not: "" } },
        ],
      },
    }),
    db.content.findMany({ where: { status: "PUBLISHED" } }),
  ]);
  const values = [
    ...ps.map((p) => ({ path: "/product/" + p.slug, ...p })),
    ...cs.map((c) => ({ ...c })),
    ...bs.map((b) => ({ path: "/brands/" + b.slug, ...b })),
    ...content.map((c) => ({ path: contentPath(c), ...c })),
  ];
  return [
    { url: baseUrl(), changeFrequency: "weekly" },
    ...values
      .filter((v) => !(v.seo as { noindex?: boolean }).noindex)
      .map((v) => ({ url: baseUrl() + v.path, lastModified: v.updatedAt })),
  ];
}
