import "server-only";
export const marketplaces = [
  "www.amazon.com",
  "www.amazon.co.uk",
  "www.amazon.ca",
  "www.amazon.de",
  "www.amazon.fr",
  "www.amazon.it",
  "www.amazon.es",
  "www.amazon.co.jp",
  "www.amazon.in",
  "www.amazon.com.au",
  "www.amazon.com.br",
  "www.amazon.com.mx",
  "www.amazon.nl",
  "www.amazon.com.be",
  "www.amazon.pl",
  "www.amazon.se",
  "www.amazon.sg",
  "www.amazon.ae",
  "www.amazon.sa",
  "www.amazon.com.tr",
  "www.amazon.eg",
  "www.amazon.ie",
];
export const credentialKeys = [
  "AMAZON_CREATOR_CREDENTIAL_ID",
  "AMAZON_CREATOR_CREDENTIAL_SECRET",
  "AMAZON_CREATOR_CREDENTIAL_VERSION",
  "AMAZON_PARTNER_TAG",
  "AMAZON_MARKETPLACE",
] as const;
export function amazonConfig() {
  const mock = process.env.AMAZON_USE_MOCK_DATA === "true";
  const marketplace = process.env.AMAZON_MARKETPLACE || "www.amazon.com";
  const missing = credentialKeys.filter((key) => !process.env[key]?.trim());
  const version = process.env.AMAZON_CREATOR_CREDENTIAL_VERSION || "";
  const tokenEndpoints: Record<string, string> = {
    "3.1": "https://api.amazon.com/auth/o2/token",
    "3.2": "https://api.amazon.co.uk/auth/o2/token",
    "3.3": "https://api.amazon.co.jp/auth/o2/token",
  };
  return {
    mock,
    marketplace,
    missing,
    analysisApproved: process.env.AMAZON_ANALYSIS_APPROVED === "true",
    configured:
      !missing.length &&
      !!tokenEndpoints[version] &&
      marketplaces.includes(marketplace),
    credentialId: process.env.AMAZON_CREATOR_CREDENTIAL_ID || "",
    credentialSecret: process.env.AMAZON_CREATOR_CREDENTIAL_SECRET || "",
    version,
    partnerTag: process.env.AMAZON_PARTNER_TAG || "",
    tokenEndpoint: tokenEndpoints[version] || null,
  };
}
export function publicAmazonConfig() {
  const c = amazonConfig();
  return {
    mock: c.mock,
    analysisApproved: c.analysisApproved,
    marketplace: c.marketplace,
    configured: c.configured,
    missing: c.missing,
    versionSupported: !!c.tokenEndpoint,
    marketplaceSupported: marketplaces.includes(c.marketplace),
  };
}
