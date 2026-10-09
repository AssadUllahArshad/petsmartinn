export type SEO = {
  title?: string;
  description?: string;
  h1?: string;
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  searchIntent?: string;
  targetCountry?: string;
};
export type AEO = {
  entity?: string;
  directAnswer?: string;
  takeaways?: string[];
  semanticTerms?: string[];
  whoFor?: string;
  importantFacts?: string[];
  comparisonSummary?: string;
  faqs?: { question: string; answer: string }[];
};
export type Block = {
  type:
    | "paragraph"
    | "h2"
    | "h3"
    | "list"
    | "quote"
    | "callout"
    | "table"
    | "image"
    | "link"
    | "product"
    | "comparison";
  text?: string;
  items?: string[];
  rows?: string[][];
  url?: string;
  alt?: string;
  productId?: string;
  productIds?: string[];
  label?: string;
};
