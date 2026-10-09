import { db } from "@/lib/db";
import Link from "next/link";
export default async function Dashboard() {
  const now = new Date(),
    today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const week = new Date(now.getTime() - 7 * 86400000),
    month = new Date(now.getTime() - 30 * 86400000);
  const [
    total,
    published,
    draft,
    cats,
    brands,
    guides,
    breeds,
    health,
    clickToday,
    clickWeek,
    clickMonth,
    recentContent,
    recentProducts,
    top,
  ] = await Promise.all([
    db.product.count(),
    db.product.count({ where: { status: "PUBLISHED" } }),
    db.product.count({ where: { status: "DRAFT" } }),
    db.category.count(),
    db.brand.count(),
    db.content.count({ where: { type: "BUYING_GUIDE" } }),
    db.content.count({ where: { type: { in: ["DOG_BREED", "CAT_BREED"] } } }),
    db.content.count({ where: { type: "HEALTH" } }),
    db.affiliateClick.count({ where: { createdAt: { gte: today } } }),
    db.affiliateClick.count({ where: { createdAt: { gte: week } } }),
    db.affiliateClick.count({ where: { createdAt: { gte: month } } }),
    db.content.findMany({ take: 5, orderBy: { updatedAt: "desc" } }),
    db.product.findMany({ take: 5, orderBy: { updatedAt: "desc" } }),
    db.affiliateClick.groupBy({
      by: ["productTitle"],
      _count: true,
      orderBy: { _count: { productTitle: "desc" } },
      take: 5,
    }),
  ]);
  const stats = [
    ["Products", total],
    ["Published", published],
    ["Drafts", draft],
    ["Categories", cats],
    ["Brands", brands],
    ["Buying guides", guides],
    ["Breed guides", breeds],
    ["Health articles", health],
    ["Clicks today", clickToday],
    ["Clicks · 7 days", clickWeek],
    ["Clicks · 30 days", clickMonth],
  ];
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">Your website at a glance</span>
          <h1>Studio overview</h1>
          <p>Make room for your next great product or story.</p>
        </div>
        <Link className="button" href="/admin/products/new">
          + Add product
        </Link>
      </div>
      <div className="stats-grid">
        {stats.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="admin-panels">
        <section className="admin-panel">
          <h2>Most clicked products</h2>
          {top.map((p) => (
            <div className="data-row" key={p.productTitle}>
              <span>{p.productTitle}</span>
              <strong>{p._count}</strong>
            </div>
          ))}
          {!top.length && (
            <p className="muted">
              Affiliate clicks will appear here as visitors explore merchant
              links.
            </p>
          )}
        </section>
        <section className="admin-panel">
          <h2>Recent products</h2>
          {recentProducts.map((p) => (
            <Link
              className="data-row"
              href={"/admin/products/" + p.id}
              key={p.id}
            >
              <span>{p.title}</span>
              <span className="status">{p.status}</span>
            </Link>
          ))}
        </section>
        <section className="admin-panel">
          <h2>Recent content</h2>
          {recentContent.map((p) => (
            <div className="data-row" key={p.id}>
              <span>{p.title}</span>
              <span className="status">{p.status}</span>
            </div>
          ))}
        </section>
        <section className="admin-panel">
          <h2>Editorial essentials</h2>
          <p>
            Publish useful original content. Verify product claims and affiliate
            destinations. Health content must complete veterinary review.
          </p>
          <Link href="/admin/buying-guides/new" className="text-link">
            Create a buying guide ↗
          </Link>
        </section>
      </div>
    </>
  );
}
