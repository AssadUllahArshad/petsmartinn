import "@/app/retail.css";
import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { databaseConfigured } from "@/lib/db";
import { settings } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const site = await settings();
  return {
    title: { default: site.defaultTitle, template: `%s | ${site.siteName}` },
    description: site.defaultDescription,
    robots: site.demoMode ? { index: false, follow: true } : undefined,
    verification: site.searchConsoleVerification
      ? { google: site.searchConsoleVerification }
      : undefined,
    icons: site.favicon ? { icon: site.favicon } : undefined,
    openGraph: site.defaultSocialImage
      ? { images: [site.defaultSocialImage] }
      : undefined,
  };
}
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const site = await settings();
  return (
    <div className="storefront">
      <Header />
      {(!databaseConfigured() || site.demoMode) && (
        <div className="demo-banner">
          Development preview · Fictional products and example links · Not a
          live store
        </div>
      )}
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}
