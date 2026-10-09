import { z } from "zod";
import { externalUrl } from "../validation";
const optionalNumber = (max: number, integer = false) =>
  z.preprocess(
    (v) => {
      if (
        v === "" ||
        v === null ||
        v === undefined ||
        (typeof v === "string" && !v.trim())
      )
        return undefined;
      if (typeof v === "string" && /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(v.trim()))
        return Number(v);
      return v;
    },
    (integer ? z.number().int() : z.number()).min(0).max(max).optional(),
  );
export const finderSchema = z
  .object({
    categoryId: z.string().min(1).max(200),
    keywords: z.string().trim().max(300).default(""),
    minPrice: optionalNumber(99999999),
    maxPrice: optionalNumber(99999999),
    minRating: optionalNumber(5),
    minReviews: optionalNumber(2147483647, true),
    minOpportunity: optionalNumber(100),
    maxResults: z.number().int().min(1).max(100).default(20),
    onlyExact: z.boolean().default(true),
    allowFallback: z.boolean().default(true),
    sort: z
      .enum(["expected", "commission", "rate", "rating", "reviews", "price"])
      .default("expected"),
  })
  .refine(
    (v) =>
      v.minPrice === undefined ||
      v.maxPrice === undefined ||
      v.minPrice <= v.maxPrice,
    {
      message: "Minimum price must not exceed maximum price",
      path: ["maxPrice"],
    },
  );
export type FinderQuery = z.infer<typeof finderSchema>;
const terms = z.array(z.string().trim().min(1).max(120)).max(30);
const node = z
  .string()
  .regex(/^[1-9]\d{0,18}$/)
  .nullable()
  .optional();
export const ruleSchema = z
  .object({
    categoryId: z.string().min(1).max(200),
    searchIndex: z.string().regex(/^[A-Za-z][A-Za-z0-9]{0,60}$/),
    browseNodeId: node,
    exactTerms: terms.min(1),
    excludedTerms: terms,
    fallbacks: z
      .array(
        z.object({
          label: z.string().min(2).max(100),
          terms: terms.min(1),
          browseNodeId: node,
          destinationCategoryId: z.string().max(200).nullable().optional(),
        }),
      )
      .max(4),
    commissionRate: z.number().min(0).max(1).nullable(),
    commissionSource: z.union([externalUrl, z.literal("")]).nullable(),
    commissionVerifiedAt: z.iso.datetime().nullable(),
    commissionValidUntil: z.iso.datetime().nullable(),
    syncFields: z
      .array(z.enum(["price", "availability", "images", "brand"]))
      .max(4),
  })
  .superRefine((v, ctx) => {
    if (
      v.commissionRate !== null &&
      (!v.commissionSource ||
        !v.commissionVerifiedAt ||
        !v.commissionValidUntil)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "A commission rate requires its source URL, verification date, and expiry date.",
      });
    if (
      v.commissionVerifiedAt &&
      new Date(v.commissionVerifiedAt).getTime() > Date.now()
    )
      ctx.addIssue({
        code: "custom",
        message: "Verification date cannot be in the future.",
      });
    if (
      v.commissionVerifiedAt &&
      v.commissionValidUntil &&
      new Date(v.commissionValidUntil) <= new Date(v.commissionVerifiedAt)
    )
      ctx.addIssue({
        code: "custom",
        message: "Commission expiry must follow verification.",
      });
  });
export const selectionSchema = z.object({
  batchId: z.string().min(1).max(200),
  asins: z
    .array(z.string().regex(/^[A-Z0-9]{10}$/))
    .min(1)
    .max(100),
});
