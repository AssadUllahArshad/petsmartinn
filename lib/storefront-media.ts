/** Presentation-only replacements for the original bundled development artwork.
 * Admin-provided assets are returned verbatim. Generated product photos are
 * used only for fictional demo products, never as evidence of a real product.
 */
const root = "/images/retail/";
const legacy = new Set([
  "/images/hero-dog.svg",
  "/images/guide-walk.svg",
  ...["harness", "leash", "hoodie", "socks", "bed", "balm"].map(
    (name) => `/images/product-${name}.svg`,
  ),
]);
export const retailPhotos = {
  hero: root + "walk.webp",
  dog: root + "dog.webp",
  cat: root + "cat.webp",
  clothing: root + "clothing.webp",
  paws: root + "paws.webp",
  car: root + "car.webp",
};
export function isBundledArtwork(url?: string | null) {
  return !!url && legacy.has(url);
}
export function heroPhoto(url?: string | null) {
  return url && !isBundledArtwork(url) ? url : retailPhotos.hero;
}
export function categoryPhoto(c: { image?: string | null; path: string }) {
  if (c.image && !isBundledArtwork(c.image)) return c.image;
  if (c.path === "/cats" || c.path.startsWith("/cats/"))
    return retailPhotos.cat;
  if (/clothing|hoodie/.test(c.path)) return retailPhotos.clothing;
  if (/paw|sock/.test(c.path)) return retailPhotos.paws;
  if (/car|seat-belt/.test(c.path)) return retailPhotos.car;
  if (/leash/.test(c.path)) return root + "leash.webp";
  if (/harness/.test(c.path)) return retailPhotos.hero;
  return retailPhotos.dog;
}
export function productPhoto(p: {
  mainImage: string;
  slug: string;
  isDemo: boolean;
}): string | null {
  if (p.mainImage && !isBundledArtwork(p.mainImage)) return p.mainImage;
  if (!p.isDemo) return null;
  const bySlug: Record<string, string> = {
    "everyday-adventure-harness": "harness",
    "weekend-rope-leash": "leash",
    "cozy-club-dog-hoodie": "hoodie",
    "gentle-grip-dog-socks": "socks",
    "window-watch-cat-perch": "perch",
    "road-companion-travel-mat": "mat",
    "curious-cat-play-wand": "wand",
    "all-season-paw-balm": "balm",
  };
  return bySlug[p.slug] ? root + bySlug[p.slug] + ".webp" : null;
}
export function contentPhoto(c: {
  image?: string | null;
  type: string;
  slug?: string;
  species?: string;
}): string | null {
  if (c.image && !isBundledArtwork(c.image)) return c.image;
  // A generic animal image must not misidentify a specific breed or condition.
  if (c.type.endsWith("BREED") || c.type === "HEALTH" || c.type === "PAGE")
    return null;
  if (!isBundledArtwork(c.image)) return null;
  return root + (c.type === "BLOG" ? "journal.webp" : "guide.webp");
}
export function photoAlt(
  url: string | null | undefined,
  alt: string | undefined,
  fallback: string,
) {
  return isBundledArtwork(url) ? fallback : alt || fallback;
}
