import type { Metadata } from "next";
import "./globals.css";
import { baseUrl } from "@/lib/seo";
export const metadata: Metadata = {
  metadataBase: new URL(baseUrl()),
  title: {
    default: "Petsmartinn | Good things for your best friend",
    template: "%s | Petsmartinn",
  },
  description:
    "Thoughtful pet essentials and practical guides for happier days together.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
