import Link from "next/link";
import { contentPhoto, categoryPhoto, photoAlt } from "@/lib/storefront-media";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  categories,
  brands,
  articles,
  article,
  settings,
  articleCount,
} from "@/lib/catalog";
import { sections, contentPath } from "@/lib/content";
import { CatalogPage, type Params } from "@/components/store/catalog-page";
import { ArticlePage } from "@/components/content/article-page";
import { metadata } from "@/lib/seo";
import { AnswerContent } from "@/components/content/answer-content";
import type { AEO, SEO } from "@/types/content";
import { databaseConfigured } from "@/lib/db";
async function resolve(parts: string[]) {
  const path = "/" + parts.join("/");
  const cats = await categories();
  const cat = cats.find((c) => c.path === path);
  if (cat) return { kind: "category" as const, cat, cats };
  const section = sections.find((s) => s.key === parts[0]);
  if (section && parts.length === 1 && section.type !== "PAGE")
    return { kind: "archive" as const, section };
  if (
    section &&
    ((section.type !== "HEALTH" && parts.length === 2) ||
      (section.type === "HEALTH" &&
        parts.length === 3 &&
        ["dogs", "cats"].includes(parts[1])))
  ) {
    const slug = parts.at(-1)!;
    const c = await article(
      section.type,
      slug,
      section.type === "HEALTH" ? parts[1] : undefined,
    );
    if (c) return { kind: "article" as const, c };
  }
  if (parts[0] === "brands") {
    const bs = await brands();
    if (parts.length === 1) return { kind: "brands" as const, bs };
    const b = bs.find((b) => b.slug === parts[1]);
    if (b && parts.length === 2) return { kind: "brand" as const, b };
  }
  if (parts.length === 1) {
    const c = await article("PAGE", parts[0]);
    if (c) return { kind: "article" as const, c };
    if (
      [
        "about",
        "contact",
        "privacy-policy",
        "terms",
        "affiliate-disclosure",
        "editorial-policy",
        "medical-review-policy",
      ].includes(parts[0])
    )
      return { kind: "legal" as const, slug: parts[0] };
  }
  return null;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const parts = (await params).segments;
  const r = await resolve(parts);
  if (!r) return { title: "Page not found", robots: { index: false } };
  const path = "/" + parts.join("/");
  const site = await settings();
  if (r.kind === "category")
    return metadata(
      r.cat.name,
      r.cat.intro,
      path,
      "seo" in r.cat ? (r.cat.seo as SEO) : {},
      site.demoMode || !databaseConfigured(),
    );
  if (r.kind === "article")
    return metadata(
      r.c.title,
      r.c.excerpt,
      path,
      r.c.seo as SEO,
      site.demoMode || !databaseConfigured(),
    );
  if (r.kind === "brand")
    return metadata(
      r.b.name,
      r.b.description,
      path,
      "seo" in r.b ? (r.b.seo as SEO) : {},
      site.demoMode || !databaseConfigured(),
    );
  if (r.kind === "archive")
    return metadata(
      r.section.name,
      r.section.description,
      path,
      {},
      site.demoMode || !databaseConfigured(),
    );
  return metadata(
    r.kind === "legal" ? r.slug.replaceAll("-", " ") : "Brands",
    "Explore Petsmartinn",
    path,
    {},
    site.demoMode || !databaseConfigured(),
  );
}
export default async function DynamicPage({
  params,
  searchParams,
}: {
  params: Promise<{ segments: string[] }>;
  searchParams: Promise<Params>;
}) {
  const parts = (await params).segments;
  const r = await resolve(parts);
  if (!r) notFound();
  const path = "/" + parts.join("/");
  const site = await settings();
  if (r.kind === "category") {
    const sub = r.cats.filter((c) => c.parentId === r.cat.id);
    return (
      <>
        <CatalogPage
          title={
            "seo" in r.cat ? (r.cat.seo as SEO).h1 || r.cat.name : r.cat.name
          }
          intro={r.cat.intro}
          path={path}
          params={await searchParams}
          category={path}
        >
          <div className="catalog-photo">
            <Image
              src={categoryPhoto(r.cat)}
              alt={r.cat.name + " essentials"}
              width={1260}
              height={340}
              sizes="(max-width:760px) 94vw, 1260px"
              priority
            />
          </div>
          {sub.length > 0 && (
            <div className="subcategory-links">
              {sub.map((c) => (
                <Link href={c.path} key={c.id}>
                  {c.name} ↗
                </Link>
              ))}
            </div>
          )}
        </CatalogPage>
        {"aeo" in r.cat && (
          <section className="container section">
            <AnswerContent value={r.cat.aeo as AEO} />
          </section>
        )}
        {"body" in r.cat &&
          typeof r.cat.body === "string" &&
          r.cat.body.length > 0 && (
            <section className="container section prose">
              <h2>Choosing {r.cat.name.toLowerCase()}</h2>
              <p className="preserve-lines">{r.cat.body}</p>
            </section>
          )}
      </>
    );
  }
  if (r.kind === "brand")
    return (
      <>
        <CatalogPage
          title={"seo" in r.b ? (r.b.seo as SEO).h1 || r.b.name : r.b.name}
          intro={r.b.description}
          path={path}
          params={await searchParams}
          brand={r.b.slug}
        />
        {"body" in r.b && typeof r.b.body === "string" && (
          <section className="container section prose">
            <p className="preserve-lines">{r.b.body}</p>
          </section>
        )}
        {"aeo" in r.b && (
          <section className="container section">
            <AnswerContent value={r.b.aeo as AEO} />
          </section>
        )}
      </>
    );
  if (r.kind === "brands")
    return (
      <div className="container section">
        <span className="eyebrow">Meet the makers</span>
        <h1>Brands to explore</h1>
        <div className="link-cards">
          {r.bs.map((b) => (
            <Link key={b.id} href={"/brands/" + b.slug}>
              {"logo" in b && typeof b.logo === "string" && b.logo && (
                <Image
                  src={b.logo}
                  alt={b.name + " logo"}
                  width={140}
                  height={60}
                />
              )}
              <h2>{b.name}</h2>
              <p>{b.description}</p>
            </Link>
          ))}
        </div>
        {!r.bs.length && (
          <p>
            Brand profiles will appear when products or useful editorial content
            are published.
          </p>
        )}
      </div>
    );
  if (r.kind === "article")
    return (
      <ArticlePage type={r.c.type} slug={r.c.slug} species={r.c.species} />
    );
  if (r.kind === "archive") {
    const qp = await searchParams;
    const page = Math.max(1, Math.floor(Number(qp.page) || 1));
    const [cs, total] = await Promise.all([
      articles(r.section.type, undefined, page, 12),
      articleCount(r.section.type),
    ]);
    return (
      <div className="container section archive">
        <span className="eyebrow">The knowledge hub</span>
        <h1>{r.section.name}</h1>
        <p>{r.section.description}</p>
        <div className="guide-grid">
          {cs.map((c) => (
            <Link className="guide-card" href={contentPath(c)} key={c.id}>
              {contentPhoto(c) && (
                <Image
                  src={contentPhoto(c)!}
                  alt={photoAlt(c.image, c.imageAlt, c.title)}
                  width={500}
                  height={300}
                  sizes="(max-width:700px) 94vw, 32vw"
                />
              )}
              <h2>{c.title}</h2>
              <p>{c.excerpt}</p>
              <span className="text-link">Read the guide ↗</span>
            </Link>
          ))}
        </div>
        <nav className="pagination" aria-label="Content pagination">
          {page > 1 && (
            <Link href={`${path}?page=${page - 1}`}>← Previous</Link>
          )}
          {page * 12 < total && (
            <Link href={`${path}?page=${page + 1}`}>Next →</Link>
          )}
        </nav>
        {!cs.length && (
          <div className="empty-state">
            <h2>Thoughtful advice takes time.</h2>
            <p>
              New guides will appear here once they have completed editorial
              review.
            </p>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="container article-page">
      <span className="eyebrow">Petsmartinn</span>
      <h1>{r.slug.replaceAll("-", " ")}</h1>
      <div className="prose">
        <p>{legalText[r.slug]}</p>
        {r.slug === "contact" && site.contactEmail && (
          <a href={"mailto:" + site.contactEmail}>{site.contactEmail}</a>
        )}
        <p className="notice">
          Development policy draft. The site owner must adapt this page to
          actual business practices and applicable requirements before launch.
        </p>
      </div>
    </div>
  );
}
const legalText: Record<string, string> = {
  about:
    "Petsmartinn is an independent pet product discovery and knowledge website. We help pet people explore useful essentials and practical advice. We are not affiliated with PetSmart.",
  contact:
    "Contact information will be published here when the site owner configures a verified business email.",
  "affiliate-disclosure":
    "As an Amazon Associate I earn from qualifying purchases. We may earn commissions from qualifying purchases made through merchant links. Your purchase takes place on the merchant’s website. Merchant terms govern pricing, payment, shipping, and returns.",
  "privacy-policy":
    "Affiliate clicks record a product reference, timestamp, source page, referrer hostname, campaign fields, and broad device category. We do not record full referrer URLs or IP addresses in click analytics. Admin authentication uses secure session cookies. Define retention, lawful basis, contact details, and rights procedures before launch.",
  terms:
    "Information is provided for general educational and product discovery purposes. Verify all product specifications, current prices, and merchant terms directly with the merchant. Purchases are handled by independent merchants.",
  "editorial-policy":
    "Our editorial content should distinguish factual product information from editorial opinions and affiliate relationships. Writers must verify claims, provide sources where appropriate, and update content when material facts change.",
  "medical-review-policy":
    "Health articles require an identified author, a named veterinary reviewer with genuine credentials, a review date, references, and a veterinary disclaimer before publication. This site does not provide individual diagnosis, prescription, or medication dosing advice.",
};
