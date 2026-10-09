# Amazon Product Finder

Open `/admin/amazon/product-finder` after signing in. The sidebar also links to imported products, category import rules, activity logs, and owner-only Amazon settings. Imports use the existing product editor and `/go/[productId]` tracking route. Every import starts as Draft; fictional mock imports cannot be published.

## Server setup

The five server variables are `AMAZON_CREATOR_CREDENTIAL_ID`, `AMAZON_CREATOR_CREDENTIAL_SECRET`, `AMAZON_CREATOR_CREDENTIAL_VERSION`, `AMAZON_PARTNER_TAG`, and `AMAZON_MARKETPLACE`. They belong in ignored `.env` or the deployment's secret environment, never `NEXT_PUBLIC_*`, source control, request responses, or browser storage. The settings screen exposes key names and boolean configuration status, not credential values.

`AMAZON_USE_MOCK_DATA=true` explicitly enables fictional local fixtures without network requests. No automatic mock fallback occurs on a live API error. Mock cards, commission rates, prices, availability, ratings and reviews are labeled simulated. Leave live credentials blank while testing mock mode. Set this flag to `false` for real catalog requests.

The adapter uses only Amazon's documented Creators API OAuth and catalog HTTP endpoints, not scraping or the deprecated PA-API. Versions 3.1 / 3.2 / 3.3 select the documented regional OAuth endpoint. Credentials can work globally, but the partner tag and access approval must cover the requested marketplace. See [official HTTP setup](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-curl) and [SearchItems](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/api-reference/operations/search-items).

Amazon's [content license](https://affiliate-program.amazon.com/help/operating/policies/) requires prior written approval for aggregating or analyzing Program Content. Live ranking is gated on the operator's confirmation `AMAZON_ANALYSIS_APPROVED=true`. Configure that only after obtaining approval covering this use. This application does not obtain account approval or verify it with Amazon.

Creators API's documented resource list supplies no commission rate resource. Live commission and estimated commission stay unknown until an owner saves a verified category rate with a source URL, verification date and expiry date. Rates must reflect the account, marketplace and actual Amazon product classification; do not copy mock rates. If a product's classification differs, exclude it or use an appropriately mapped rule. Missing or expired rate evidence produces no commission contribution. Ratings and review counts are used only if actually returned; the adapter does not request undocumented rating resources or fabricate missing values.

## Category ranking

The default sort is **Highest Expected Earnings**, with **Estimated Opportunity** displayed as the final metric. It is a category-relative heuristic, not guaranteed earnings or an estimated probability of purchase.

Estimated commission per sale = returned price × verified commission fraction. Six contributions sum to the final score:

| Component                     | Weight | Evidence                                                                                                                                                                          |
| ----------------------------- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conversion Potential          |    35% | Geometric index of available category-specific popularity rank, rating, review count, relative price, category and keyword relevance. At least one commercial signal is required. |
| Estimated Commission Per Sale |    25% | Relative to the highest commission in the same category tier and currency. Unknown rate or price stays unknown.                                                                   |
| Exact Category Relevance      |    15% | Mapped browse node or explicit category terms; approved fallback tiers score lower.                                                                                               |
| Rating Quality                |    10% | Returned rating / 5.                                                                                                                                                              |
| Review Strength               |    10% | Log-scaled returned review count, saturating at 10,000.                                                                                                                           |
| Price Competitiveness         |     5% | Lowest comparable returned price / product price.                                                                                                                                 |

Proxy formulas and weights are disclosed in each score breakdown. Missing component values remain null, contribute no score, and reduce visible signal coverage. Unknown is not converted to a fake price, rating, count or commission. The commission × potential diagnostic is not a monetary forecast when potential is a proxy index.

Every sort applies the category tier first. Harnesses never compete with unrelated dog food. Defaults require exact results, then use only the approved fallback list if no exact products pass the filters. The harness fallback order is No-Pull Harnesses → Walking Harnesses → Car Harnesses → Dog Walking Gear. Unlisted categories never become automatic fallback. Title/node term matching is an estimate; map verified browse nodes and review previews for stronger relevance evidence.

Blank numeric filters mean no constraint. Invalid numbers, negatives, arrays, out-of-range values and reversed ranges are rejected server-side. An item with missing data cannot satisfy a filter requiring that data. The six sort choices are expected opportunity, estimated commission, commission rate, rating, review count, and price.

## Import and sync

