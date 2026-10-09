import "server-only";
import { amazonConfig } from "./config";
import { normalizeResponse } from "@/lib/amazon/normalize";
import { rateLimit } from "@/lib/auth/rate-limit";
import type { ImportRule } from "@/lib/amazon/types";
export class AmazonApiError extends Error {
  constructor(
    public code:
      | "NOT_CONFIGURED"
      | "AUTH_ERROR"
      | "RATE_LIMIT"
      | "API_ERROR"
      | "NETWORK_ERROR",
    public status = 503,
  ) {
    super(
      code === "NOT_CONFIGURED"
        ? "Amazon Creators API is not configured. Configure server credentials or explicitly enable mock mode."
        : code === "RATE_LIMIT"
          ? "Amazon rate limit reached. Please try again shortly."
          : "Amazon Creators API request failed. Check connection settings and logs.",
    );
  }
}
const resources = [
  "itemInfo.title",
  "itemInfo.byLineInfo",
  "itemInfo.features",
  "images.primary.large",
  "images.variants.large",
  "browseNodeInfo.browseNodes",
  "browseNodeInfo.browseNodes.ancestor",
  "browseNodeInfo.browseNodes.salesRank",
  "offersV2.listings.price",
  "offersV2.listings.availability",
  "offersV2.listings.isBuyBoxWinner",
];
let tokenCache: { key: string; token: string; expires: number } | null = null;
let tokenPromise: Promise<string> | null = null;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function getToken() {
  const c = amazonConfig();
  if (!c.configured || !c.tokenEndpoint)
    throw new AmazonApiError("NOT_CONFIGURED");
  const key = c.credentialId + ":" + c.version;
  if (tokenCache?.key === key && tokenCache.expires > Date.now() + 60000)
    return tokenCache.token;
  if (tokenPromise) return tokenPromise;
  tokenPromise = (async () => {
    let r: Response;
    try {
      r = await fetch(c.tokenEndpoint!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Agent/PetsmartinnAmazonFinder",
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: c.credentialId,
          client_secret: c.credentialSecret,
          scope: "creatorsapi::default",
        }),
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
        redirect: "error",
      });
    } catch {
      throw new AmazonApiError("NETWORK_ERROR");
    }
    if (!r.ok)
      throw new AmazonApiError(
        r.status === 429 ? "RATE_LIMIT" : "AUTH_ERROR",
        r.status === 429 ? 429 : 502,
      );
    const body = await r.json().catch(() => null);
    if (
      !body ||
      typeof body.access_token !== "string" ||
      !body.access_token ||
      !Number.isFinite(body.expires_in) ||
      body.expires_in <= 0
    )
      throw new AmazonApiError("AUTH_ERROR", 502);
    tokenCache = {
      key,
      token: body.access_token,
      expires: Date.now() + Math.min(body.expires_in, 3600) * 1000,
    };
    return body.access_token;
  })();
  try {
    return await tokenPromise;
  } finally {
    tokenPromise = null;
  }
}
async function call(
  operation: "searchItems" | "getItems",
  payload: Record<string, unknown>,
  onRateLimit?: () => Promise<void>,
) {
  const c = amazonConfig();
  if (c.mock) throw new AmazonApiError("NOT_CONFIGURED");
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!(await rateLimit("amazon:creators:global", 1, 1))) {
      await wait(1100);
      if (!(await rateLimit("amazon:creators:global", 1, 1)))
        throw new AmazonApiError("RATE_LIMIT", 429);
    }
    const token = await getToken();
    let r: Response;
    try {
      r = await fetch(`https://creatorsapi.amazon/catalog/v1/${operation}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-marketplace": c.marketplace,
          "User-Agent": "Agent/PetsmartinnAmazonFinder",
        },
        body: JSON.stringify({
          ...payload,
          marketplace: c.marketplace,
          partnerTag: c.partnerTag,
          resources,
        }),
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
        redirect: "error",
      });
    } catch {
      throw new AmazonApiError("NETWORK_ERROR");
    }
    if (r.status === 401 && attempt === 0) {
      tokenCache = null;
      continue;
    }
    if (r.status === 429) {
      await onRateLimit?.();
      if (attempt < 2) {
        const seconds = Number(r.headers.get("retry-after"));
        await wait(
          Number.isFinite(seconds) && seconds > 0
            ? Math.min(seconds * 1000, 5000)
            : 1000 * 2 ** attempt,
        );
        continue;
      }
      throw new AmazonApiError("RATE_LIMIT", 429);
    }
    if (r.status >= 500 && attempt < 2) {
      await wait(1000 * 2 ** attempt);
      continue;
    }
    if (!r.ok) throw new AmazonApiError("API_ERROR", 502);
    const body = await r.json().catch(() => null);
    if (!body) throw new AmazonApiError("API_ERROR", 502);
    try {
      return normalizeResponse(
        body,
        c.marketplace,
        operation === "searchItems" ? "search" : "get",
      );
    } catch {
      throw new AmazonApiError("API_ERROR", 502);
    }
  }
  throw new AmazonApiError("API_ERROR", 502);
}
export async function searchCreators(
  rule: ImportRule,
  keywords: string,
  count: number,
  onRateLimit?: () => Promise<void>,
) {
  const items = [];
  let partialErrors = 0;
  for (let page = 1; page <= Math.ceil(count / 10); page++) {
    const r = await call(
      "searchItems",
      {
        keywords,
        searchIndex: rule.searchIndex,
        ...(rule.browseNodeId ? { browseNodeId: rule.browseNodeId } : {}),
        itemCount: 10,
        itemPage: page,
        sortBy: "Relevance",
      },
      onRateLimit,
    );
    items.push(...r.items);
    partialErrors += r.partialErrors;
    if (r.items.length < 10) break;
  }
  return { items, partialErrors };
}
export async function getCreators(
  asins: string[],
  onRateLimit?: () => Promise<void>,
) {
  if (asins.length > 10)
    throw new Error("Sync a maximum of 10 products at once");
  return call("getItems", { itemIds: asins, itemIdType: "ASIN" }, onRateLimit);
}
