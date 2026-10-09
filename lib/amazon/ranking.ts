import type {
  AmazonItem,
  ImportRule,
  RankedItem,
  SitePerformance,
  FinderSort,
} from "./types";
import { mockCategoryPath } from "./mock-categories";
import type { FinderQuery } from "./validation";
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const matches = (s: string, term: string) =>
  (" " + words(s) + " ").includes(" " + words(term) + " ");
export function categoryMatch(item: AmazonItem, rule: ImportRule) {
  const content = item.title + " " + item.nodes.map((n) => n.name).join(" ");
  if (rule.excludedTerms.some((t) => matches(content, t))) return null;
  const species = rule.categoryPath.startsWith("/dogs")
    ? "dog"
    : rule.categoryPath.startsWith("/cats")
      ? "cat"
      : null;
  if (species && !matches(content, species) && !matches(content, species + "s"))
    return null;
  // Mock taxonomy is fixed independently of rule terms and Amazon browse IDs.
  // A broad title term must not turn a related fictional product into an exact one.
  if (item.mock) {
    const path = mockCategoryPath(rule);
    if (path && item.mockCategoryPaths?.includes(path))
      return {
        tier: 0,
        label: "Exact category",
        basis: "Simulated fixture taxonomy; not verified Amazon classification",
        destination: rule.categoryId,
      };
  }
  if (
    !item.mock &&
    rule.browseNodeId &&
    item.nodes.some((n) => n.id === rule.browseNodeId)
  )
    return {
      tier: 0,
      label: "Exact category",
      basis: "Mapped Amazon browse node",
      destination: rule.categoryId,
    };
  if (!item.mock && rule.exactTerms.some((t) => matches(content, t)))
    return {
      tier: 0,
      label: "Exact category",
      basis: "Title / browse-node term match (estimated relevance)",
      destination: rule.categoryId,
    };
  for (let i = 0; i < rule.fallbacks.length; i++) {
    const f = rule.fallbacks[i];
    if (
      (f.browseNodeId && item.nodes.some((n) => n.id === f.browseNodeId)) ||
      f.terms.some((t) => matches(content, t))
    )
      return {
        tier: i + 1,
        label: f.label,
        basis: "Approved related-category fallback",
        destination: f.destinationCategoryId || rule.categoryId,
      };
  }
  return null;
}
export function validPerformance(p: SitePerformance | null, now = Date.now()) {
  if (!p?.source || !p.measuredAt || !p.windowStart || !p.windowEnd)
    return false;
  const measured = Date.parse(p.measuredAt),
    start = Date.parse(p.windowStart),
    end = Date.parse(p.windowEnd);
  return (
    Number.isFinite(measured) &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start < end &&
    end <= measured &&
    measured <= now &&
    now - measured <= 30 * 86400000
  );
}
const clamp = (v: number) => Math.max(0, Math.min(1, v));
function mean(values: (number | null)[]) {
  const ns = values.filter((v): v is number => v !== null);
  return ns.length
    ? Math.pow(
        ns.reduce((a, b) => a * b, 1),
        1 / ns.length,
      )
    : null;
}
export function rankItems(
  items: AmazonItem[],
  rule: ImportRule,
  query: FinderQuery,
  existing: Map<
    string,
    { id: string; performance: SitePerformance }
  > = new Map(),
) {
  const relevant = items.flatMap((item) => {
    const match = categoryMatch(item, rule);
    return match ? [{ item, match }] : [];
  });
  const filtered = relevant.filter(
    ({ item: p }) =>
      (query.minPrice === undefined ||
        (p.price !== null && p.price >= query.minPrice)) &&
      (query.maxPrice === undefined ||
        (p.price !== null && p.price <= query.maxPrice)) &&
      (query.minRating === undefined ||
        (p.rating !== null && p.rating >= query.minRating)) &&
      (query.minReviews === undefined ||
        (p.reviewCount !== null && p.reviewCount >= query.minReviews)),
  );
  const exact = filtered.filter((p) => p.match.tier === 0);
  const pool = query.onlyExact
    ? exact.length
      ? exact
      : query.allowFallback
        ? filtered
        : []
    : query.allowFallback
      ? filtered
      : exact;
  // All normalization stays inside the same category tier and currency.
  const ranked = pool
    .map(({ item: p, match }) => {
      const peers = pool
        .filter(
          (x) => x.match.tier === match.tier && x.item.currency === p.currency,
        )
        .map((x) => x.item);
      const prices = peers.flatMap((x) => (x.price !== null ? [x.price] : [])),
        bestPrice = prices.length ? Math.min(...prices) : null;
      const commission =
        p.price !== null && p.commissionRate !== null
          ? p.price * p.commissionRate
          : null;
      const commissions = peers.flatMap((x) =>
        x.price !== null && x.commissionRate !== null
          ? [x.price * x.commissionRate]
          : [],
      );
      const maxCommission = commissions.length
        ? Math.max(...commissions)
        : null;
      const priceScore =
        p.price !== null && bestPrice !== null
          ? p.price === 0
            ? 1
            : clamp(bestPrice / p.price)
          : null;
      const rating = p.rating !== null ? clamp(p.rating / 5) : null;
      const review =
        p.reviewCount !== null
          ? clamp(Math.log1p(p.reviewCount) / Math.log1p(10000))
          : null;
      const category =
        match.tier === 0 ? 1 : Math.max(0.2, 0.8 - (match.tier - 1) * 0.15);
      const keywords = [
        ...new Set(
          words(query.keywords || rule.categoryName)
            .split(" ")
            .filter(Boolean),
        ),
      ];
      const searchText =
        p.title +
        " " +
        p.features.join(" ") +
        " " +
        p.nodes.map((n) => n.name).join(" ");
      const keyword = keywords.length
        ? keywords.filter((w) => matches(searchText, w)).length /
          keywords.length
        : 0;
      const matchingRanks = p.nodes.filter(
        (n) =>
          n.salesRank !== null &&
          (rule.browseNodeId
            ? n.id === rule.browseNodeId
            : rule.exactTerms.some((t) => matches(n.name, t))),
      );
      const popularity = matchingRanks.length
        ? clamp(
            1 -
              Math.log10(Math.min(...matchingRanks.map((n) => n.salesRank!))) /
                5,
          )
        : null;
      const saved = existing.get(p.asin),
        performance = saved?.performance || null;
      const observed =
        validPerformance(performance) &&
        performance!.observedConversionRate !== null &&
        Number.isFinite(performance!.observedConversionRate) &&
        performance!.observedConversionRate >= 0 &&
        performance!.observedConversionRate <= 1
          ? performance!.observedConversionRate
          : null;
      const measuredPeers = peers
        .map((x) => existing.get(x.asin)?.performance)
        .filter(
          (x): x is SitePerformance =>
            !!x &&
            validPerformance(x) &&
            x.windowStart === performance?.windowStart &&
            x.windowEnd === performance?.windowEnd,
        );
      const rates = measuredPeers.flatMap((x) =>
        x.observedConversionRate !== null &&
        Number.isFinite(x.observedConversionRate) &&
        x.observedConversionRate >= 0 &&
        x.observedConversionRate <= 1
          ? [x.observedConversionRate]
          : [],
      );
      const conversion =
        observed !== null
          ? Math.max(...rates, 0) === 0
            ? 0
            : observed / Math.max(...rates)
          : [popularity, rating, review, priceScore].some((v) => v !== null)
            ? mean([popularity, rating, review, priceScore, category, keyword])
            : null;
      const epc =
        validPerformance(performance) &&
        performance!.earningsPerClick !== null &&
        Number.isFinite(performance!.earningsPerClick) &&
        performance!.earningsPerClick >= 0
          ? performance!.earningsPerClick
          : null;
      const earnings = measuredPeers.flatMap((x) =>
        x.earningsPerClick !== null &&
        Number.isFinite(x.earningsPerClick) &&
        x.earningsPerClick >= 0
          ? [x.earningsPerClick]
          : [],
      );
      const economic =
        epc !== null
          ? Math.max(...earnings, 0) === 0
            ? 0
            : epc / Math.max(...earnings)
          : commission !== null && maxCommission !== null
            ? maxCommission === 0
              ? 0
              : clamp(commission / maxCommission)
            : null;
      const basis =
        observed !== null
          ? "Observed conversion rate, normalized against measured peers in the same category/currency/reporting window; not a predicted conversion rate"
          : "Geometric proxy index from available popularity, rating, reviews, relative price, category and keywords; not a conversion rate";
      const parts = [
        { label: "Conversion Potential", weight: 35, score: conversion, basis },
        {
          label: "Estimated Commission Per Sale",
          weight: 25,
          score: economic,
          basis:
            epc !== null
              ? "Authorized observed earnings per click replaces commission proxy; normalized in the same reporting window"
              : p.commissionSource || "Commission rate not provided",
        },
        {
          label: "Category Relevance",
          weight: 15,
          score: category,
          basis: match.basis,
        },
        {
          label: "Rating Score",
          weight: 10,
          score: rating,
          basis: p.rating !== null ? "Returned rating / 5" : "Not provided",
        },
        {
          label: "Review Strength",
          weight: 10,
          score: review,
          basis:
            p.reviewCount !== null
              ? "Log-scaled returned review count; saturation at 10,000"
              : "Not provided",
        },
        {
          label: "Price Competitiveness",
          weight: 5,
          score: priceScore,
          basis:
            priceScore !== null
              ? "Lowest comparable price / product price, same category tier and currency"
              : "Not provided",
        },
      ].map((part) => ({
        ...part,
        score: part.score !== null ? part.score * 100 : null,
        contribution: (part.score ?? 0) * part.weight,
      }));
      const score = parts.reduce((sum, x) => sum + x.contribution, 0);
      return {
        ...p,
        categoryTier: match.tier,
        categoryMatch: match.label,
        categoryBasis: match.basis,
        destinationCategoryId: match.destination,
        keywordMatch: keyword * 100,
        estimatedCommissionPerSale: commission,
        conversionPotential: conversion !== null ? conversion * 100 : null,
        conversionBasis: basis,
        commissionWeightedPotential:
          commission !== null && conversion !== null
            ? commission * (observed ?? conversion)
            : null,
        opportunityScore: Math.round(score * 100) / 100,
        breakdown: parts,
        signalCoverage: parts
          .filter((x) => x.score !== null)
          .reduce((sum, x) => sum + x.weight, 0),
        alreadyImported: !!saved,
        importedProductId: saved?.id || null,
        performance,
      } satisfies RankedItem;
    })
    .filter(
      (p) =>
        query.minOpportunity === undefined ||
        p.opportunityScore >= query.minOpportunity,
    );
  if (
    !ranked.length &&
    query.onlyExact &&
    query.allowFallback &&
    exact.length
  ) {
    return rankItems(
      relevant.filter((x) => x.match.tier > 0).map((x) => x.item),
      rule,
      query,
      existing,
    );
  }
  return sortRanked(ranked, query.sort).slice(0, query.maxResults);
}
export function sortRanked(items: RankedItem[], sort: FinderSort) {
  const value = (p: RankedItem) =>
    sort === "commission"
      ? p.estimatedCommissionPerSale
      : sort === "rate"
        ? p.commissionRate
        : sort === "rating"
          ? p.rating
          : sort === "reviews"
            ? p.reviewCount
            : sort === "price"
              ? p.price
              : p.opportunityScore;
  return [...items].sort(
    (a, b) =>
      a.categoryTier - b.categoryTier ||
      (value(b) ?? -1) - (value(a) ?? -1) ||
      a.asin.localeCompare(b.asin),
  );
}
