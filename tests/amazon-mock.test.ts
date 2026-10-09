import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mockItems } from "../services/amazon/mock";
import { defaultRule } from "../lib/amazon/default-rule";
import { categoryMatch, rankItems } from "../lib/amazon/ranking";
import { finderSchema } from "../lib/amazon/validation";
import { applyCommissionEvidence } from "../lib/amazon/commission";
const rule = (name: string, path: string) =>
  defaultRule({ id: path, name, path }, "www.amazon.com");
test("Paw Protection fixtures depict actual paw product types with matching imagery", () => {
  const r = rule("Paw Protection", "/dogs/paw-protection"),
    items = mockItems(r);
  assert.equal(items.length, 20);
  assert.deepEqual(
    items.slice(0, 5).map((p) => p.image),
    ["/images/retail/socks.webp", "/images/retail/balm.webp", null, null, null],
  );
  for (const p of items) {
    assert.match(p.title, /Paw Socks|Paw Balm|Paw Boots|Paw Pads|Paw Wax/);
    assert.ok(!p.title.includes("Harness"));
    assert.ok(!p.images.some((url) => url.includes("harness")));
    assert.equal(categoryMatch(p, r)?.tier, 0);
    assert.match(categoryMatch(p, r)!.basis, /Simulated fixture taxonomy/);
    for (const image of p.images)
      assert.ok(existsSync(process.cwd() + "/public" + image));
  }
});
test("narrow and broad mock categories retain independent product taxonomy", () => {
  const cases: [string, string, RegExp, string | null][] = [
    ["Dog socks", "/dogs/socks", /Paw Socks/, "socks"],
    ["Non slip socks", "/dogs/non-slip-socks", /Paw Socks/, "socks"],
    ["Paw balm", "/dogs/paw-balm", /Paw Balm/, "balm"],
    ["Paw wax", "/dogs/paw-wax", /Paw Wax/, null],
    ["Paw pads", "/dogs/paw-pads", /Paw Pads/, null],
    ["Paw boots", "/dogs/paw-boots", /Paw Boots/, null],
    ["Hoodies", "/dogs/clothing/hoodies", /Hoodie/, "hoodie"],
    ["Clothing", "/dogs/clothing", /Hoodie|Jacket|Coat/, "hoodie"],
    ["Leashes", "/dogs/leashes", /Leash/, "leash"],
    ["Car harnesses", "/dogs/car-harnesses", /Car Harness/, "harness"],
    ["Seat belts", "/dogs/seat-belts", /Seat Belt/, null],
  ];
  const seen = new Set<string>();
  for (const [name, path, title, image] of cases) {
    const r = rule(name, path),
      items = mockItems(r);
    assert.ok(items.length);
    for (const p of items) {
      assert.match(p.title, title);
      const pictured =
        path === "/dogs/clothing"
          ? p.title.includes("Hoodie")
          : path === "/dogs/leashes"
            ? p.title.includes("Rope")
            : Boolean(image);
      assert.equal(p.image, pictured ? `/images/retail/${image}.webp` : null);
      assert.equal(categoryMatch(p, r)?.tier, 0);
      assert.match(p.asin, /^[A-Z0-9]{10}$/);
      assert.ok(!seen.has(p.asin));
      seen.add(p.asin);
    }
  }
  for (const [name, path] of [
    ["Dogs", "/dogs"],
    ["Cats", "/cats"],
    ["Car safety", "/dogs/car-safety"],
  ]) {
    const r = rule(name, path);
    assert.ok(mockItems(r).every((p) => categoryMatch(p, r)?.tier === 0));
  }
  assert.deepEqual(
    mockItems(rule("Unknown category", "/dogs/unknown-category")),
    [],
  );
});
test("related mock products cannot become exact by borrowing terms or browse IDs", () => {
  const waxRule = {
    ...rule("Paw wax", "/dogs/paw-wax"),
    exactTerms: ["paw"],
    browseNodeId: "pretend-selected-node",
    fallbacks: [{ label: "Related Paw Balm", terms: ["paw balm"] }],
  };
  const balm = mockItems(rule("Paw balm", "/dogs/paw-balm"))[0];
  const match = categoryMatch(
    {
      ...balm,
      nodes: [
        ...balm.nodes,
        { id: "pretend-selected-node", name: "Paw Wax", salesRank: 1 },
      ],
    },
    waxRule,
  )!;
  assert.equal(match.tier, 1);
  assert.equal(match.label, "Related Paw Balm");
  const query = finderSchema.parse({
    categoryId: waxRule.categoryId,
    onlyExact: false,
    maxResults: 100,
  });
  const ranked = rankItems([balm, ...mockItems(waxRule)], waxRule, query);
  assert.equal(ranked.at(-1)!.categoryTier, 1);
  assert.ok(ranked.at(-1)!.breakdown[2].score! < 100);
  const harnessRule = rule("Harnesses", "/dogs/harnesses");
  const leash = mockItems(harnessRule).find((p) => p.asin === "MOCK000006")!;
  assert.equal(leash.image, "/images/retail/leash.webp");
  assert.equal(categoryMatch(leash, harnessRule)?.tier, 4);
});
test("mock commissions remain simulated even with a verified live rule; modes cannot mix", () => {
  const r = {
    ...rule("Paw Protection", "/dogs/paw-protection"),
    commissionRate: 0.99,
    commissionSource: "https://example.com/real-authorized-rate",
    commissionVerifiedAt: new Date(Date.now() - 86400000).toISOString(),
    commissionValidUntil: new Date(Date.now() + 86400000).toISOString(),
  };
  const mock = mockItems(r)[0];
  const simulated = applyCommissionEvidence([mock], r, true)[0];
  assert.equal(simulated.commissionRate, 0.05);
  assert.match(
    simulated.commissionSource!,
    /Simulated fixture commission; not an Amazon rate/,
  );
  const live = {
    ...mock,
    mock: false,
    commissionRate: null,
    commissionSource: null,
    mockCategoryPaths: undefined,
  };
  assert.equal(
    applyCommissionEvidence([live], r, false)[0].commissionRate,
    0.99,
  );
  assert.throws(
    () => applyCommissionEvidence([mock], r, false),
    /cannot be mixed/,
  );
  assert.throws(
    () => applyCommissionEvidence([live], r, true),
    /cannot be mixed/,
  );
  assert.throws(
    () => applyCommissionEvidence([mock, live], r, true),
    /cannot be mixed/,
  );
});

