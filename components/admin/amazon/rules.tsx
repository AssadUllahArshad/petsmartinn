"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { amazonAction } from "./api";
import type { ImportRule, Fallback } from "@/lib/amazon/types";
export function AmazonRules({
  rules,
  categories,
  exclusions,
}: {
  rules: ImportRule[];
  categories: { id: string; name: string; path: string }[];
  exclusions: { id: string; asin: string; categoryId: string }[];
}) {
  const [categoryId, setCategoryId] = useState(
      rules.find((r) => r.categoryPath === "/dogs/harnesses")?.categoryId ||
        rules[0]?.categoryId ||
        "",
    ),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [hidden, setHidden] = useState<string[]>([]);
  const router = useRouter();
  const rule = rules.find((r) => r.categoryId === categoryId);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const fallbacks: Fallback[] = String(f.get("fallbacks") || "")
        .split("\n")
        .filter((s) => s.trim())
        .map((line) => {
          const [label, terms, node, destination] = line
            .split("|")
            .map((s) => s.trim());
          return {
            label,
            terms: (terms || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            browseNodeId: node || null,
            destinationCategoryId: destination || null,
          };
        });
      const date = (key: string) =>
        f.get(key) ? new Date(String(f.get(key))).toISOString() : null;
      await amazonAction("rules", {
        categoryId,
        searchIndex: f.get("searchIndex"),
        browseNodeId: f.get("browseNodeId") || null,
        exactTerms: String(f.get("exactTerms"))
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        excludedTerms: String(f.get("excludedTerms") || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        fallbacks,
        commissionRate: f.get("commissionRate")
          ? Number(f.get("commissionRate")) / 100
          : null,
        commissionSource: f.get("commissionSource") || null,
        commissionVerifiedAt: date("commissionVerifiedAt"),
        commissionValidUntil: date("commissionValidUntil"),
        syncFields: f.getAll("syncFields"),
      });
      setMessage("Import rule saved. Future searches use this rule.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save rule");
    } finally {
      setBusy(false);
    }
  }
  async function restore(id: string) {
    try {
      await amazonAction("unexclude", { id });
      setHidden([...hidden, id]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not restore exclusion");
    }
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">Amazon · Category rules</span>
          <h1>Amazon import rules</h1>
          <p>
            Map your category to Amazon browse nodes and keep fallback searches
            relevant.
          </p>
        </div>
      </div>
      <label>
        Target category
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setMessage("");
          }}
        >
          {rules.map((r) => (
            <option key={r.categoryId} value={r.categoryId}>
              {r.categoryName} · {r.categoryPath}
            </option>
          ))}
        </select>
      </label>
      {message && (
        <p className="amazon-message" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {rule && (
        <form key={categoryId} onSubmit={save} className="amazon-search-panel">
          <div className="amazon-filter-grid">
            <label>
              Amazon search index
              <input
                name="searchIndex"
                required
                defaultValue={rule.searchIndex}
              />
            </label>
            <label>
              Amazon browse node ID (optional)
              <input
                name="browseNodeId"
                pattern="[1-9][0-9]*"
                defaultValue={rule.browseNodeId || ""}
              />
            </label>
            <label>
              Exact category terms (comma-separated)
              <input
                name="exactTerms"
                required
                defaultValue={rule.exactTerms.join(", ")}
              />
            </label>
            <label>
              Excluded terms (comma-separated)
              <input
                name="excludedTerms"
                defaultValue={rule.excludedTerms.join(", ")}
              />
            </label>
          </div>
          <p className="amazon-note">
            A mapped browse node is strongest evidence. Term matches are
            estimates and still require a compatible dog/cat context. Check the
            preview before importing.
          </p>
          <label>
            Approved related-category fallback order
            <textarea
              name="fallbacks"
              rows={5}
              defaultValue={rule.fallbacks
                .map((f) =>
                  [
                    f.label,
                    f.terms.join(", "),
                    f.browseNodeId || "",
                    f.destinationCategoryId || "",
                  ].join(" | "),
                )
                .join("\n")}
            />
            <small>
              One per line: label | comma-separated terms | optional Amazon
              browse node ID | optional destination category ID. Maximum four
              steps, in order. Unlisted categories are never searched as
              fallback.
            </small>
          </label>
          <details className="amazon-score">
            <summary>Destination category IDs</summary>
            {categories.map((c) => (
              <p key={c.id}>
                {c.name} · {c.path} · <code>{c.id}</code>
              </p>
            ))}
          </details>
          <h2>Commission evidence</h2>
          <p className="amazon-note">
            Creators API does not supply a commission-rate resource. Enter a
            rate only after verifying your account, marketplace, and product
            classification against an authorized source. Rates are never
            inferred from price, popularity, or a category name.
          </p>
          <div className="amazon-filter-grid">
            <label>
              Verified commission rate (%)
              <input
                name="commissionRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue={
                  rule.commissionRate === null ? "" : rule.commissionRate * 100
                }
              />
            </label>
            <label>
              Commission source URL
              <input
                name="commissionSource"
                type="url"
                defaultValue={rule.commissionSource || ""}
              />
            </label>
            <label>
              Verification date
              <input
                name="commissionVerifiedAt"
                type="date"
                defaultValue={rule.commissionVerifiedAt?.slice(0, 10) || ""}
              />
            </label>
            <label>
              Rate valid until
              <input
                name="commissionValidUntil"
                type="date"
                defaultValue={rule.commissionValidUntil?.slice(0, 10) || ""}
              />
            </label>
          </div>
          <h2>Amazon-managed sync fields</h2>
          <div className="amazon-checks">
            {["price", "availability", "images", "brand"].map((field) => (
              <label key={field}>
                <input
                  type="checkbox"
                  name="syncFields"
                  value={field}
                  defaultChecked={rule.syncFields.includes(field)}
                />
                {field}
              </label>
            ))}
          </div>
          <p className="amazon-note">
            Sync never writes SEO titles, meta descriptions, editorial
            summaries, pros, cons, best-for, not-ideal-for, or custom
            descriptions. If you manually edit a product title, Amazon title
            refresh stops for that product.
          </p>
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : "Save import rule"}
          </button>
        </form>
      )}
      <h2>Excluded products</h2>
      {exclusions
        .filter((e) => !hidden.includes(e.id))
        .map((e) => (
          <div className="amazon-result-toolbar" key={e.id}>
            <span>
              {e.asin} ·{" "}
              {categories.find((c) => c.id === e.categoryId)?.name ||
                e.categoryId}
            </span>
            <button className="button secondary" onClick={() => restore(e.id)}>
              Restore result
            </button>
          </div>
        ))}
      {!exclusions.length && <p>No excluded products.</p>}
    </>
  );
}
