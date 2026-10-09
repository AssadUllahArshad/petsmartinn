import "server-only";
import { db } from "@/lib/db";
export async function expireAmazonCache(now = new Date()) {
  await db.amazonSearchBatch.deleteMany({ where: { expiresAt: { lte: now } } });
  const expired = await db.product.findMany({
    where: {
      source: "AMAZON",
      amazonExpiresAt: { lte: now },
      amazonSyncStatus: { not: "STALE" },
    },
    select: { id: true, amazonAsin: true, amazonTitleManaged: true },
  });
  for (const p of expired)
    await db.$transaction(async (tx) => {
      const changed = await tx.product.updateMany({
        where: {
          id: p.id,
          source: "AMAZON",
          amazonExpiresAt: { lte: now },
          amazonSyncStatus: { not: "STALE" },
        },
        data: {
          price: null,
          oldPrice: null,
          rating: null,
          reviewCount: null,
          mainImage: "",
          imageAlt: "",
          amazonAvailability: null,
          amazonBrandName: null,
          estimatedCommissionPerSale: null,
          amazonOpportunityScore: null,
          amazonSyncStatus: "STALE",
          ...(p.amazonTitleManaged
            ? { title: `Amazon product ${p.amazonAsin}` }
            : {}),
        },
      });
      if (changed.count)
        await tx.productImage.deleteMany({ where: { productId: p.id } });
    });
  return expired.length;
}