Search batches are server-owned, administrator-bound and expire after one hour. Import and exclude actions accept batch ID and ASIN only, not browser-supplied price, title, URL, score or category. A global unique ASIN constraint and concurrent duplicate handling preserve an existing product. Category-scoped exclusions can be restored in import rules.

Import preview shows title, destination category, primary keyword, commission evidence, opportunity and Draft status. Editorial text is left empty for manual review. The affiliate URL returned by Amazon is stored unchanged in both Amazon metadata and the existing `affiliateUrl` field; the unchanged `/go` route tracks only published products.

Sync writes only permitted price, availability, image URLs and brand fields. It never writes SEO title, meta description, summary, pros, cons, best for, not ideal for or custom description. An imported API title can refresh until the owner edits that title; then automatic title management stops. Field permissions are captured at import and intersected with the current category rule. Partial sync does not extend retention of older, unsynced data.

Live catalog cache expires within 24 hours. Image binaries are never stored or downloaded; Amazon images bypass Next's optimizer cache. Product/catalog reads clear expired data, and imports/searches also perform cleanup. Run `npm run amazon:expire` periodically through a deployment maintenance job so unused records and batches are purged too. Sync before publishing and periodically thereafter. Expiration clears Amazon price, rating, review count, image URLs and availability; manual editorial content stays intact. Managed API titles become an ASIN-based neutral title when expired. Public Amazon prices show synchronization timestamps and the purchase-price disclaimer.

Search, import, duplicate, exclusion, rule, sync, API-error and rate-limit events are recorded using sanitized messages. No tokens, secrets, raw request bodies or provider payloads are logged. Actions enforce authentication, same-origin requests, body limits and rate limits. Rule editing and settings are owner-only.

## Future actual performance

Nullable product fields support affiliate clicks, outbound CTR, observed conversion rate, observed earnings and earnings per click, plus reporting source, measurement date and reporting-window boundaries. Existing tracked click counts are read from the actual affiliate-click table; clicks alone do not imply impressions, sales or income.

There is no reporting-data ingestion yet. A future authorized reporting import must validate provenance, attribution, sample size, dates and currency before populating these fields. No fabricated conversion or earnings defaults exist. Sourced observations with valid windows and measurement dates within 30 days can replace conversion proxies; rates are normalized among measured peers in the same category, currency and window. Authorized observed EPC replaces the commission proxy contribution when available. Stale, unsourced, non-finite or out-of-range observations are ignored for ranking. Earnings/EPC must use the product's currency before storage.

## Validation

Run `npx prisma generate`, `npm run db:deploy`, `npm run lint`, `npm test`, `npm run test:db`, and `npm run build`. Browser tests run with `TEST_BASE_URL` pointing to a server started with explicit mock mode and the seeded test-admin configuration. HTTP contract tests stub official endpoint responses; genuine account authentication and real catalog access require owner-provided credentials and approval.

## Mock catalog correction

Mock products now come from a fixed, category-specific taxonomy instead of renaming harness fixtures to the selected category. Paw Protection includes socks, balm, boots, pads and wax. Socks and balm use their matching bundled fictional images; missing type-appropriate images stay null. Clothing, leashes, car safety and cat products have separate fixture profiles. Unsupported categories return no fixtures. Mock ASINs are separated by profile to avoid unrelated categories sharing the old generic harness identifiers.

Mock category relevance uses explicit fictional category memberships, not an injected selected-category title or browse-node ID. Related products require an approved fallback and receive the related label and lower category contribution. This mapping is labeled simulated, never verified Amazon classification. Commission labels say “Simulated commission rate”; verified live rule rates never replace fixture rates, and mixed mock/live item lists are rejected. Live API category matching remains unchanged.

## Expanded mock catalogs

Each supported profile supplies twenty exact products. Major categories cover socks/boots/balm/wax/pads, walking/no-pull/car harnesses, rope/standard/no-pull leashes, hoodies/jackets/coats, and seat belts/car harnesses/restraints/travel mats. Prices, commission rates, ratings, review counts, availability and keyword features vary; missing signals remain null. Harness search also contains an explicitly related leash and an excluded food sentinel for category isolation tests. ASINs remain stable across searches and syncs.

Finder cards and the imported-product editor explicitly label simulated data. Mock imports stay Draft and publication is rejected; no mock credentials or fabricated real performance data are required. Type-appropriate bundled images are used where available, otherwise the UI displays Image not provided. The official Creators API adapter and its credential configuration are unchanged.
