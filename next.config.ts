import type { NextConfig } from "next";
const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...[
        "m.media-amazon.com",
        "images-na.ssl-images-amazon.com",
        "images-eu.ssl-images-amazon.com",
        "images-fe.ssl-images-amazon.com",
      ].map((hostname) => ({ protocol: "https" as const, hostname })),
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
