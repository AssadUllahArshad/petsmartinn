import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { amazonConfig } from "./config";
import { defaultRule } from "@/lib/amazon/default-rule";
import {
  finderSchema,
  ruleSchema,
  selectionSchema,
} from "@/lib/amazon/validation";
import { rankItems } from "@/lib/amazon/ranking";
import { managedSyncPatch } from "@/lib/amazon/sync";
import type {
  AmazonItem,
  ImportRule,
  RankedItem,
  SitePerformance,
  Fallback,
} from "@/lib/amazon/types";
import { applyCommissionEvidence } from "@/lib/amazon/commission";
import { mockItems } from "./mock";
import { searchCreators, getCreators, AmazonApiError } from "./creators";
import { expireAmazonCache } from "./cache";
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
export async function amazonLog(
  kind: string,
  status: string,
  message: string,
  adminId?: string,
  extra?: { asin?: string; categoryId?: string; marketplace?: string },
) {
  await db.amazonLog.create({
    data: { kind, status, message, adminId, ...extra },
  });
}
export async function getRule(categoryId: string): Promise<ImportRule> {
  const c = amazonConfig();
  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new Error("Select an existing Petsmartinn category");
  const saved = await db.amazonImportRule.findUnique({
    where: {
      categoryId_marketplace: { categoryId, marketplace: c.marketplace },
    },
  });
  const fallback = defaultRule(category, c.marketplace);
  return saved
    ? {
        ...fallback,
        ...saved,
        categoryName: category.name,
        categoryPath: category.path,
        fallbacks: saved.fallbacks as Fallback[],
        commissionVerifiedAt: saved.commissionVerifiedAt?.toISOString() || null,
        commissionValidUntil: saved.commissionValidUntil?.toISOString() || null,
      }
    : fallback;
}
function commission(items: AmazonItem[], rule: ImportRule) {
  return applyCommissionEvidence(items, rule, amazonConfig().mock);
}
export async function searchAmazon(input: unknown, adminId: string) {
  await expireAmazonCache();
  const query = finderSchema.parse(input),
    rule = await getRule(query.categoryId),
    config = amazonConfig();
  if (!config.mock && !config.configured)
    throw new AmazonApiError("NOT_CONFIGURED");
  if (!config.mock && !config.analysisApproved)
    throw new Error(
      "Live ranking requires the operator to confirm Amazon analysis approval with AMAZON_ANALYSIS_APPROVED=true. See Amazon settings.",
    );
  const limited = () =>
    amazonLog(
      "rate_limit",
      "WARN",
      "Creators API requested a retry after rate limiting",
      adminId,
      { categoryId: rule.categoryId, marketplace: config.marketplace },
    );
  const baseKeywords = [rule.categoryName, query.keywords]
    .filter(Boolean)
    .join(" ");
  const initial = config.mock
    ? { items: mockItems(rule), partialErrors: 0 }
    : await searchCreators(rule, baseKeywords, query.maxResults, limited);
  let items = commission(initial.items, rule),
    partialErrors = initial.partialErrors;
  const existing = await db.product.findMany({
    where: { amazonAsin: { not: null } },
    include: { _count: { select: { clicks: true } } },
  });
  const saved = new Map(
    existing.map((p) => [
      p.amazonAsin!,
      {
        id: p.id,
        performance: {
          affiliateClicks: p._count.clicks,
          outboundCtr: p.outboundCtr,
          observedConversionRate: p.observedConversionRate,
          observedEarnings:
            p.observedEarnings === null ? null : Number(p.observedEarnings),
          earningsPerClick:
            p.earningsPerClick === null ? null : Number(p.earningsPerClick),
          source: p.performanceSource,
          measuredAt: p.performanceMeasuredAt?.toISOString() || null,
          windowStart: p.performanceWindowStart?.toISOString() || null,
          windowEnd: p.performanceWindowEnd?.toISOString() || null,
        } satisfies SitePerformance,
      },
    ]),
  );
  const exclusions = await db.amazonExclusion.findMany({
    where: { categoryId: rule.categoryId, marketplace: config.marketplace },
  });
  const excluded = new Set(exclusions.map((e) => e.asin));
  const eligible = () => items.filter((p) => !excluded.has(p.asin));
  let results = rankItems(eligible(), rule, query, saved);
  const fallbackQueries: string[] = [];
  if (
    !config.mock &&
    query.allowFallback &&
    (!query.onlyExact || results.length === 0)
  )
    for (const fallback of rule.fallbacks) {
      const response = await searchCreators(
        { ...rule, browseNodeId: fallback.browseNodeId || null },
        [fallback.label, query.keywords].filter(Boolean).join(" "),
        query.maxResults,
        limited,
      );
      items = commission(
        [
          ...new Map(
            [...items, ...response.items].map((p) => [p.asin, p]),
          ).values(),
        ],
        rule,
      );
      partialErrors += response.partialErrors;
      fallbackQueries.push(fallback.label);
      results = rankItems(eligible(), rule, query, saved);
      if (query.onlyExact && results.length) break;
      if (!query.onlyExact && results.length >= query.maxResults) break;
    }
  await db.amazonSearchBatch.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  const batch = await db.amazonSearchBatch.create({
    data: {
      adminId,
      categoryId: rule.categoryId,
      marketplace: config.marketplace,
      mock: config.mock,
      query: json(query),
      results: json(results),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  await amazonLog(
    "search",
    partialErrors ? "WARN" : "OK",
    `${config.mock ? "Mock" : "Creators API"} search returned ${results.length} eligible results${partialErrors ? `; ${partialErrors} partial API errors` : ""}`,
    adminId,
    { categoryId: rule.categoryId, marketplace: config.marketplace },
  );
  if (partialErrors)
    await amazonLog(
      "api_error",
      "WARN",
      "Creators API returned partial item errors; incomplete items were omitted",
      adminId,
      { categoryId: rule.categoryId, marketplace: config.marketplace },
    );
  return {
    primaryKeyword: query.keywords || rule.categoryName,
    batchId: batch.id,
    results,
    mock: config.mock,
    expiresAt: batch.expiresAt.toISOString(),
    fallbackQueries,
    rule: {
      categoryName: rule.categoryName,
      exactTerms: rule.exactTerms,
      commissionConfigured: results.some((p) => p.commissionRate !== null),
    },
  };
}
async function batchSelection(input: unknown, adminId: string) {
  const selection = selectionSchema.parse(input);
  const batch = await db.amazonSearchBatch.findFirst({
    where: { id: selection.batchId, adminId, expiresAt: { gt: new Date() } },
  });
  if (!batch)
    throw new Error(
      "Search preview expired or belongs to another administrator. Search again.",
    );
  if (
    batch.mock !== amazonConfig().mock ||
    batch.marketplace !== amazonConfig().marketplace
  )
    throw new Error("Amazon mode or marketplace changed. Search again.");
  const results = batch.results as unknown as RankedItem[];
  const rows = [...new Set(selection.asins)].map((asin) => {
    const p = results.find((p) => p.asin === asin);
    if (!p) throw new Error("Product is not in this authorized search preview");
    return p;
  });
  return { batch, rows };
}
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
async function brandId(tx: Prisma.TransactionClient, name: string | null) {
  if (!name) return null;
  const slug = slugify(name).slice(0, 150) || "amazon-brand";
  const brand = await tx.brand.upsert({
    where: { slug },
    create: { name, slug, status: "DRAFT" },
    update: {},
  });
  return brand.id;
}
export async function importAmazon(input: unknown, adminId: string) {
  const { batch, rows } = await batchSelection(input, adminId);
  const imported: { asin: string; id: string }[] = [],
    duplicates: string[] = [];
  for (const p of rows) {
    const excluded = await db.amazonExclusion.findUnique({
      where: {
        categoryId_asin_marketplace: {
          categoryId: batch.categoryId,
          asin: p.asin,
          marketplace: p.marketplace,
        },
      },
    });
    if (excluded)
      throw new Error("An excluded result cannot be imported. Search again.");
    if (
      !(await db.category.findUnique({
        where: { id: p.destinationCategoryId },
      }))
    )
      throw new Error("Destination category is no longer available");
    const found = await db.product.findUnique({
      where: { amazonAsin: p.asin },
    });
    if (found) {
      duplicates.push(p.asin);
      await amazonLog(
        "duplicate",
        "SKIPPED",
        "ASIN already imported; existing record was preserved",
        adminId,
        { asin: p.asin },
      );
      continue;
    }
    const rule = await getRule(batch.categoryId);
    try {
      const product = await db.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            title: p.title,
            slug:
              (slugify(p.title).slice(0, 110) || "amazon-product") +
              "-" +
              p.asin.toLowerCase(),
            source: p.mock ? "AMAZON_MOCK" : "AMAZON",
            amazonTitleManaged: !p.mock,
            amazonAsin: p.asin,
            amazonMarketplace: p.marketplace,
            amazonProductUrl: p.productUrl,
            amazonAffiliateUrl: p.affiliateUrl,
            amazonCategory:
              p.categoryMatch === "Exact category"
                ? rule.categoryName
                : p.categoryMatch,
            amazonCommissionRate: p.commissionRate,
            amazonCommissionSource: p.commissionSource,
            estimatedCommissionPerSale: p.estimatedCommissionPerSale,
            amazonOpportunityScore: p.opportunityScore,
            amazonManagedFields: json(rule.syncFields),
            amazonLastSyncAt: new Date(),
            amazonExpiresAt: new Date(Date.now() + 24 * 3600000),
            amazonSyncStatus: p.mock ? "MOCK_IMPORTED" : "IMPORTED",
            amazonAvailability: p.availability,
            amazonBrandName: p.brand,
            brandId: await brandId(tx, p.brand),
            mainImage: p.image || "",
            imageAlt: p.image ? p.title : "",
            price: p.price,
            currency: p.currency || "USD",
            rating: p.rating,
            reviewCount: p.reviewCount,
            status: "DRAFT",
            isDemo: p.mock,
            merchant: "Amazon",
            affiliateUrl: p.affiliateUrl,
            seo: json({
              primaryKeyword:
                (batch.query as { keywords?: string }).keywords ||
                rule.categoryName,
            }),
            categories: {
              create: { categoryId: p.destinationCategoryId, primary: true },
            },
            images: {
              create: p.images.map((url, order) => ({
                url,
                alt: p.title,
                order,
              })),
            },
          },
        });
        await tx.auditLog.create({
          data: {
            adminId,
            action: "amazon_imported",
            entity: "products",
            entityId: created.id,
          },
        });
        return created;
      });
      imported.push({ asin: p.asin, id: product.id });
      await amazonLog(
        "import",
        "OK",
        `${p.mock ? "Mock fixture" : "Amazon product"} imported as Draft`,
        adminId,
        {
          asin: p.asin,
          categoryId: p.destinationCategoryId,
          marketplace: p.marketplace,
        },
      );
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002" &&
        (await db.product.findUnique({ where: { amazonAsin: p.asin } }))
      ) {
        duplicates.push(p.asin);
        await amazonLog(
          "duplicate",
          "SKIPPED",
          "Concurrent duplicate ASIN import prevented by database constraint",
          adminId,
          { asin: p.asin },
        );
      } else throw e;
    }
  }
  return { imported, duplicates };
}
export async function excludeAmazon(input: unknown, adminId: string) {
  const { batch, rows } = await batchSelection(input, adminId);
  for (const p of rows)
    await db.amazonExclusion.upsert({
      where: {
        categoryId_asin_marketplace: {
          categoryId: batch.categoryId,
          asin: p.asin,
          marketplace: p.marketplace,
        },
      },
      create: {
        categoryId: batch.categoryId,
        asin: p.asin,
        marketplace: p.marketplace,
      },
      update: {},
    });
  await amazonLog(
    "exclude",
    "OK",
    `${rows.length} products excluded from future searches in this category`,
    adminId,
    { categoryId: batch.categoryId },
  );
  return { excluded: rows.map((p) => p.asin) };
}
export async function saveAmazonRule(input: unknown, adminId: string) {
  const value = ruleSchema.parse(input),
    c = amazonConfig();
  await getRule(value.categoryId);
  for (const f of value.fallbacks)
    if (
      f.destinationCategoryId &&
      !(await db.category.findUnique({
        where: { id: f.destinationCategoryId },
      }))
    )
      throw new Error("Fallback destination category does not exist");
  const data = {
    ...value,
    marketplace: c.marketplace,
    fallbacks: json(value.fallbacks),
    commissionVerifiedAt: value.commissionVerifiedAt
      ? new Date(value.commissionVerifiedAt)
      : null,
    commissionValidUntil: value.commissionValidUntil
      ? new Date(value.commissionValidUntil)
      : null,
  };
  const rule = await db.amazonImportRule.upsert({
    where: {
      categoryId_marketplace: {
        categoryId: value.categoryId,
        marketplace: c.marketplace,
      },
    },
    create: data,
    update: data,
  });
  await amazonLog(
    "rules",
    "OK",
    "Category-specific import rule saved",
    adminId,
    { categoryId: value.categoryId, marketplace: c.marketplace },
  );
  return { id: rule.id };
}
export async function syncAmazon(ids: string[], adminId: string) {
  const config = amazonConfig(),
    products = await db.product.findMany({
      where: { id: { in: ids }, amazonAsin: { not: null } },
    });
  if (!products.length || products.length !== new Set(ids).size)
    throw new Error("Choose existing Amazon imports");
  if (
    products.some(
      (p) =>
        p.amazonMarketplace !== config.marketplace ||
        (p.source === "AMAZON_MOCK") !== config.mock,
    )
  )
    throw new Error(
      "Sync mode and marketplace must match the imported products",
    );
  const limiter = () =>
    amazonLog(
      "rate_limit",
      "WARN",
      "Creators API sync was rate limited",
      adminId,
    );
  const response = config.mock
    ? { items: [], partialErrors: 0 }
    : await getCreators(
        products.map((p) => p.amazonAsin!),
        limiter,
      );
  let synced = 0;
  for (const product of products) {
    const category = await db.productCategory.findFirst({
      where: { productId: product.id },
      orderBy: { primary: "desc" },
    });
    if (!category) continue;
    const rule = await getRule(category.categoryId);
    const item = config.mock
      ? mockItems(rule).find((p) => p.asin === product.amazonAsin)
      : response.items.find((p) => p.asin === product.amazonAsin);
    if (!item) {
      await db.product.update({
        where: { id: product.id },
        data: { amazonSyncStatus: "UNAVAILABLE" },
      });
      await amazonLog(
        "sync",
        "WARN",
        "Product not returned by Creators API; no data fabricated",
        adminId,
        { asin: product.amazonAsin! },
      );
      continue;
    }
    const p = commission([item], rule)[0],
      fields = (product.amazonManagedFields as string[]).filter((f) =>
        rule.syncFields.includes(f),
      );
    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: {
          ...managedSyncPatch(p, fields),
          // Partial refresh cannot extend the retention of older, unsynced content.
          ...(fields.length < 4 && product.amazonExpiresAt
            ? { amazonExpiresAt: product.amazonExpiresAt }
            : {}),
          ...(product.amazonTitleManaged ? { title: p.title } : {}),
          ...(fields.includes("brand")
            ? { brandId: await brandId(tx, p.brand) }
            : {}),
        },
      });
      if (fields.includes("images")) {
        await tx.productImage.deleteMany({ where: { productId: product.id } });
        await tx.productImage.createMany({
          data: p.images.map((url, order) => ({
            productId: product.id,
            url,
            alt: p.title,
            order,
          })),
        });
      }
    });
    synced++;
    await amazonLog(
      "sync",
      "OK",
      "Amazon-managed fields synced; editorial and SEO fields preserved",
      adminId,
      { asin: p.asin, marketplace: p.marketplace },
    );
  }
  if (response.partialErrors)
    await amazonLog(
      "api_error",
      "WARN",
      "Creators API sync returned partial item errors",
      adminId,
    );
  return { synced };
}