test("major mock catalogs have twenty exact products with diverse simulated signals", () => {
  for (const [name, path] of [
    ["Paw Protection", "/dogs/paw-protection"],
    ["Harnesses", "/dogs/harnesses"],
    ["Leashes", "/dogs/leashes"],
    ["Clothing", "/dogs/clothing"],
    ["Car Safety", "/dogs/car-safety"],
  ]) {
    const r = rule(name, path),
      fixtures = mockItems(r),
      exact = fixtures.filter((p) => categoryMatch(p, r)?.tier === 0);
    assert.equal(exact.length, 20);
    assert.equal(new Set(fixtures.map((p) => p.asin)).size, fixtures.length);
    for (const field of [
      "price",
      "commissionRate",
      "rating",
      "reviewCount",
      "availability",
    ] as const)
      assert.ok(new Set(exact.map((p) => p[field])).size >= 4, field);
    assert.ok(new Set(exact.map((p) => p.features.join(" "))).size >= 4);
    const ranked = rankItems(
      fixtures,
      r,
      finderSchema.parse({ categoryId: r.categoryId }),
    );
    assert.equal(ranked.length, 20);
    assert.ok(ranked.every((p) => p.mock && p.categoryTier === 0));
    for (const p of ranked) {
      assert.equal(
        p.estimatedCommissionPerSale,
        p.price === null || p.commissionRate === null
          ? null
          : p.price * p.commissionRate,
      );
      assert.ok(Number.isFinite(p.opportunityScore));
      assert.ok(p.opportunityScore >= 0 && p.opportunityScore <= 100);
    }
    const a = ranked.find((p) => p.price === 30)!,
      b = ranked.find((p) => p.price === 100)!;
    assert.ok(a.opportunityScore > b.opportunityScore);
    assert.ok(ranked.indexOf(a) < ranked.indexOf(b));
    const keyword = rankItems(
      fixtures,
      r,
      finderSchema.parse({ categoryId: r.categoryId, keywords: "reflective" }),
    );
    assert.ok(new Set(keyword.map((p) => p.keywordMatch)).size > 1);
  }
});
