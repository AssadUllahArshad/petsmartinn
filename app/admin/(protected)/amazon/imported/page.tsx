import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { expireAmazonCache } from "@/services/amazon/cache";
import { ImportedAmazon } from "@/components/admin/amazon/imported";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  await expireAmazonCache();
  const q = await searchParams;
  const page = /^[1-9]\d{0,4}$/.test(q.page || "") ? Number(q.page) : 1;
  const rows = await db.product.findMany({
    where: { source: { in: ["AMAZON", "AMAZON_MOCK"] } },
    include: { _count: { select: { clicks: true } } },
    orderBy: { createdAt: "desc" },
    take: 51,
    skip: (page - 1) * 50,
  });
  return (
    <>
      <ImportedAmazon
        rows={rows
          .slice(0, 50)
          .map((p) => ({
            id: p.id,
            title: p.title,
            amazonAsin: p.amazonAsin,
            amazonMarketplace: p.amazonMarketplace,
            source: p.source,
            status: p.status,
            amazonSyncStatus: p.amazonSyncStatus,
            amazonLastSyncAt: p.amazonLastSyncAt?.toISOString() || null,
            amazonOpportunityScore: p.amazonOpportunityScore,
            clicks: p._count.clicks,
          }))}
      />
      <nav aria-label="Imported product pages" className="amazon-actions">
        {page > 1 && <Link href={`?page=${page - 1}`}>Previous</Link>}
        {rows.length > 50 && <Link href={`?page=${page + 1}`}>Next</Link>}
      </nav>
    </>
  );
}
