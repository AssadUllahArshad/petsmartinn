# Petsmartinn

An independent pet affiliate storefront and editorial CMS built with Next.js 16 App Router, React, TypeScript, Tailwind 4, PostgreSQL, Prisma 6, NextAuth credentials sessions, bcrypt, and Zod. No cart, checkout, customer orders or Amazon scraping. An optional server-only Amazon Creators API Product Finder imports drafts.

## Install and run

Use Node 22 LTS or newer. From this project folder:

```sh
npm install
cp .env.example .env
```

Set `DATABASE_URL` to PostgreSQL (Neon/Supabase/standard PostgreSQL). Set `NEXTAUTH_URL` and `SITE_URL` to the public origin, and generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`. Never use real secrets in public variables or commit `.env`.

```sh
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Without `DATABASE_URL`, public pages show labeled fictional development data; admin stays locked. A configured but unavailable database produces an error instead of quietly falling back to demo data.

## Optional local PostgreSQL

`npm run db:local` starts an isolated development PostgreSQL on port 55432. Its data and generated connection reference are under `/private/tmp`; this is a development convenience, not production storage. Keep that process running while using the app. The connection URL is saved with restricted permissions at `/private/tmp/petsmartinn-local-db-url`; place it in the local `.env`. Use a hosted or standard PostgreSQL database for persistent deployment.

## Administrator setup

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (at least 12 characters) temporarily in `.env`, then run `npm run admin:create`. Alternatively seed creates the owner when both variables exist. Existing passwords are never reset by seed. Remove bootstrap password variables afterward. Visit `/admin/login`. There is no hardcoded administrator or default password.

Owners control settings, homepage, and administrator accounts. Editors control products and editorial content. Every protected page checks the current active administrator in PostgreSQL; every mutation checks authorization and same-origin requests. NextAuth supplies CSRF protection to login/logout. Login attempts are throttled using a database-backed counter keyed by a hashed email; expired counters may be cleaned periodically. Admin passwords use bcrypt cost 12. Cookies are secure over HTTPS in production.

## Products and affiliate URLs

Use `/admin/products/new`. Enter name, slug, descriptions, category assignments, brand, optional verified price/rating, images, and affiliate settings. Save the merchant URL exactly once. Validation rejects non-HTTP(S) protocols, credentials in URLs, and control characters. It does not reserialize, remove parameters, or add affiliate tags.

`/go/[productId]` loads a published product, stores a privacy-conscious click (if enabled), and returns a 302 with the original URL in `Location`. It uses `no-store` and `noindex`. Tracking failures are logged and do not stop merchant navigation. Draft products cannot redirect. CTAs use `rel="sponsored nofollow noopener"`. Merchant payments, shipping, returns, and terms stay with the merchant. Some merchant/program policies may restrict redirect tracking; verify your approved link method before launch.

Click analytics store product names, brand/category snapshots, timestamp, source path, referrer hostname, broad device category, campaign, and optional UTM labels. They do not store IPs, full referrers, or user IDs. Define lawful processing, retention, bot handling, and consent requirements for your business. Counts represent click requests, not unique visitors or confirmed purchases. No revenue figures are fabricated.

## CMS content

Separate content sections: buying guides, dog breeds, cat breeds, health articles, blog, and pages. `Content` uses a type discriminator with shared normalized authors, reviewers, FAQ items, source references, product joins, category joins, and related-content edges. Specialized breed/health fields live in validated JSON rather than repeated near-identical article tables.

The structured editor supports H2/H3, paragraphs, lists, tables, quotes, callouts, images, links, single products with labels such as Top Pick, and product comparisons. Product blocks store IDs only. Saving automatically joins those IDs to the content record. Public rendering loads only published products and reuses their current imagery, details, and saved affiliate URLs. HTML is displayed as text rather than executed. FAQ/source and gallery controls currently use validated JSON fields; examples appear beneath each input.

Choose related content/products/categories in Relationships. Product pages link to content that recommends them; articles link to manually selected related content. Category hierarchy avoids synonym pages. Draft sample breed profiles contain no invented factual attributes. Fictional brands are used in seed data; add real brand pages only when licensed products or useful original content support them.

## Health review

Health status: Draft → Needs Review → Reviewed → Published. Reviewed/published content requires an author, reviewer of type Veterinary Reviewer with entered credentials, review date not in the future, sources, and a disclaimer. The system records credentials; it does not independently verify qualifications. The owner must verify them and the review itself. No medication dosage content is generated. Health draft templates remain unpublished. Health pages display review attribution, date, sources, emergency warning, and disclaimer.

