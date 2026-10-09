import { db } from "@/lib/db";
export async function ClickAnalytics({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const start =
      from && /^\d{4}-\d{2}-\d{2}$/.test(from)
        ? new Date(from)
        : new Date(new Date().getTime() - 30 * 86400000),
    end =
      to && /^\d{4}-\d{2}-\d{2}$/.test(to)
        ? new Date(new Date(to).getTime() + 86400000)
        : new Date();
  const where = { createdAt: { gte: start, lt: end } };
  const [count, recent, top, brands] = await Promise.all([
    db.affiliateClick.count({ where }),
    db.affiliateClick.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.affiliateClick.groupBy({
      by: ["productTitle"],
      where,
      _count: true,
      orderBy: { _count: { productTitle: "desc" } },
      take: 10,
    }),
    db.affiliateClick.groupBy({
      by: ["brandName"],
      where,
      _count: true,
      orderBy: { _count: { brandName: "desc" } },
      take: 10,
    }),
  ]);
  const catCounts: Record<string, number> = {};
  for (const r of recent)
    for (const c of r.categoryNames) catCounts[c] = (catCounts[c] || 0) + 1;
  return (
    <>
      <form className="list-filters">
        <label>
          From
          <input
            name="from"
            type="date"
            defaultValue={start.toISOString().slice(0, 10)}
          />
        </label>
        <label>
          To
          <input name="to" type="date" defaultValue={to} />
        </label>
        <button className="button">Apply date range</button>
      </form>
      <div className="stats-grid">
        <article>
          <span>Clicks in selected range</span>
          <strong>{count}</strong>
        </article>
      </div>
      <div className="admin-panels">
        <section className="admin-panel">
          <h2>Most clicked products</h2>
          {top.map((r) => (
            <div className="data-row" key={r.productTitle}>
              <span>{r.productTitle}</span>
              <strong>{r._count}</strong>
            </div>
          ))}
        </section>
        <section className="admin-panel">
          <h2>Most clicked brands</h2>
          {brands.map((r) => (
            <div className="data-row" key={r.brandName}>
              <span>{r.brandName || "Unassigned"}</span>
              <strong>{r._count}</strong>
            </div>
          ))}
        </section>
        <section className="admin-panel">
          <h2>Categories · latest 100 clicks</h2>
          {Object.entries(catCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => (
              <div className="data-row" key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
        </section>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Time (UTC)</th>
              <th>Source</th>
              <th>Referrer host</th>
              <th>Device</th>
              <th>Campaign</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id}>
                <td>{r.productTitle}</td>
                <td>{r.createdAt.toISOString()}</td>
                <td>{r.sourcePage || "—"}</td>
                <td>{r.referrer || "—"}</td>
                <td>{r.device}</td>
                <td>{r.campaign || r.utmCampaign || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
