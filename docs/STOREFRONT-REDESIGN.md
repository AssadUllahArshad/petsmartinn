# Public storefront redesign — October 7, 2026

The public pages now use an original forest-green retail identity, realistic photography, white product cards, prominent search, photo category cards, selectable product galleries, and responsive filters. Public CSS is scoped to `.storefront` in `app/retail.css`; the admin interface and shared theme file were preserved.

The database schema, stored catalog records, routes, admin editor, affiliate redirect/tracking implementation, metadata, structured data, publication rules, content blocks, and homepage selection/order/hide controls remain in place. The default illustrated hero copy is upgraded only when it matches the original bundled copy exactly; custom admin copy still appears.

## Images and admin replacement

Sixteen original images were created with the built-in image_gen tool, inspected, resized with Sharp, and compressed to WebP. Final project files are in `public/images/retail/`. The hero is approximately 218 KB; all source prompts, original generation paths, and final asset names are recorded in [retail-image-prompts.json](retail-image-prompts.json).

The product photographs represent the existing fictional development products. They are not photographs of actual merchant inventory. Their prices and affiliate links retain development labels. No competitor images, brand logos, or ratings were fabricated. Replace development product media and data with verified merchant/admin assets before launch.

`lib/storefront-media.ts` replaces only the original reserved bundled artwork paths. Uploaded images and supplied URLs take precedence. Real products without a supplied photo receive a neutral “Product photo coming soon” panel rather than a generated product representation. Breed and health pages use their own supplied photo, avoiding a generic image that could misidentify a breed or medical condition.

Use the existing admin Media Library to upload images, then select the library image for products/articles or copy its URL into the existing category, brand logo, or homepage hero field. Product gallery entries continue to use their existing URL/alt fields. The storefront displays them as selectable thumbnail buttons. Header and brand tiles honor supplied logos; brand names remain clean text tiles when no logo is supplied.

Only the hero/product detail priority images load eagerly in the storefront; other images retain Next/Image lazy loading and responsive sizes. Product photos use contain; editorial/category photos use cover. There is no new newsletter backend; the existing guide CTA remains.

## Verification

- `npm run lint`: passed.
- `npm run build`: passed after the final presentation changes.
- Existing unit tests: 7 passed.
- Existing database integration tests: 2 passed, including exact affiliate URL preservation and the health publication gate.
- Existing Playwright tests: 4 passed across desktop and mobile, including search, product discovery, admin protection, login, CRUD, guide product relationships, and affiliate tracking.
- 52 additional Chrome route checks passed, with zero horizontal overflow, broken images, or client errors. These checks cover homepage, Dogs, Cats, Harnesses, product details, buying guide, breed/health archives, search, and brands at 320, 390, 768, and 1440 pixels. Selectable galleries, mobile navigation, responsive filter collapse, and valid price ranges are exercised.
- Dog breed, cat breed, and health article layouts are checked with temporary image-bearing fixtures. These records contain no medical guidance or credential claims and are deleted after verification. Existing draft breed and health articles remain unpublished.

Screenshots are saved in `docs/previews/retail/`, and the final check report is `docs/retail-verification.json`. Existing record counts were identical before and after the visual checks: 8 products, 15 categories, 3 brands, 14 content records, 0 authors, and 1 admin user. No Core Web Vitals score is claimed from these local functional checks.

## Price filter follow-up — fixed October 7, 2026

The blank-price-bound issue found during the original visual review is resolved. The server now uses `lib/catalog-query.ts` to treat empty and whitespace-only bounds as undefined. Explicit zero remains a real constraint. Invalid, negative, non-finite, oversized, and repeated price values are ignored independently, preserving a valid other bound. Valid decimal/scientific numeric ranges retain their values; reversed ranges continue to return no matching products. Sorting and rating inputs are validated, and pagination is bounded before Prisma receives it. The filter UI is unchanged.

Regression tests cover blank minimum, blank maximum, both blank, valid ranges, explicit zero, invalid input, and the actual minimum-only filter form on desktop and mobile. Validation after this fix: lint passed; 13 unit tests passed; 2 database integration tests passed; 6 Playwright tests passed; the production build passed. The isolated production preview for this check is http://localhost:3001. The earlier `retail-verification.json` records the original visual review before this follow-up.
