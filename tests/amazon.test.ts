import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultRule } from "../lib/amazon/default-rule";
import {
  rankItems,
  categoryMatch,
  validPerformance,
} from "../lib/amazon/ranking";
import { finderSchema, ruleSchema } from "../lib/amazon/validation";
import {
  normalizeItem,
  normalizeResponse,
  amazonImage,
} from "../lib/amazon/normalize";
import { managedSyncPatch } from "../lib/amazon/sync";
import { sortOptions, type SitePerformance } from "../lib/amazon/types";
import { mockItems } from "../services/amazon/mock";
const rule = defaultRule(
  { id: "harnesses", name: "Harnesses", path: "/dogs/harnesses" },
  "www.amazon.com",
);
// Stable regression subset; expanded catalogs are covered separately.
const items = mockItems(rule).slice(0, 7);
const query = (extra: Record<string, unknown> = {}) =>
  finderSchema.parse({ categoryId: rule.categoryId, ...extra });

test("Finder blanks are undefined; valid bounds including zero are preserved", () => {
  for (const bounds of [
    { minPrice: "", maxPrice: "" },
    { minPrice: "  ", maxPrice: "\t" },
    { minPrice: null, maxPrice: undefined },
  ]) {
    const q = query(bounds);
    assert.equal(q.minPrice, undefined);
    assert.equal(q.maxPrice, undefined);
  }
  assert.equal(query({ minPrice: "", maxPrice: "30" }).maxPrice, 30);
  assert.equal(query({ minPrice: "30", maxPrice: "" }).minPrice, 30);
  assert.equal(query({ minPrice: 0, maxPrice: 0 }).maxPrice, 0);
  assert.equal(query({ minPrice: "20.5", maxPrice: "40" }).minPrice, 20.5);
  for (const input of [
    "abc",
    "NaN",
    "Infinity",
    "0x20",
    "1e3",
    -1,
    true,
    [20],
    {},
    Infinity,
    NaN,
  ])
    assert.equal(
      finderSchema.safeParse({ categoryId: rule.categoryId, minPrice: input })
        .success,
      false,
    );
  assert.equal(
    finderSchema.safeParse({
      categoryId: rule.categoryId,
      minPrice: 40,
      maxPrice: 20,
    }).success,
    false,
  );
  assert.equal(query().sort, "expected");
  assert.equal(query().onlyExact, true);
  assert.equal(query().allowFallback, true);
});
test("a strong $30 harness outranks weak $100 harness despite lower commission per sale", () => {
  const result = rankItems(items, rule, query());
  const a = result.find((p) => p.asin === "MOCK000001")!,
    b = result.find((p) => p.asin === "MOCK000002")!;
  assert.equal(a.estimatedCommissionPerSale, 1.5);
  assert.equal(b.estimatedCommissionPerSale, 3);
  assert.ok(a.opportunityScore > b.opportunityScore);
  assert.ok(a.commissionWeightedPotential! > b.commissionWeightedPotential!);
  assert.ok(result.every((p) => p.categoryTier === 0));
  assert.ok(!result.some((p) => p.title.includes("Food")));
  assert.deepEqual(
    a.breakdown.map((x) => x.weight),
    [35, 25, 15, 10, 10, 5],
  );
  assert.equal(
    a.opportunityScore,
    Math.round(a.breakdown.reduce((s, x) => s + x.contribution, 0) * 100) / 100,
  );
});
test("category tiers beat high price, rate and every alternative sort", () => {
  const related = {
    ...items[5],
    price: 9999,
    commissionRate: 1,
    rating: 5,
    reviewCount: 100000,
  };
  for (const [sort] of sortOptions) {
    const r = rankItems(
      [items[0], related, items[4]],
      rule,
      query({ onlyExact: false, sort }),
    );
    assert.equal(r.length, 2);
    assert.equal(r[0].asin, items[0].asin);
    assert.equal(r[1].asin, related.asin);
  }
  assert.equal(
    categoryMatch(
      {
        ...items[0],
        title: "Cat Harness",
        nodes: [{ id: "cat", name: "Cat Harnesses", salesRank: 1 }],
      },
      rule,
    ),
    null,
  );
  assert.equal(
    categoryMatch(
      { ...items[0], title: "Dog Harness Replacement Clip", nodes: [] },
      rule,
    ),
    null,
  );
});
test("fallback stays bounded and is used only when no eligible exact matches exist", () => {
  assert.equal(rankItems([items[5], items[4]], rule, query()).length, 1);
  assert.equal(
    rankItems([items[5], items[4]], rule, query({ allowFallback: false }))
      .length,
    0,
  );
  assert.equal(rankItems([items[0], items[5]], rule, query()).length, 1);
  assert.equal(rankItems(items, rule, query({ maxPrice: 25 })).length, 1);
  assert.ok(
    rankItems(items, rule, query({ minPrice: "", maxPrice: 30 })).every(
      (p) => p.price !== null && p.price <= 30,
    ),
  );
  assert.ok(
    rankItems(items, rule, query({ minPrice: 30, maxPrice: "" })).every(
      (p) => p.price !== null && p.price >= 30,
    ),
  );
  assert.equal(rankItems([items[3]], rule, query({ minRating: 0 })).length, 0);
  assert.equal(rankItems([items[3]], rule, query({ minReviews: 0 })).length, 0);
});
test("missing signals remain null and category/currency normalization is isolated", () => {
  const result = rankItems([items[0], items[3]], rule, query());
  const missing = result.find((p) => p.asin === items[3].asin)!;
  assert.equal(missing.price, null);
  assert.equal(missing.rating, null);
  assert.equal(missing.reviewCount, null);
  assert.equal(missing.estimatedCommissionPerSale, null);
  for (const label of [
    "Estimated Commission Per Sale",
    "Rating Score",
    "Review Strength",
    "Price Competitiveness",
  ]) {
    const part = missing.breakdown.find((x) => x.label === label)!;
    assert.equal(part.score, null);
    assert.equal(part.contribution, 0);
  }
  assert.equal(missing.signalCoverage, 15);
  assert.equal(missing.conversionPotential, null);
  assert.match(missing.conversionBasis, /not a conversion rate/);
  const base = rankItems([items[0]], rule, query())[0];
  const foreign = { ...items[1], currency: "EUR", price: 10000 };
  assert.equal(
    rankItems([items[0], foreign], rule, query()).find(
      (p) => p.asin === items[0].asin,
    )!.opportunityScore,
    base.opportunityScore,
  );
});
test("only sourced, fresh, bounded observations replace proxies; actual EPC is preferred", () => {
  const now = Date.now();
  const p: SitePerformance = {
    affiliateClicks: 200,
    outboundCtr: null,
    observedConversionRate: 0.2,
    observedEarnings: 60,
    earningsPerClick: 0.3,
    source: "Authorized account reporting",
    measuredAt: new Date(now - 1000).toISOString(),
    windowStart: new Date(now - 10 * 86400000).toISOString(),
    windowEnd: new Date(now - 86400000).toISOString(),
  };
  assert.equal(validPerformance(p), true);
  assert.equal(validPerformance({ ...p, source: null }), false);
  assert.equal(
    validPerformance({ ...p, measuredAt: new Date(now + 10000).toISOString() }),
    false,
  );
  const saved = new Map([
    [items[0].asin, { id: "a", performance: p }],
    [
      items[1].asin,
      {
        id: "b",
        performance: {
          ...p,
          observedConversionRate: 0.01,
          earningsPerClick: 0.02,
        },
      },
    ],
  ]);
  const result = rankItems(items.slice(0, 2), rule, query(), saved),
    a = result.find((x) => x.asin === items[0].asin)!,
    b = result.find((x) => x.asin === items[1].asin)!;
  assert.equal(a.conversionPotential, 100);
  assert.equal(b.conversionPotential, 5);
  assert.ok(Math.abs(a.commissionWeightedPotential! - 0.3) < 1e-12);
  assert.match(a.breakdown[1].basis, /observed earnings per click/);
  assert.equal(a.breakdown[1].score, 100);
  assert.equal(a.alreadyImported, true);
  const stale = rankItems(
    [items[0]],
    rule,
    query(),
    new Map([
      [items[0].asin, { id: "a", performance: { ...p, source: null } }],
    ]),
  )[0];
  assert.match(stale.conversionBasis, /proxy/);
});
const raw = {
  asin: "B123456789",
  detailPageURL: "https://www.amazon.com/dp/B123456789?tag=test-20&x=1&x=2",
  itemInfo: {
    title: { displayValue: "Dog Harness" },
    byLineInfo: { brand: { displayValue: "Returned brand" } },
    features: { displayValues: ["Returned feature"] },
  },
  images: {
    primary: { large: { url: "https://m.media-amazon.com/images/I/test.jpg" } },
  },
  browseNodeInfo: {
    browseNodes: [
      {
        id: "123",
        displayName: "Dog Harnesses",
        salesRank: 5,
        ancestor: { id: "456", displayName: "Dogs" },
      },
    ],
  },
  offersV2: {
    listings: [
      {
        isBuyBoxWinner: true,
        price: { money: { amount: 30, currency: "USD" } },
        availability: { type: "IN_STOCK" },
      },
    ],
  },
};
test("official camel-case offersV2 normalization preserves returned URLs and missing values", () => {
  const p = normalizeItem(raw, "www.amazon.com")!;
  assert.equal(p.price, 30);
  const missingCurrency = normalizeItem(
    { ...raw, offersV2: { listings: [{ price: { money: { amount: 30 } } }] } },
    "www.amazon.com",
  )!;
  assert.equal(missingCurrency.currency, null);
  assert.equal(missingCurrency.price, null);
  assert.equal(p.availability, "IN_STOCK");
  assert.equal(p.rating, null);
  assert.equal(p.reviewCount, null);
  assert.equal(p.commissionRate, null);
  assert.equal(p.affiliateUrl, raw.detailPageURL);
  assert.equal(p.nodes.length, 2);
  assert.equal(
    normalizeItem(
      {
        ...raw,
        offersV2: {
          listings: [
            {
              violatesMAP: true,
              price: { money: { amount: 30, currency: "USD" } },
            },
          ],
        },
      },
      "www.amazon.com",
    )!.price,
    null,
  );
  const invalid = normalizeItem(
    { ...raw, customerReviews: { starRating: { value: 8 }, count: -1 } },
    "www.amazon.com",
  )!;
  assert.equal(invalid.rating, null);
  assert.equal(invalid.reviewCount, null);
  assert.equal(
    normalizeItem(
      { ...raw, detailPageURL: "https://evil.example/dp/B123456789" },
      "www.amazon.com",
    ),
    null,
  );
  assert.equal(
    amazonImage("https://m.media-amazon.com.evil.example/a.jpg"),
    null,
  );
  assert.equal(amazonImage("http://m.media-amazon.com/a.jpg"), null);
  assert.equal(
    normalizeResponse(
      { searchResult: { items: [raw, {}] }, errors: [{ code: "Partial" }] },
      "www.amazon.com",
      "search",
    ).partialErrors,
    1,
  );
  assert.throws(() =>
    normalizeResponse(
      { errors: [{ message: "Failure" }] },
      "www.amazon.com",
      "search",
    ),
  );
});
test("sync whitelist and commission evidence prevent editorial writes and invented rates", () => {
  const patch = managedSyncPatch(items[0], [
    "price",
    "availability",
    "images",
    "brand",
  ]);
  for (const key of [
    "seo",
    "aeo",
    "description",
    "shortDescription",
    "pros",
    "cons",
    "bestFor",
    "notIdealFor",
    "title",
  ])
    assert.ok(!(key in patch));
  assert.equal(patch.estimatedCommissionPerSale, 1.5);
  assert.ok(!("price" in managedSyncPatch(items[0], [])));
  assert.equal(
    ruleSchema.safeParse({ ...rule, commissionRate: 0.05 }).success,
    false,
  );
  assert.equal(
    ruleSchema.safeParse({
      ...rule,
      commissionRate: 0.05,
      commissionSource:
        "https://affiliate-program.amazon.com/help/operating/policies",
      commissionVerifiedAt: new Date(Date.now() - 86400000).toISOString(),
      commissionValidUntil: new Date(Date.now() + 86400000).toISOString(),
    }).success,
    true,
  );
});
