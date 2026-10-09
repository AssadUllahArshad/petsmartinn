export const adminResources = [
  ["products", "Products"],
  ["amazon/product-finder", "Amazon Product Finder"],
  ["amazon/imported", "Amazon imports"],
  ["amazon/import-rules", "Amazon import rules"],
  ["amazon/logs", "Amazon logs"],
  ["settings/amazon", "Amazon settings"],
  ["categories", "Categories"],
  ["brands", "Brands"],
  ["buying-guides", "Buying guides"],
  ["dog-breeds", "Dog breeds"],
  ["cat-breeds", "Cat breeds"],
  ["pet-health", "Pet health"],
  ["blog", "Blog"],
  ["pages", "Pages"],
  ["authors", "Authors & reviewers"],
  ["homepage", "Homepage"],
  ["navigation", "Navigation"],
  ["affiliate-clicks", "Affiliate clicks"],
  ["media", "Media library"],
  ["seo", "SEO overview"],
  ["settings", "Site settings"],
  ["users", "Administrators"],
  ["audit-log", "Audit log"],
] as const;
export const contentTypes: Record<
  string,
  "BUYING_GUIDE" | "DOG_BREED" | "CAT_BREED" | "HEALTH" | "BLOG" | "PAGE"
> = {
  "buying-guides": "BUYING_GUIDE",
  "dog-breeds": "DOG_BREED",
  "cat-breeds": "CAT_BREED",
  "pet-health": "HEALTH",
  blog: "BLOG",
  pages: "PAGE",
};
export const editableResources = [
  "products",
  "categories",
  "brands",
  "authors",
  "navigation",
  ...Object.keys(contentTypes),
];
