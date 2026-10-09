import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { publicAmazonConfig } from "@/services/amazon/config";
import { AmazonFinder } from "@/components/admin/amazon/finder";
export default async function Page() {
  await requireAdmin();
  const categories = await db.category.findMany({
    select: { id: true, name: true, path: true },
    orderBy: { name: "asc" },
  });
  const config = publicAmazonConfig();
  return (
    <AmazonFinder
      categories={categories}
      mock={config.mock}
      configured={config.configured}
    />
  );
}
