import type { ImportRule } from "./types";
export function defaultRule(
  category: { id: string; name: string; path: string },
  marketplace: string,
): ImportRule {
  const harness = /harness/i.test(category.name);
  return {
    categoryId: category.id,
    marketplace,
    categoryName: category.name,
    categoryPath: category.path,
    searchIndex: "PetSupplies",
    browseNodeId: null,
    exactTerms: harness
      ? ["harness", "harnesses"]
      : [category.name.toLowerCase()],
    excludedTerms: harness
      ? [
          ...(category.path.startsWith("/dogs")
            ? ["cat harness"]
            : ["dog harness"]),
          "horse",
          "climbing",
          "camera",
          "human",
          "replacement",
          "adapter",
          "harness clip",
          "leash only",
        ]
      : [],
    fallbacks: harness
      ? [
          {
            label: "No-Pull Harnesses",
            terms: ["no pull harness", "no pull harnesses"],
          },
          {
            label: "Walking Harnesses",
            terms: ["walking harness", "walking harnesses"],
          },
          { label: "Car Harnesses", terms: ["car harness", "car harnesses"] },
          {
            label: "Dog Walking Gear",
            terms: ["dog walking gear", "dog leash"],
          },
        ]
      : [],
    commissionRate: null,
    commissionSource: null,
    commissionVerifiedAt: null,
    commissionValidUntil: null,
    syncFields: ["price", "availability", "images", "brand"],
  };
}
