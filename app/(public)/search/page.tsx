import Link from "next/link";
import { CatalogPage, type Params } from "@/components/store/catalog-page";
import { articles, categories, brands } from "@/lib/catalog";
import { contentPath } from "@/lib/content";
export const metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const p = await searchParams;
  const q = typeof p.q === "string" ? p.q : "";
  const [content, cats, bs] = await Promise.all([
    articles(undefined, q),
    categories(),
    brands(),
  ]);
  return (
    <>
      <CatalogPage
        title={q ? `Results for “${q}”` : "Explore all products"}
        intro="Find essentials, makers, and practical advice for your companion."
        path="/search"
        params={p}
      />
      {q && (
        <section className="container section">
          <h2>Guides and related discoveries</h2>
          <div className="link-cards">
            {content.map((c) => (
              <Link href={contentPath(c)} key={c.id}>
                {c.title}
              </Link>
            ))}
            {cats
              .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()))
              .map((c) => (
                <Link href={c.path} key={c.id}>
                  {c.name}
                </Link>
              ))}
            {bs
              .filter((b) => b.name.toLowerCase().includes(q.toLowerCase()))
              .map((b) => (
                <Link href={"/brands/" + b.slug} key={b.id}>
                  {b.name}
                </Link>
              ))}
          </div>
        </section>
      )}
    </>
  );
}
