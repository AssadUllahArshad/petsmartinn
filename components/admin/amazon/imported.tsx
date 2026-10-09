"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { amazonAction } from "./api";
export type ImportedRow = {
  id: string;
  title: string;
  amazonAsin: string | null;
  amazonMarketplace: string | null;
  source: string;
  status: string;
  amazonSyncStatus: string | null;
  amazonLastSyncAt: string | null;
  amazonOpportunityScore: number | null;
  clicks: number;
};
export function ImportedAmazon({ rows }: { rows: ImportedRow[] }) {
  const [busy, setBusy] = useState<string | null>(null),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const router = useRouter();
  async function sync(id: string) {
    setBusy(id);
    setError("");
    setMessage("");
    try {
      const r = await amazonAction<{ synced: number }>("sync", { ids: [id] });
      setMessage(`${r.synced} product synced. Editorial fields preserved.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">Amazon · Catalog</span>
          <h1>Imported Amazon products</h1>
          <p>
            Imports start as drafts and use your existing product editor and
            affiliate tracking.
          </p>
        </div>
        <Link href="/admin/amazon/product-finder" className="button">
          Find products
        </Link>
      </div>
      {message && (
        <p role="status" className="amazon-message">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>ASIN / Marketplace</th>
              <th>Status</th>
              <th>Sync</th>
              <th>Opportunity</th>
              <th>Tracked clicks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/products/${p.id}`}>{p.title}</Link>
                  {p.source === "AMAZON_MOCK" && <small>Mock fixture</small>}
                </td>
                <td>
                  {p.amazonAsin}
                  <small>{p.amazonMarketplace}</small>
                </td>
                <td>{p.status}</td>
                <td>
                  {p.amazonSyncStatus || "Not synced"}
                  <small>
                    {p.amazonLastSyncAt
                      ? new Date(p.amazonLastSyncAt).toLocaleString()
                      : ""}
                  </small>
                </td>
                <td>
                  {p.amazonOpportunityScore === null
                    ? "Not provided"
                    : p.amazonOpportunityScore.toFixed(1)}
                </td>
                <td>{p.clicks}</td>
                <td>
                  <Link href={`/admin/products/${p.id}`} className="text-link">
                    Edit product
                  </Link>
                  <button
                    className="button secondary"
                    disabled={!!busy}
                    onClick={() => sync(p.id)}
                  >
                    {busy === p.id ? "Syncing…" : "Sync managed fields"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <p className="empty-state">
          No Amazon imports yet. Search a category in the Product Finder to
          begin.
        </p>
      )}
    </>
  );
}
