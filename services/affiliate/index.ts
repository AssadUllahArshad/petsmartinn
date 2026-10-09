import { safeUrl } from "@/lib/validation";
export function affiliateDestination(url: string) {
  if (!safeUrl(url)) throw new Error("Invalid affiliate destination");
  return url;
}
export function referrerHost(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).hostname.slice(0, 200);
  } catch {
    return null;
  }
}
export function safeSource(value: string | null) {
  return value && /^\/(?!\/)/.test(value)
    ? value.split("?")[0].slice(0, 300)
    : null;
}
export function deviceCategory(ua: string) {
  return /ipad|tablet/i.test(ua)
    ? "tablet"
    : /mobile|iphone|android/i.test(ua)
      ? "mobile"
      : "desktop";
}
