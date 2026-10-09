import type { CatalogQuery } from "./catalog";
export type Params = Record<string, string | string[] | undefined>;

// Validate URL values before the server component passes them to Prisma.
// Reject duplicate values and non-decimal coercions such as hexadecimal input.
function optionalNumber(value: string | string[] | undefined) {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text || !/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text))
    return undefined;
  const number = Number(text);
  return Number.isFinite(number) &&
    number >= 0 &&
    number <= Number.MAX_SAFE_INTEGER
    ? number
    : undefined;
}
const sorts = new Set([
  "featured",
  "popular",
  "price-asc",
  "price-desc",
  "rating",
  "newest",
]);
// Prisma's pagination skip is a signed 32-bit integer; the catalog uses 12 rows.
const maxPage = Math.floor(2_147_483_647 / 12) + 1;
export function queryFrom(p: Params): CatalogQuery {
  const rating = optionalNumber(p.rating);
  const page = optionalNumber(p.page);
  return {
    q: typeof p.q === "string" ? p.q : undefined,
    brand: typeof p.brand === "string" ? p.brand : undefined,
    min: optionalNumber(p.min),
    max: optionalNumber(p.max),
    rating: rating !== undefined && rating <= 5 ? rating : undefined,
    sort: typeof p.sort === "string" && sorts.has(p.sort) ? p.sort : undefined,
    page:
      page !== undefined && page <= maxPage ? Math.max(1, Math.floor(page)) : 1,
  };
}
