import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const q = await searchParams;
  const page = /^[1-9]\d{0,4}$/.test(q.page || "") ? Number(q.page) : 1;
  const kinds = [
    "search",
    "import",
    "duplicate",
    "sync",
    "api_error",
    "rate_limit",
    "exclude",
    "rules",
  ];
  const kind = kinds.includes(q.kind || "") ? q.kind : undefined;
  const rows = await db.amazonLog.findMany({
    where: kind ? { kind } : {},
    orderBy: { createdAt: "desc" },
    take: 51,
    skip: (page - 1) * 50,
  });
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">Amazon · Activity</span>
          <h1>Amazon logs</h1>
          <p>
            Searches, imports, duplicates, syncs, API errors and rate limits.
            Credentials and raw API payloads are never logged.
          </p>
        </div>
      </div>
      <form className="amazon-actions">
        <label>
          Event type
          <select name="kind" defaultValue={kind || ""}>
            <option value="">All events</option>
            {kinds.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <button className="button">Filter logs</button>
      </form>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Time (UTC)</th>
              <th>Event</th>
              <th>Status</th>
              <th>Message</th>
              <th>ASIN</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((r) => (
              <tr key={r.id}>
                <td>{r.createdAt.toISOString()}</td>
                <td>{r.kind}</td>
                <td>{r.status}</td>
                <td>{r.message}</td>
                <td>{r.asin || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p>No Amazon events yet.</p>}
      <nav aria-label="Log pages" className="amazon-actions">
        {page > 1 && (
          <Link href={`?page=${page - 1}&kind=${kind || ""}`}>Previous</Link>
        )}
        {rows.length > 50 && (
          <Link href={`?page=${page + 1}&kind=${kind || ""}`}>Next</Link>
        )}
      </nav>
    </>
  );
}
