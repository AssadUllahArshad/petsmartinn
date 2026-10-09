import type { ImportRule } from "./types";
const categories: Record<string, string> = {
  harnesses: "harnesses",
  harness: "harnesses",
  "no-pull-harnesses": "no-pull-harnesses",
  "no-pull-harness": "no-pull-harnesses",
  "walking-harnesses": "walking-harnesses",
  "car-harnesses": "car-harnesses",
  leashes: "leashes",
  clothing: "clothing",
  hoodies: "hoodies",
  "paw-protection": "paw-protection",
  "dog-socks": "socks",
  socks: "socks",
  "non-slip-socks": "non-slip-socks",
  "paw-balm": "paw-balm",
  "paw-pads": "paw-pads",
  "paw-wax": "paw-wax",
  "paw-boots": "paw-boots",
  "dog-boots": "paw-boots",
  "car-safety": "car-safety",
  "seat-belts": "seat-belts",
  dogs: "dogs",
  cats: "cats",
};
export function mockCategoryPath(
  rule: Pick<ImportRule, "categoryPath" | "categoryName">,
) {
  const slug = rule.categoryPath.split("/").at(-1) || "";
  const name = rule.categoryName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const key = categories[slug] || categories[name];
  if (!key) return null;
  if (key === "dogs" || key === "cats") return "/" + key;
  return (rule.categoryPath.startsWith("/cats") ? "/cats/" : "/dogs/") + key;
}