## SEO and answers

Each product/category/brand/content record has separate editorial title, SEO title, description, H1, canonical, index/follow controls, social metadata, primary/secondary keywords, intent, country, entity, direct answer, takeaways, semantic terms, facts, audience, comparison summary, and question fields. Public articles render answer blocks, dates, author/reviewer information, FAQs, and source lists. JSON-LD uses actual visible data; fictional products do not emit Product schema. Product schema intentionally omits unverified offers, reviews, and ratings. Sitemap includes only published indexable records and excludes fictional products. `/search`, admin, APIs, and redirects are excluded from crawler indexing. Demo pages are noindex. Next/Image supports bundled original SVGs, Unsplash, Supabase and approved Amazon CDN hosts. Amazon images bypass the optimizer cache.

## Site controls and media

Development mode displays a banner and sets noindex; disable it in Site Settings only after replacing demonstration records. Homepage supports hero, selected categories/products/brands/articles, visibility, and section order. Navigation supports header/footer hierarchy. Settings include disclosure, contact, organization, branding references, social profiles, defaults, and analytics identifiers. Analytics ID is stored but no tracking script is injected until an appropriate privacy/consent implementation is chosen. Newsletter currently links to buying guides; email collection is not simulated.

Local media works only in development. Production requires `MEDIA_PROVIDER=supabase` with server-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a public storage bucket (`SUPABASE_MEDIA_BUCKET`). Storage is abstracted in `services/media`. JPEG/PNG/WebP uploads are limited to 5 MB, decoded with pixel limits, metadata stripped, resized to at most 2000px, and encoded as WebP under generated storage keys. SVG/HTML uploads are rejected. Media supports search, reuse, alt/title/caption editing, and deletion checks against existing references. Remote uploads must also respect provider limits and be accessible for Next/Image.

## Validation and tests

```sh
npm run lint
npm run typecheck
npm run test:db # isolated seeded PostgreSQL only
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

For full browser CRUD tests, run against an isolated seeded database with explicit `TEST_ADMIN_EMAIL`, `TEST_ADMIN_PASSWORD`, and `TEST_BASE_URL`. These tests create/delete test records. Unit tests cover exact affiliate URL preservation, unsafe destinations, privacy normalization, health gates, metadata, and schema injection. Browser tests cover discovery, redirects, protection, login, CRUD, and viewport overflow. Do not point tests or development seed scripts at a live database.

## Deploy

1. Create PostgreSQL and persistent media storage.
2. Set environment variables in Vercel; use a pooled DB URL suitable for serverless use and a provider-approved direct connection for migrations when needed.
3. Run `npm run db:deploy` against the target database in a controlled deploy step.
4. Create a real owner account; do not seed fictional products to production.
5. Run `npm run build`, deploy, then smoke-test login, media, CMS edits, and affiliate links on HTTPS.
6. Configure `SITE_URL` and `NEXTAUTH_URL` to `https://petsmartinn.com`, domain/DNS, PostgreSQL backups, monitoring, and retention procedures.
7. Replace fictional content/links, verify all claims, review legal policies and affiliate-program requirements, and publish only completed editorial work.

## Scope and operational limits

This is an application implementation, not a deployed or legally reviewed business. Vercel, DNS, production database credentials, genuine affiliate URLs, licensed merchant imagery, editorial content, verified medical reviewers, and policy review must be supplied by the owner. Live Amazon access requires owner-supplied Creators API credentials and account approval. Commission rates require owner-verified evidence; no commissions or income are guaranteed. Content JSON controls are practical structured editing, not a WYSIWYG editor. The media adapter currently implements local development and Supabase; S3/Cloudinary can be added behind the same interface. Public content archives and product results support pagination. Search uses indexed relational filters plus case-insensitive matching; very large catalogs should use PostgreSQL full-text/search-service indexing. Editor selectors load all records and should become paginated comboboxes for large catalogs. Health review protects publication workflow but cannot verify medical truth. No ranking, AI citation, or Core Web Vitals score is guaranteed.

The build uses Next.js’s supported Webpack compiler because Turbopack worker sockets are blocked in the verification environment.

## Amazon Product Finder

See [Amazon setup, ranking, import/sync and performance documentation](docs/AMAZON-FINDER.md). Start at `/admin/amazon/product-finder`; configure secrets and explicit mock/live mode server-side. The default is Highest Expected Earnings, displayed as Estimated Opportunity, with category priority and a visible six-factor breakdown. The additive migration preserves existing products and affiliate click tracking.
