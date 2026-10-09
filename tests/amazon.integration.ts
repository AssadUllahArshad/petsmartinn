import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { db } from "../lib/db";
import {
  searchAmazon,
  importAmazon,
  excludeAmazon,
  syncAmazon,
  getRule,
} from "../services/amazon/store";
import { publicAmazonConfig, amazonConfig } from "../services/amazon/config";
import { expireAmazonCache } from "../services/amazon/cache";
import { mutate } from "../lib/admin/mutations";
import { demoProducts } from "../lib/demo";
import { GET } from "../app/go/[productId]/route";
import {
  searchCreators,
  getCreators,
  AmazonApiError,
} from "../services/amazon/creators";
const stamp = Date.now();
const categoryId = "amazon-test-" + stamp;
const products: string[] = [];
const batchIds: string[] = [];
let ownerId: string;
const beforeEnv = { ...process.env };
const beforeFetch = globalThis.fetch;
after(async () => {
  globalThis.fetch = beforeFetch;
  for (const name of Object.keys(process.env))
    if (name.startsWith("AMAZON_")) {
      if (beforeEnv[name] === undefined) delete process.env[name];
      else process.env[name] = beforeEnv[name];
    }
  await db.product.deleteMany({ where: { id: { in: products } } });
  await db.amazonExclusion.deleteMany({ where: { categoryId } });
  await db.amazonSearchBatch.deleteMany({ where: { id: { in: batchIds } } });
  await db.amazonImportRule.deleteMany({ where: { categoryId } });
  await db.amazonLog.deleteMany({ where: { categoryId } });
  await db.category.deleteMany({ where: { id: categoryId } });
  await db.$disconnect();
});
test("mock search, batch ownership, draft import, concurrent deduplication, exclusion and protected sync", async () => {
  process.env.AMAZON_USE_MOCK_DATA = "true";
  process.env.AMAZON_MARKETPLACE = "www.amazon.com";
  const owner = await db.adminUser.findFirstOrThrow({
    where: { role: "OWNER" },
  });
  ownerId = owner.id;
  await db.category.create({
    data: {
      id: categoryId,
      name: "Harnesses",
      slug: categoryId,
      path: "/dogs/" + categoryId,
      status: "DRAFT",
    },
  });
  const query = {
    categoryId,
    minPrice: "",
    maxPrice: "",
    keywords: "harnesses",
  };
  const batch = await searchAmazon(query, owner.id);
  batchIds.push(batch.batchId);
  assert.equal(batch.mock, true);
  assert.ok(batch.results.length >= 4);
  assert.ok(!batch.results.some((p) => p.title.includes("Food")));
  const selection = { batchId: batch.batchId, asins: ["MOCK000002"] };
  await assert.rejects(
    importAmazon(selection, "another-admin"),
    /another administrator/,
  );
  await assert.rejects(
    importAmazon({ ...selection, asins: ["B000000000"] }, owner.id),
    /authorized search preview/,
  );
  assert.equal(
    await db.product.count({ where: { amazonAsin: "MOCK000002" } }),
    0,
    "Dedicated test ASIN must not already be imported",
  );
  const concurrent = await Promise.all([
    importAmazon(selection, owner.id),
    importAmazon(selection, owner.id),
  ]);
  assert.equal(
    concurrent.reduce((s, r) => s + r.imported.length, 0),
    1,
  );
  assert.equal(
    concurrent.reduce((s, r) => s + r.duplicates.length, 0),
    1,
  );
  const p = await db.product.findUniqueOrThrow({
    where: { amazonAsin: "MOCK000002" },
    include: { categories: true },
  });
  products.push(p.id);
  assert.equal(p.status, "DRAFT");
  assert.equal(p.source, "AMAZON_MOCK");
  assert.equal(p.isDemo, true);
  assert.equal(Number(p.amazonCommissionRate), 0.03);
  assert.equal(Number(p.estimatedCommissionPerSale), 3);
  assert.equal(batch.results.length, 20);
  assert.ok(
    batch.results.every((item) => item.mock && item.categoryTier === 0),
  );
  assert.equal(p.observedConversionRate, null);
  assert.equal(p.observedEarnings, null);
  assert.equal(p.earningsPerClick, null);
  assert.equal(p.categories[0].categoryId, categoryId);
  const draft = await GET(new Request("http://localhost:3001/go/" + p.id), {
    params: Promise.resolve({ productId: p.id }),
  });
  assert.equal(draft.status, 404);
  assert.equal(
    await db.affiliateClick.count({ where: { productId: p.id } }),
    0,
    "Draft mock redirects must not record public clicks",
  );
  const editable = {
    ...demoProducts[0],
    ...p,
    price: Number(p.price),
    oldPrice: null,
    categoryIds: [categoryId],
    gallery: [],
    relatedProductIds: [],
    seo: { title: "Manual SEO", description: "Manual meta" },
    shortDescription: "Manual summary",
    description: "Manual custom description",
    pros: ["Manual pro"],
    cons: ["Manual con"],
    bestFor: "Manual best for",
    notIdealFor: "Manual not ideal",
  };
  await mutate("products", p.id, editable, owner);
  await assert.rejects(
    mutate("products", p.id, { ...editable, status: "PUBLISHED" }, owner),
    /Mock Amazon imports/,
  );
  await db.product.update({
    where: { id: p.id },
    data: { price: 1, amazonBrandName: "Old brand" },
  });
  const synced = await syncAmazon([p.id], owner.id);
  assert.equal(synced.synced, 1);
  const after = await db.product.findUniqueOrThrow({ where: { id: p.id } });
  assert.equal(Number(after.price), 100);
  assert.deepEqual(after.seo, editable.seo);
  assert.equal(after.shortDescription, editable.shortDescription);
  assert.equal(after.description, editable.description);
  assert.deepEqual(after.pros, editable.pros);
  assert.deepEqual(after.cons, editable.cons);
  assert.equal(after.bestFor, editable.bestFor);
  assert.equal(after.notIdealFor, editable.notIdealFor);
  await excludeAmazon(
    { batchId: batch.batchId, asins: ["MOCK000003"] },
    owner.id,
  );
  await assert.rejects(
    importAmazon({ batchId: batch.batchId, asins: ["MOCK000003"] }, owner.id),
    /excluded/,
  );
  const second = await searchAmazon(query, owner.id);
  batchIds.push(second.batchId);
  assert.ok(!second.results.some((p) => p.asin === "MOCK000003"));
  assert.equal(
    second.results.find((p) => p.asin === "MOCK000002")!.alreadyImported,
    true,
  );
  // Explicit integration fixture: verify unchanged /go flow with a genuine-format URL, then clear it.
  const url = "https://www.amazon.com/dp/B123456789?tag=test-20&x=1&x=2";
  await db.product.update({
    where: { id: p.id },
    data: {
      source: "AMAZON",
      amazonTitleManaged: true,
      affiliateUrl: url,
      amazonAffiliateUrl: url,
      status: "PUBLISHED",
    },
  });
  await mutate(
    "products",
    p.id,
    {
      ...editable,
      title: "Manual reviewed harness",
      affiliateUrl: url,
      status: "PUBLISHED",
    },
    owner,
  );
  assert.equal(
    (await db.product.findUniqueOrThrow({ where: { id: p.id } }))
      .amazonTitleManaged,
    false,
  );
  const redirect = await GET(
    new Request("http://localhost:3001/go/" + p.id + "?source=/test"),
    { params: Promise.resolve({ productId: p.id }) },
  );
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), url);
  assert.equal(
    await db.affiliateClick.count({ where: { productId: p.id } }),
    1,
  );
  await db.product.update({
    where: { id: p.id },
    data: { amazonExpiresAt: new Date(Date.now() - 1000) },
  });
  await expireAmazonCache();
  const expired = await db.product.findUniqueOrThrow({ where: { id: p.id } });
  assert.equal(expired.price, null);
  assert.equal(expired.mainImage, "");
  assert.equal(expired.title, "Manual reviewed harness");
  assert.equal(expired.description, editable.description);
  assert.deepEqual(expired.seo, editable.seo);
  assert.equal(expired.amazonSyncStatus, "STALE");
  await db.amazonSearchBatch.update({
    where: { id: batch.batchId },
    data: { expiresAt: new Date(Date.now() - 1) },
  });
  await assert.rejects(importAmazon(selection, owner.id), /expired/);
});
test("Creators HTTP adapter uses official OAuth/API contracts, token reuse and sanitized errors", async () => {
  process.env.AMAZON_USE_MOCK_DATA = "false";
  process.env.AMAZON_CREATOR_CREDENTIAL_ID = "integration-only-id";
  process.env.AMAZON_CREATOR_CREDENTIAL_SECRET = "integration-only-secret";
  process.env.AMAZON_CREATOR_CREDENTIAL_VERSION = "3.1";
  process.env.AMAZON_PARTNER_TAG = "integration-20";
  process.env.AMAZON_ANALYSIS_APPROVED = "false";
  const config = publicAmazonConfig();
  assert.equal(config.configured, true);
  assert.ok(!JSON.stringify(config).includes("integration-only-secret"));
  assert.ok(!JSON.stringify(config).includes("integration-only-id"));
  await assert.rejects(
    searchAmazon({ categoryId }, ownerId),
    /analysis approval/,
  );
  const rule = await getRule(categoryId);
  const calls: { url: string; options: RequestInit }[] = [];
  let fail = false;
  globalThis.fetch = async (input, options) => {
    const url = String(input);
    calls.push({ url, options: options! });
    if (url.endsWith("/auth/o2/token"))
      return Response.json({
        access_token: "integration-only-token",
        expires_in: 3600,
      });
    if (fail)
      return Response.json(
        { error: "integration-only-secret integration-only-token" },
        { status: 400 },
      );
    const item = {
      asin: "B123456789",
      detailPageURL: "https://www.amazon.com/dp/B123456789?tag=integration-20",
      itemInfo: { title: { displayValue: "Returned Dog Harness" } },
      offersV2: {
        listings: [{ price: { money: { amount: 30, currency: "USD" } } }],
      },
    };
    return Response.json(
      url.endsWith("searchItems")
        ? { searchResult: { items: [item] } }
        : { itemsResult: { items: [item] } },
    );
  };
  const searched = await searchCreators(rule, "dog harness", 20);
  assert.equal(searched.items[0].price, 30);
  assert.equal(searched.items[0].rating, null);
  assert.equal(searched.items[0].commissionRate, null);
  const got = await getCreators(["B123456789"]);
  assert.equal(got.items.length, 1);
  assert.equal(calls.filter((c) => c.url.endsWith("/auth/o2/token")).length, 1);
  assert.equal(calls[0].url, "https://api.amazon.com/auth/o2/token");
  assert.deepEqual(JSON.parse(String(calls[0].options.body)), {
    grant_type: "client_credentials",
    client_id: "integration-only-id",
    client_secret: "integration-only-secret",
    scope: "creatorsapi::default",
  });
  for (const call of calls.slice(1)) {
    assert.ok(call.url.startsWith("https://creatorsapi.amazon/catalog/v1/"));
    const headers = new Headers(call.options.headers);
    assert.equal(headers.get("authorization"), "Bearer integration-only-token");
    assert.equal(headers.get("x-marketplace"), "www.amazon.com");
    const body = JSON.parse(String(call.options.body));
    assert.equal(body.partnerTag, "integration-20");
    assert.ok(body.resources.includes("offersV2.listings.price"));
    assert.ok(
      !body.resources.some((s: string) => /commission|customerReviews/.test(s)),
    );
    assert.equal(call.options.cache, "no-store");
  }
  fail = true;
  await assert.rejects(
    getCreators(["B123456789"]),
    (e: unknown) =>
      e instanceof AmazonApiError && !e.message.includes("integration-only"),
  );
  assert.equal(amazonConfig().mock, false);
  globalThis.fetch = beforeFetch;
  await db.rateLimit.deleteMany({
    where: {
      key: createHash("sha256").update("amazon:creators:global").digest("hex"),
    },
  });
});
