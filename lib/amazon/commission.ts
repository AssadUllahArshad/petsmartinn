import type { AmazonItem, ImportRule } from "./types";
export function applyCommissionEvidence(
  items: AmazonItem[],
  rule: ImportRule,
  mockMode: boolean,
  now = Date.now(),
) {
  if (items.some((item) => item.mock !== mockMode))
    throw new Error("Mock fixtures and live Amazon data cannot be mixed");
  const rate = rule.commissionRate;
  const valid =
    rate !== null &&
    Number.isFinite(rate) &&
    rate >= 0 &&
    rate <= 1 &&
    rule.commissionSource &&
    rule.commissionVerifiedAt &&
    Date.parse(rule.commissionVerifiedAt) <= now &&
    rule.commissionValidUntil &&
    Date.parse(rule.commissionValidUntil) > now;
  return items.map((item) =>
    mockMode
      ? {
          ...item,
          commissionSource: "Simulated fixture commission; not an Amazon rate",
        }
      : {
          ...item,
          commissionRate: valid ? rate : null,
          commissionSource: valid ? rule.commissionSource : null,
        },
  );
}
