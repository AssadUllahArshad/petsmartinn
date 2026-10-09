import { test } from "node:test";
import assert from "node:assert/strict";
import { safeUrl, productSchema, healthPublishError } from "../lib/validation";
import {
  affiliateDestination,
  safeSource,
  referrerHost,
} from "../services/affiliate";
import { serializeSchema, metadata } from "../lib/seo";
import { demoProducts } from "../lib/demo";
test("affiliate destination preserves tracking URL byte for byte", () => {
  const url =
    "https://www.amazon.com/dp/B123456789?tag=owner-20&subtag=a%2Fb&x=1&x=2#details";
  assert.equal(affiliateDestination(url), url);
  assert.equal(
    affiliateDestination("https://amzn.to/example?ref=a%20b"),
    "https://amzn.to/example?ref=a%20b",
  );
});
test("unsafe affiliate URLs are rejected", () => {
  for (const u of [
    "javascript:alert(1)",
    "data:text/html,x",
    "//evil.example",
    "https://user:pass@evil.example",
    "https://example.com\r\nX:bad",
    " https://example.com",
  ])
    assert.equal(safeUrl(u), false, u);
});
test("privacy keeps source paths and referrer hosts only", () => {
  assert.equal(
    safeSource("/product/harness?email=private"),
    "/product/harness",
  );
  assert.equal(safeSource("//external.example"), null);
  assert.equal(
    referrerHost("https://source.example/path?secret=private"),
    "source.example",
  );
});
test("health publication blocks missing author or veterinary review", () => {
  assert.ok(
    healthPublishError({
      type: "HEALTH",
      status: "PUBLISHED",
      sources: [],
      disclaimer: "",
    }),
  );
  assert.equal(
    healthPublishError({
      type: "HEALTH",
      status: "DRAFT",
      sources: [],
      disclaimer: "",
    }),
    null,
  );
  assert.equal(
    healthPublishError({
      type: "HEALTH",
      status: "PUBLISHED",
      authorId: "writer",
      reviewerId: "vet",
      reviewedAt: "2026-01-01",
      sources: [{}],
      disclaimer: "Consult your veterinarian.",
    }),
    null,
  );
});
test("schema serialization prevents script injection", () => {
  assert.equal(
    serializeSchema({ name: "</script><script>alert(1)</script>" }).includes(
      "<",
    ),
    false,
  );
});
test("metadata respects canonical and index control", () => {
  const m = metadata("Product", "Description", "/product/x", {
    title: "SEO title",
    canonical: "https://petsmartinn.com/product/x",
    noindex: true,
  });
  assert.equal(m.title, "SEO title");
  assert.deepEqual(m.alternates, {
    canonical: "https://petsmartinn.com/product/x",
  });
  assert.deepEqual(m.robots, { index: false, follow: true });
});
test("optional ratings and price accepted, and affiliate URL stays exact", () => {
  const p = demoProducts[0];
  const url = "https://example.com/?tag=owner-20&x=%2F";
  const v = productSchema.parse({
    ...p,
    brandId: null,
    affiliateUrl: url,
    categoryIds: [],
    relatedProductIds: [],
    gallery: [],
  });
  assert.equal(v.affiliateUrl, url);
  assert.equal(v.rating, null);
  assert.equal(v.reviewCount, null);
});
