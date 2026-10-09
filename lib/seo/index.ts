import type { Metadata } from "next";
import type { SEO } from "@/types/content";
export const baseUrl = () => process.env.SITE_URL || "http://localhost:3000";
export function metadata(
  title: string,
  description: string,
  path: string,
  seo: SEO = {},
  demo = false,
): Metadata {
  const canonical = seo.canonical || new URL(path, baseUrl()).href;
  return {
    title: seo.title || title,
    description: seo.description || description,
    alternates: { canonical },
    robots: { index: !seo.noindex && !demo, follow: !seo.nofollow },
    openGraph: {
      title: seo.ogTitle || seo.title || title,
      description: seo.ogDescription || seo.description || description,
      url: canonical,
      type: "website",
      ...(seo.ogImage ? { images: [seo.ogImage] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title || title,
      description: seo.description || description,
    },
  };
}
export function serializeSchema(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
