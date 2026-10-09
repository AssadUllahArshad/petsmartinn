import Link from "next/link";
import { FilterPanel } from "./filter-panel";
import { products, brands } from "@/lib/catalog";
import { ProductCard } from "./product-card";
import { SlidersHorizontal } from "@/components/ui/icon";
import { Schema } from "@/components/content/schema";
import { Breadcrumbs } from "@/components/content/breadcrumbs";
import { baseUrl } from "@/lib/seo";
import { queryFrom, type Params } from "@/lib/catalog-query";
export { queryFrom };
export type { Params };
export async function CatalogPage({
  title,
  intro,
  path,
  params,
  category,
  brand,
  children,
}: {
  title: string;
  intro: string;
  path: string;
  params: Params;
  category?: string;
  brand?: string;
  children?: React.ReactNode;
}) {
  const query = {
    ...queryFrom(params),
    category,
    brand: brand || queryFrom(params).brand,
  };
  const [result, bs] = await Promise.all([products(query), brands()]);
  function pageLink(page: number) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params))
      if (typeof v === "string") sp.set(k, v);
    sp.set("page", String(page));
    return path + "?" + sp;
  }
  return (
    <div className="container catalog-page">
      <Breadcrumbs items={[{ name: title, path }]} />
      <div className="catalog-heading">
        <span className="eyebrow">Thoughtful essentials</span>
        <h1>{title}</h1>
        <p>{intro}</p>
      </div>
      {children}
      <div className="catalog-layout">
        <aside className="filters">
          <FilterPanel>
            <summary>
              <SlidersHorizontal size={18} />
              Refine your search
            </summary>
            <form action={path}>
              {query.q && <input type="hidden" name="q" value={query.q} />}
              <label>
                Brand
                <select name="brand" defaultValue={query.brand || ""}>
                  <option value="">All brands</option>
                  {bs.map((b) => (
                    <option value={b.slug} key={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Minimum price
                <input
                  type="number"
                  name="min"
                  min="0"
                  step="0.01"
                  defaultValue={query.min}
                />
              </label>
              <label>
                Maximum price
                <input
                  type="number"
                  name="max"
                  min="0"
                  step="0.01"
                  defaultValue={query.max}
                />
              </label>
              {result.rows.some((p) => p.rating !== null) && (
                <label>
                  Minimum rating
                  <select name="rating" defaultValue={query.rating || ""}>
                    <option value="">Any rating</option>
                    <option value="4">4 and above</option>
                    <option value="3">3 and above</option>
                  </select>
                </label>
              )}
              <label>
                Sort by
                <select name="sort" defaultValue={query.sort || "featured"}>
                  <option value="featured">Featured</option>
                  <option value="popular">Most clicked</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="rating">Rating</option>
                  <option value="newest">Newest</option>
                </select>
              </label>
              <button className="button">Apply filters</button>
              <Link className="text-link" href={path}>
                Clear filters
              </Link>
            </form>
          </FilterPanel>
        </aside>
        <div>
          <div className="result-count">
            {result.total} {result.total === 1 ? "product" : "products"} · Page{" "}
            {result.page}
          </div>
          <div className="product-grid catalog-grid">
            {result.rows.map((p) => (
              <ProductCard key={p.id} product={p} source={path} />
            ))}
          </div>
          {!result.rows.length && (
            <div className="empty-state">
              <h2>No products found</h2>
              <p>Try a different search or clear your filters.</p>
            </div>
          )}
          <nav className="pagination" aria-label="Pagination">
            {result.page > 1 && (
              <Link href={pageLink(result.page - 1)}>← Previous</Link>
            )}
            {result.page * 12 < result.total && (
              <Link href={pageLink(result.page + 1)}>Next →</Link>
            )}
          </nav>
          <Schema
            value={{
              "@context": "https://schema.org",
              "@type": "ItemList",
              itemListElement: result.rows
                .filter((p) => !p.isDemo)
                .map((p, i) => ({
                  "@type": "ListItem",
                  position: (result.page - 1) * 12 + i + 1,
                  url: baseUrl() + "/product/" + p.slug,
                  name: p.title,
                })),
            }}
          />
        </div>
      </div>
    </div>
  );
}
