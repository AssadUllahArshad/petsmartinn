import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getRule } from "@/services/amazon/store";
import { amazonConfig } from "@/services/amazon/config";
import { AmazonRules } from "@/components/admin/amazon/rules";
export default async function Page() {
  const admin = await requireAdmin();
  if (admin.role !== "OWNER") redirect("/admin");
  const categories = await db.category.findMany({
    select: { id: true, name: true, path: true },
    orderBy: { name: "asc" },
  });
  const rules = await Promise.all(categories.map((c) => getRule(c.id)));
  const exclusions = await db.amazonExclusion.findMany({
    where: { marketplace: amazonConfig().marketplace },
    select: { id: true, asin: true, categoryId: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <AmazonRules
      categories={categories}
      rules={rules}
      exclusions={exclusions}
    />
  );
}
