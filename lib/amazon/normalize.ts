import type { AmazonItem } from "./types";
export const amazonImageHosts = [
  "m.media-amazon.com",
  "images-na.ssl-images-amazon.com",
  "images-eu.ssl-images-amazon.com",
  "images-fe.ssl-images-amazon.com",
];
export function amazonImage(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      amazonImageHosts.includes(u.hostname)
      ? url
      : null;
  } catch {
    return null;
  }
}
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const text = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.slice(0, 4096) : null;
function numeric(v: unknown, max: number) {
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string" && /^\d+(\.\d+)?$/.test(v)
        ? Number(v)
        : NaN;
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
}
export function normalizeItem(
  raw: unknown,
  marketplace: string,
): AmazonItem | null {
  const item = object(raw),
    info = object(item.itemInfo),
    title = text(object(info.title).displayValue),
    asin = text(item.asin);
  const affiliateUrl = text(item.detailPageURL);
  if (!asin || !/^[A-Z0-9]{10}$/.test(asin) || !title || !affiliateUrl)
    return null;
  try {
    const u = new URL(affiliateUrl);
    if (
      u.protocol !== "https:" ||
      u.hostname !== marketplace ||
      u.username ||
      u.password
    )
      return null;
  } catch {
    return null;
  }
  const listings = object(item.offersV2).listings;
  const offers = Array.isArray(listings) ? listings.map(object) : [];
  const offer =
    offers.find((o) => o.isBuyBoxWinner === true) || offers[0] || {};
  const money = object(object(offer.price).money),
    imageData = object(item.images),
    primary = object(imageData.primary);
  const image =
    amazonImage(object(primary.large).url) ||
    amazonImage(object(primary.medium).url) ||
    amazonImage(object(primary.small).url);
  const variants = Array.isArray(imageData.variants) ? imageData.variants : [];
  const currency = text(money.currency)?.match(/^[A-Z]{3}$/)?.[0] || null;
  const images = [
    ...new Set(
      [
        image,
        ...variants.map(
          (v) =>
            amazonImage(object(object(v).large).url) ||
            amazonImage(object(object(v).medium).url),
        ),
      ].filter((v): v is string => !!v),
    ),
  ].slice(0, 12);
  const browseNodes = object(item.browseNodeInfo).browseNodes;
  const nodes: AmazonItem["nodes"] = [];
  if (Array.isArray(browseNodes))
    for (const rawNode of browseNodes) {
      let node = object(rawNode);
      for (let depth = 0; depth < 12 && node.id; depth++) {
        const id = text(node.id),
          name = text(node.contextFreeName) || text(node.displayName),
          rank = numeric(node.salesRank, 2147483647);
        if (id && name)
          nodes.push({
            id,
            name,
            salesRank:
              rank !== null && Number.isInteger(rank) && rank > 0 ? rank : null,
          });
        node = object(node.ancestor);
      }
    }
  const reviews = object(item.customerReviews),
    stars = object(reviews.starRating);
  const reviewCount = numeric(reviews.count, 2147483647);
  const features = object(info.features).displayValues;
  return {
    asin,
    title: title.slice(0, 240),
    brand: text(object(object(info.byLineInfo).brand).displayValue),
    image,
    images,
    productUrl: `https://${marketplace}/dp/${asin}`,
    affiliateUrl,
    marketplace,
    price:
      offer.violatesMAP === true || currency === null
        ? null
        : numeric(money.amount, 99999999),
    currency,
    availability: text(object(offer.availability).type),
    rating: numeric(stars.value ?? stars.displayValue, 5),
    reviewCount:
      reviewCount !== null && Number.isInteger(reviewCount)
        ? reviewCount
        : null,
    nodes,
    features: Array.isArray(features)
      ? features.filter((v): v is string => typeof v === "string").slice(0, 20)
      : [],
    mock: false,
    commissionRate: null,
    commissionSource: null,
  };
}
export function normalizeResponse(
  raw: unknown,
  marketplace: string,
  operation: "search" | "get",
) {
  const data = object(raw),
    result = object(
      operation === "search" ? data.searchResult : data.itemsResult,
    );
  const errors = Array.isArray(data.errors) ? data.errors : [];
  // Never silently treat a rejected request as a successful empty search.
  if (errors.length && !Array.isArray(result.items))
    throw new Error("Amazon returned an API error");
  return {
    items: (Array.isArray(result.items) ? result.items : [])
      .map((v) => normalizeItem(v, marketplace))
      .filter((v): v is AmazonItem => !!v),
    partialErrors: errors.length,
    total: numeric(result.totalResultCount, Number.MAX_SAFE_INTEGER),
  };
}
