export type AmazonItem = {
  /** Fictional taxonomy only; never populated by the live API adapter. */
  mockCategoryPaths?: string[];
  asin: string;
  title: string;
  brand: string | null;
  image: string | null;
  images: string[];
  productUrl: string;
  affiliateUrl: string;
  price: number | null;
  currency: string | null;
  availability: string | null;
  rating: number | null;
  reviewCount: number | null;
  nodes: { id: string; name: string; salesRank: number | null }[];
  features: string[];
  marketplace: string;
  mock: boolean;
  commissionRate: number | null;
  commissionSource: string | null;
};
export type Fallback = {
  label: string;
  terms: string[];
  browseNodeId?: string | null;
  destinationCategoryId?: string | null;
};
export type ImportRule = {
  categoryId: string;
  marketplace: string;
  categoryName: string;
  categoryPath: string;
  searchIndex: string;
  browseNodeId: string | null;
  exactTerms: string[];
  excludedTerms: string[];
  fallbacks: Fallback[];
  commissionRate: number | null;
  commissionSource: string | null;
  commissionVerifiedAt: string | null;
  commissionValidUntil: string | null;
  syncFields: string[];
};
export type SitePerformance = {
  affiliateClicks: number | null;
  outboundCtr: number | null;
  observedConversionRate: number | null;
  observedEarnings: number | null;
  earningsPerClick: number | null;
  source: string | null;
  measuredAt: string | null;
  windowStart: string | null;
  windowEnd: string | null;
};
export const sortOptions = [
  ["expected", "Highest Expected Earnings"],
  ["commission", "Highest Estimated Commission"],
  ["rate", "Highest Commission Rate"],
  ["rating", "Highest Rated"],
  ["reviews", "Most Reviewed"],
  ["price", "Highest Price"],
] as const;
export type FinderSort = (typeof sortOptions)[number][0];
export type ScorePart = {
  label: string;
  weight: number;
  score: number | null;
  contribution: number;
  basis: string;
};
export type RankedItem = AmazonItem & {
  categoryTier: number;
  categoryMatch: string;
  categoryBasis: string;
  destinationCategoryId: string;
  keywordMatch: number;
  estimatedCommissionPerSale: number | null;
  conversionPotential: number | null;
  conversionBasis: string;
  // A proxy-index product, never a conversion probability or income forecast.
  commissionWeightedPotential: number | null;
  opportunityScore: number;
  breakdown: ScorePart[];
  signalCoverage: number;
  alreadyImported: boolean;
  importedProductId: string | null;
  performance: SitePerformance | null;
};
