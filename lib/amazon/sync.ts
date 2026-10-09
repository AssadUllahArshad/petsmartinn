import type { AmazonItem } from "./types";
// This whitelist is deliberately separate from editor/SEO data.
export function managedSyncPatch(
  item: AmazonItem,
  fields: string[],
  now = new Date(),
) {
  const commission =
    item.price !== null && item.commissionRate !== null
      ? item.price * item.commissionRate
      : null;
  return {
    amazonLastSyncAt: now,
    amazonExpiresAt: new Date(now.getTime() + 24 * 3600000),
    amazonSyncStatus: item.mock ? "MOCK_SYNCED" : "SYNCED",
    ...(fields.includes("price")
      ? {
          price: item.price,
          currency: item.currency || undefined,
          amazonCommissionRate: item.commissionRate,
          amazonCommissionSource: item.commissionSource,
          estimatedCommissionPerSale: commission,
        }
      : {}),
    ...(fields.includes("availability")
      ? { amazonAvailability: item.availability }
      : {}),
    ...(fields.includes("images")
      ? { mainImage: item.image || "", imageAlt: item.image ? item.title : "" }
      : {}),
    ...(fields.includes("brand") ? { amazonBrandName: item.brand } : {}),
  };
}
