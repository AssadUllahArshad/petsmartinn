import { test } from "node:test";
import assert from "node:assert/strict";
import { queryFrom } from "../lib/catalog-query";

test("blank minimum price imposes no lower constraint", () => {
  for (const min of [undefined, "", " ", "\t\n"])
    assert.deepEqual(
      [queryFrom({ min, max: "30" }).min, queryFrom({ min, max: "30" }).max],
      [undefined, 30],
    );
});
test("blank maximum price imposes no upper constraint", () => {
  for (const max of [undefined, "", " ", "\t\n"])
    assert.deepEqual(
      [queryFrom({ min: "20", max }).min, queryFrom({ min: "20", max }).max],
      [20, undefined],
    );
});
test("both blank price fields impose no price constraints", () => {
  for (const params of [{}, { min: "", max: "" }, { min: "  ", max: "\n" }]) {
    const q = queryFrom(params);
    assert.equal(q.min, undefined);
    assert.equal(q.max, undefined);
  }
});
test("valid ranges preserve decimals and explicit zero", () => {
  for (const [min, max, expectedMin, expectedMax] of [
    ["0", "0", 0, 0],
    ["0", "34.99", 0, 34.99],
    [" 20.50 ", "100", 20.5, 100],
    [".50", "1e2", 0.5, 100],
    ["25", "25", 25, 25],
    ["100", "20", 100, 20],
  ] as const) {
    const q = queryFrom({ min, max });
    assert.equal(q.min, expectedMin);
    assert.equal(q.max, expectedMax);
  }
});
test("invalid price input is ignored without discarding a valid other bound", () => {
  for (const invalid of [
    "abc",
    "20 dollars",
    "NaN",
    "Infinity",
    "-Infinity",
    "-1",
    "0x10",
    "1,000",
    "1.2.3",
    "1e309",
    "9007199254740992",
    ["20"],
    ["20", "30"],
    [],
  ]) {
    const lower = queryFrom({ min: invalid, max: "40" });
    assert.equal(lower.min, undefined, String(invalid));
    assert.equal(lower.max, 40);
    const upper = queryFrom({ min: "10", max: invalid });
    assert.equal(upper.min, 10);
    assert.equal(upper.max, undefined, String(invalid));
    const both = queryFrom({ min: invalid, max: invalid });
    assert.equal(both.min, undefined);
    assert.equal(both.max, undefined);
  }
});
test("other catalog options stay valid and unsafe pagination is rejected", () => {
  assert.deepEqual(
    queryFrom({
      q: "dog harness",
      brand: "trail-and-tail",
      min: "20",
      max: "40",
      rating: "4.5",
      sort: "price-asc",
      page: "2",
    }),
    {
      q: "dog harness",
      brand: "trail-and-tail",
      min: 20,
      max: 40,
      rating: 4.5,
      sort: "price-asc",
      page: 2,
    },
  );
  for (const page of ["", "abc", "-1", "Infinity", "1e10", ["2", "3"]])
    assert.equal(queryFrom({ page }).page, 1);
  assert.equal(queryFrom({ page: "2.9" }).page, 2);
  assert.equal(queryFrom({ page: "0" }).page, 1);
  assert.equal(queryFrom({ rating: "6" }).rating, undefined);
  assert.equal(queryFrom({ sort: "unknown" }).sort, undefined);
  assert.equal(
    queryFrom({ q: ["dog", "cat"], brand: ["a", "b"] }).q,
    undefined,
  );
});
