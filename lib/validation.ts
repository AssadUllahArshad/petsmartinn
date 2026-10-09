import { z } from "zod";
export const slug = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase words separated by hyphens",
  )
  .max(160);
export function safeUrl(value: string) {
  try {
    const u = new URL(value);
    return (
      ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      value === value.trim() &&
      !/[\r\n\t]/.test(value)
    );
  } catch {
    return false;
  }
}
export const externalUrl = z
  .string()
  .max(4096)
  .refine(
    safeUrl,
    "Enter a valid HTTP(S) URL without credentials or whitespace",
  );
const imageUrl = z
  .string()
  .refine(
    (v) => v.startsWith("/images/") || v.startsWith("/uploads/") || safeUrl(v),
    "Use a valid image URL",
  );
export const seoSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  h1: z.string().max(200).optional(),
  canonical: z.union([externalUrl, z.literal("")]).optional(),
  noindex: z.boolean().optional(),
  nofollow: z.boolean().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  primaryKeyword: z.string().optional(),
  secondaryKeywords: z.array(z.string()).optional(),
  searchIntent: z.string().optional(),
  targetCountry: z.string().optional(),
});
export const aeoSchema = z.object({
  entity: z.string().optional(),
  directAnswer: z.string().optional(),
  takeaways: z.array(z.string()).optional(),
  semanticTerms: z.array(z.string()).optional(),
  whoFor: z.string().optional(),
  importantFacts: z.array(z.string()).optional(),
  comparisonSummary: z.string().optional(),
  faqs: z
    .array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
    .optional(),
});
const status = z.enum(["DRAFT", "NEEDS_REVIEW", "REVIEWED", "PUBLISHED"]);
const text = z.string().max(100000);
export const productSchema = z.object({
  title: z.string().min(2).max(240),
  slug,
  sku: z.string().nullable().optional(),
  brandId: z.string().nullable().optional(),
  shortDescription: text.default(""),
  description: text.default(""),
  features: z.array(z.string()).default([]),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  bestFor: text.default(""),
  notIdealFor: text.default(""),
  mainImage: z.union([imageUrl, z.literal("")]),
  imageAlt: z.string().default(""),
  price: z.number().nonnegative().max(99999999).nullable(),
  oldPrice: z.number().nonnegative().max(99999999).nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  rating: z.number().min(0).max(5).nullable(),
  reviewCount: z.number().int().nonnegative().nullable(),
  badge: z.string().nullable().optional(),
  featured: z.boolean(),
  status,
  merchant: z.string().min(1),
  affiliateUrl: externalUrl,
  buttonText: z.enum(["Shop Now", "View on Amazon", "Check Price", "See Deal"]),
  openNewTab: z.boolean(),
  trackClicks: z.boolean(),
  affiliateDisclosure: text.default(""),
  categoryIds: z.array(z.string()).default([]),
  relatedProductIds: z.array(z.string()).default([]),
  gallery: z.array(z.object({ url: imageUrl, alt: z.string() })).default([]),
  seo: seoSchema,
  aeo: aeoSchema,
});
export const categorySchema = z.object({
  name: z.string().min(2),
  slug,
  path: z
    .string()
    .regex(/^\/[a-z0-9/-]+$/)
    .refine(
      (v) => !v.includes("//") && !v.endsWith("/"),
      "No double or trailing slashes",
    ),
  parentId: z.string().nullable(),
  image: imageUrl,
  icon: z.string().default("paw"),
  intro: text,
  body: text,
  featured: z.boolean(),
  status,
  order: z.number().int(),
  seo: seoSchema,
  aeo: aeoSchema,
});
export const brandSchema = z.object({
  name: z.string().min(2),
  slug,
  logo: z.union([imageUrl, z.literal("")]).nullable(),
  description: text,
  body: text,
  featured: z.boolean(),
  status,
  seo: seoSchema,
  aeo: aeoSchema,
});
const block = z.object({
  type: z.enum([
    "paragraph",
    "h2",
    "h3",
    "list",
    "quote",
    "callout",
    "table",
    "image",
    "link",
    "product",
    "comparison",
  ]),
  text: text.optional(),
  items: z.array(z.string()).optional(),
  rows: z.array(z.array(z.string())).optional(),
  url: z.union([externalUrl, z.string().regex(/^\/(?!\/)/)]).optional(),
  alt: z.string().optional(),
  productId: z.string().optional(),
  productIds: z.array(z.string()).optional(),
  label: z.string().optional(),
});
export const contentSchema = z.object({
  type: z.enum([
    "BUYING_GUIDE",
    "DOG_BREED",
    "CAT_BREED",
    "HEALTH",
    "BLOG",
    "PAGE",
  ]),
  title: z.string().min(2),
  slug,
  species: z.enum(["dogs", "cats"]),
  excerpt: text,
  image: z.union([imageUrl, z.literal("")]).nullable(),
  imageAlt: z.string(),
  blocks: z.array(block),
  specialized: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  seo: seoSchema,
  aeo: aeoSchema,
  tags: z.array(z.string()),
  authorId: z.string().nullable(),
  reviewerId: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  emergencyWarning: text,
  disclaimer: text,
  status,
  productIds: z.array(z.string()),
  categoryIds: z.array(z.string()),
  relatedContentIds: z.array(z.string()),
  faqs: z.array(
    z.object({ question: z.string().min(1), answer: z.string().min(1) }),
  ),
  sources: z.array(z.object({ title: z.string().min(1), url: externalUrl })),
});
export function healthPublishError(v: {
  type: string;
  status: string;
  reviewerId?: string | null;
  reviewedAt?: string | null;
  authorId?: string | null;
  sources: unknown[];
  disclaimer: string;
}) {
  if (
    v.type === "HEALTH" &&
    ["REVIEWED", "PUBLISHED"].includes(v.status) &&
    (!v.reviewerId ||
      !v.reviewedAt ||
      !v.authorId ||
      !v.sources.length ||
      !v.disclaimer)
  )
    return "Reviewed health content requires an author, reviewer, review date, sources, and veterinary disclaimer.";
  return null;
}
export const navSchema = z.object({
  label: z.string().min(1),
  href: z.string().refine((v) => /^\/(?!\/)/.test(v) || safeUrl(v)),
  location: z.enum(["header", "footer"]),
  parentId: z.string().nullable(),
  order: z.number().int(),
  visible: z.boolean(),
});
export const authorSchema = z.object({
  name: z.string().min(2),
  slug,
  bio: text,
  image: z.string().nullable(),
  jobTitle: z.string().nullable(),
  credentials: z.string().nullable(),
  expertise: z.array(z.string()),
  socialLinks: z.record(z.string(), externalUrl),
  type: z.enum([
    "Editorial",
    "Pet Writer",
    "Veterinary Reviewer",
    "Contributor",
  ]),
});
