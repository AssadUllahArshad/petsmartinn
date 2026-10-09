"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { RankedItem } from "@/lib/amazon/types";
import { sortOptions } from "@/lib/amazon/types";
import { amazonAction } from "./api";
type Category = { id: string; name: string; path: string };
type SearchResult = {
  batchId: string;
  results: RankedItem[];
  mock: boolean;
  expiresAt: string;
  fallbackQueries: string[];
  primaryKeyword: string;
};
export function amount(value: number | null, currency: string | null = "USD") {
  if (value === null) return "Not provided";
  if (!currency) return `${value} (currency not provided)`;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 4,
    }).format(value);
  } catch {
    return String(value);
  }
}
export function AmazonFinder({
  categories,
  mock,
  configured,
}: {
  categories: Category[];
  mock: boolean;
  configured: boolean;
}) {
  const [data, setData] = useState<SearchResult | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [preview, setPreview] = useState<RankedItem | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    setData(null);
    setPreview(null);
    setSelected([]);
    try {
      const result = await amazonAction<SearchResult>("search", {
        categoryId: form.get("categoryId"),
        keywords: form.get("keywords"),
        minPrice: form.get("minPrice"),
        maxPrice: form.get("maxPrice"),
        minRating: form.get("minRating"),
        minReviews: form.get("minReviews"),
        minOpportunity: form.get("minOpportunity"),
        maxResults: Number(form.get("maxResults")),
        sort: form.get("sort"),
        onlyExact: form.get("onlyExact") === "on",
        allowFallback: form.get("allowFallback") === "on",
      });
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }
  async function action(action: "import" | "exclude", asins: string[]) {
    if (!data || !asins.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (action === "import") {
        const result = await amazonAction<{
          imported: { asin: string; id: string }[];
          duplicates: string[];
        }>(action, { batchId: data.batchId, asins });
        setData({
          ...data,
          results: data.results.map((p) => {
            const match = result.imported.find((i) => i.asin === p.asin);
            return match
              ? { ...p, alreadyImported: true, importedProductId: match.id }
              : result.duplicates.includes(p.asin)
                ? { ...p, alreadyImported: true }
                : p;
          }),
        });
        setMessage(
          `${result.imported.length} imported as Draft. ${result.duplicates.length} duplicates skipped.`,
        );
      } else {
        await amazonAction(action, { batchId: data.batchId, asins });
        setData({
          ...data,
          results: data.results.filter((p) => !asins.includes(p.asin)),
        });
        setMessage(
          `${asins.length} excluded from this category's future searches.`,
        );
      }
      setSelected([]);
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }
  const chosen = categories.find(
    (c) => c.id === preview?.destinationCategoryId,
  );
  return (
    <div className="amazon-finder">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">Amazon · Product discovery</span>
          <h1>Amazon Product Finder</h1>
          <p>
            Compare products within your selected category. Import useful
            discoveries as drafts.
          </p>
        </div>
        <Link className="button secondary" href="/admin/amazon/imported">
          Imported products
        </Link>
      </div>
      {mock ? (
        <p className="notice">
          <strong>Mock mode — fictional fixtures.</strong> All prices, ratings,
          reviews, availability and commissions below are simulated for testing.
          No Amazon request is made; mock imports cannot be published.
        </p>
      ) : !configured ? (
        <p className="notice">
          Live Creators API credentials are missing or invalid.{" "}
          <Link href="/admin/settings/amazon">Check Amazon settings</Link> or
          explicitly enable server-side mock mode.
        </p>
      ) : (
        <p className="amazon-note">
          Live catalog data comes only from the official Creators API. Fields
          Amazon does not return stay “Not provided.” Commission rates come from
          an owner-verified import rule.
        </p>
      )}
      <form onSubmit={search} className="amazon-search-panel">
        <div className="amazon-filter-grid">
          <label>
            Target Petsmartinn Category
            <select
              name="categoryId"
              required
              defaultValue={
                categories.find((c) => c.path === "/dogs/harnesses")?.id ||
                categories[0]?.id
              }
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.path}
                </option>
              ))}
            </select>
          </label>
          <label>
            Search Keywords
            <input
              name="keywords"
              maxLength={300}
              placeholder="e.g. padded no-pull harness"
            />
          </label>
          <label>
            Minimum Price
            <input name="minPrice" type="number" min="0" step="0.01" />
          </label>
          <label>
            Maximum Price
            <input name="maxPrice" type="number" min="0" step="0.01" />
          </label>
          <label>
            Minimum Rating
            <input name="minRating" type="number" min="0" max="5" step="0.1" />
          </label>
          <label>
            Minimum Review Count
            <input name="minReviews" type="number" min="0" step="1" />
          </label>
          <label>
            Minimum Opportunity Score
            <input
              name="minOpportunity"
              type="number"
              min="0"
              max="100"
              step="1"
            />
          </label>
          <label>
            Maximum Results
            <input
              name="maxResults"
              type="number"
              min="1"
              max="100"
              defaultValue={20}
              required
            />
          </label>
          <label>
            Sort by
            <select name="sort" defaultValue="expected">
              {sortOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="amazon-checks">
          <label>
            <input type="checkbox" name="onlyExact" defaultChecked />
            Only Exact Category Matches
          </label>
          <label>
            <input type="checkbox" name="allowFallback" defaultChecked />
            Allow Related Category Fallback
          </label>
        </div>
        <p className="amazon-note">
          Exact matches always come first, for every sort. When exact matches
          are required, approved fallback categories are used only if no exact
          results pass your filters. Missing ratings or prices do not pass a
          filter requiring them.
        </p>
        <button className="button" disabled={busy || !categories.length}>
          {busy ? "Working…" : "Search Amazon"}
        </button>
      </form>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="amazon-message" role="status">
          {message}
        </p>
      )}
      <p className="amazon-note">
        <strong>Estimated Opportunity</strong> is a category-relative heuristic,
        not guaranteed earnings or an invented conversion rate. Missing signals
        earn no weighted contribution. Available authorized site performance
        replaces proxies when present.
      </p>
      {data && (
        <>
          <div className="amazon-result-toolbar">
            <span>
              {data.results.length} results ·{" "}
              {data.mock ? "Mock fixtures" : "Creators API"}
              {data.fallbackQueries.length
                ? ` · fallback searches: ${data.fallbackQueries.join(" → ")}`
                : ""}
            </span>
            <button
              className="button"
              disabled={busy || !selected.length}
              onClick={() => action("import", selected)}
            >
              Import selected ({selected.length})
            </button>
          </div>
          {!data.results.length && (
            <p className="empty-state">
              No eligible products. Try different keywords or review the
              category-specific import rule. Unrelated categories are never
              added automatically.
            </p>
          )}
          <div className="amazon-results">
            {data.results.map((p) => (
              <article className="amazon-result" key={p.asin}>
                <div className="amazon-result-image">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.title}
                      fill
                      sizes="(max-width:760px) 90vw, 300px"
                      unoptimized
                    />
                  ) : (
                    <span>Image not provided</span>
                  )}
                </div>
                <div className="amazon-result-body">
                  <div className="amazon-result-top">
                    <span className="eyebrow">
                      {p.brand || "Brand not provided"}
                    </span>
                    <span
                      className={
                        "amazon-match " + (p.categoryTier ? "related" : "exact")
                      }
                    >
                      {p.categoryTier ? "Related fallback" : "Exact match"}
                    </span>
                  </div>
                  <h2>{p.title}</h2>
                  <p className="amazon-identifiers">
                    ASIN {p.asin} · {p.marketplace}
                    {p.mock ? " · MOCK" : ""}
                  </p>
                  <dl className="amazon-facts">
                    <div>
                      <dt>Price{p.mock ? " · Mock data" : ""}</dt>
                      <dd>{amount(p.price, p.currency)}</dd>
                    </div>
                    <div>
                      <dt>Commission Rate</dt>
                      <dd>
                        {p.commissionRate === null
                          ? "Not provided"
                          : `${(p.commissionRate * 100).toFixed(2)}%`}
                        {p.commissionRate !== null && (
                          <small>
                            {p.mock
                              ? "Simulated commission rate"
                              : "Owner-verified rule rate"}
                          </small>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        Estimated Commission Per Sale
                        {p.mock ? " · Mock data" : ""}
                      </dt>
                      <dd>
                        {amount(p.estimatedCommissionPerSale, p.currency)}
                      </dd>
                    </div>
                    <div>
                      <dt>Rating{p.mock ? " · Mock data" : ""}</dt>
                      <dd>
                        {p.rating === null
                          ? "Not provided"
                          : `${p.rating.toFixed(1)} / 5`}
                      </dd>
                    </div>
                    <div>
                      <dt>Review Count{p.mock ? " · Mock data" : ""}</dt>
                      <dd>
                        {p.reviewCount === null
                          ? "Not provided"
                          : p.reviewCount.toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt>Availability{p.mock ? " · Mock data" : ""}</dt>
                      <dd>{p.availability || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>Category Relevance</dt>
                      <dd>
                        {p.categoryMatch}
                        <small>{p.categoryBasis}</small>
                      </dd>
                    </div>
                    <div>
                      <dt>Keyword Match</dt>
                      <dd>{p.keywordMatch.toFixed(0)} / 100</dd>
                    </div>
                  </dl>
                  <div className="amazon-opportunity">
                    <div>
                      <strong>{p.opportunityScore.toFixed(1)} / 100</strong>
                      <span>Estimated Opportunity</span>
                    </div>
                    <span>{p.signalCoverage}% weighted signal coverage</span>
                  </div>
                  <details className="amazon-score">
                    <summary>Score breakdown</summary>
                    <table>
                      <thead>
                        <tr>
                          <th>Factor</th>
                          <th>Weight</th>
                          <th>Score / 100</th>
                          <th>Contribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.breakdown.map((part) => (
                          <tr key={part.label}>
                            <td>
                              {part.label}
                              <small>{part.basis}</small>
                            </td>
                            <td>{part.weight}%</td>
                            <td>
                              {part.score === null
                                ? "Not provided"
                                : part.score.toFixed(1)}
                            </td>
                            <td>{part.contribution.toFixed(1)}</td>
                          </tr>
                        ))}
                        <tr>
                          <th>Final Expected Earnings Score</th>
                          <td>100%</td>
                          <td colSpan={2}>
                            {p.opportunityScore.toFixed(1)} — Estimated
                            Opportunity
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="amazon-note">
                      Commission-weighted potential:{" "}
                      {p.commissionWeightedPotential === null
                        ? "Not provided"
                        : p.commissionWeightedPotential.toFixed(4)}
                      . This is commission per sale × potential index, not a
                      money forecast. Proxy scores are not conversion
                      probabilities.
                    </p>
                    {p.performance && (
                      <dl className="amazon-facts">
                        <div>
                          <dt>Affiliate clicks (tracked site clicks)</dt>
                          <dd>
                            {p.performance.affiliateClicks ?? "Not provided"}
                          </dd>
                        </div>
                        <div>
                          <dt>Outbound CTR</dt>
                          <dd>
                            {p.performance.outboundCtr === null
                              ? "Not available — no impression denominator"
                              : `${p.performance.outboundCtr * 100}%`}
                          </dd>
                        </div>
                        <div>
                          <dt>Observed Conversion Rate</dt>
                          <dd>
                            {p.performance.observedConversionRate === null
                              ? "Not provided"
                              : `${p.performance.observedConversionRate * 100}%`}
                          </dd>
                        </div>
                        <div>
                          <dt>Observed Earnings</dt>
                          <dd>
                            {amount(p.performance.observedEarnings, p.currency)}
                          </dd>
                        </div>
                        <div>
                          <dt>Earnings Per Click</dt>
                          <dd>
                            {amount(p.performance.earningsPerClick, p.currency)}
                          </dd>
                        </div>
                        <div>
                          <dt>Reporting Source</dt>
                          <dd>{p.performance.source || "Not provided"}</dd>
                        </div>
                      </dl>
                    )}
                  </details>
                  <div className="amazon-actions">
                    {p.alreadyImported ? (
                      <span className="amazon-imported">
                        Already Imported{" "}
                        {p.importedProductId && (
                          <Link href={`/admin/products/${p.importedProductId}`}>
                            Edit draft ↗
                          </Link>
                        )}
                      </span>
                    ) : (
                      <label className="amazon-select">
                        <input
                          type="checkbox"
                          aria-label={`Select ${p.title}`}
                          checked={selected.includes(p.asin)}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, p.asin]
                                : selected.filter((a) => a !== p.asin),
                            )
                          }
                        />
                        Select
                      </label>
                    )}
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => setPreview(p)}
                    >
                      Preview
                    </button>
                    <button
                      className="button"
                      disabled={busy || p.alreadyImported}
                      onClick={() => action("import", [p.asin])}
                    >
                      Import
                    </button>
                    <button
                      className="text-link"
                      disabled={busy}
                      onClick={() => action("exclude", [p.asin])}
                    >
                      Exclude
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {preview && (
        <PreviewDialog close={() => setPreview(null)}>
          <h2 id="amazon-preview-heading">Import preview</h2>
          <dl>
            <dt>Amazon product</dt>
            <dd>
              {preview.title} · {preview.asin}
            </dd>
            <dt>Suggested Petsmartinn title</dt>
            <dd>{preview.title}</dd>
            <dt>Destination category</dt>
            <dd>
              {chosen?.name || "Category unavailable"} · {chosen?.path}
            </dd>
            <dt>Suggested primary keyword</dt>
            <dd>{data?.primaryKeyword || chosen?.name}</dd>
            <dt>Commission data</dt>
            <dd>
              {amount(preview.estimatedCommissionPerSale, preview.currency)} /
              sale · {preview.commissionSource || "Rate not provided"}
            </dd>
            <dt>Opportunity score</dt>
            <dd>
              {preview.opportunityScore.toFixed(1)} / 100 — Estimated
              Opportunity
            </dd>
            <dt>Import status</dt>
            <dd>
              Draft
              {preview.mock
                ? " · Mock fixture; cannot publish"
                : " · Editorial review required"}
            </dd>
          </dl>
          <p className="amazon-note">
            SEO titles, summaries, pros, cons, and descriptions stay yours to
            edit. The import does not invent them.
          </p>
          <div className="amazon-actions">
            <button
              className="button"
              disabled={busy || preview.alreadyImported}
              onClick={() => action("import", [preview.asin])}
            >
              Import as Draft
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              Close preview
            </button>
          </div>
        </PreviewDialog>
      )}
    </div>
  );
}

function PreviewDialog({
  children,
  close,
}: {
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={close}
      aria-labelledby="amazon-preview-heading"
      className="amazon-preview"
    >
      {children}
    </dialog>
  );
}
