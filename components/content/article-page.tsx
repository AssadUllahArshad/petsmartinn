import { contentPhoto, photoAlt } from "@/lib/storefront-media";
import { Breadcrumbs } from "./breadcrumbs";
import Image from "next/image";
import Link from "next/link";
import { article } from "@/lib/catalog";
import { contentPath } from "@/lib/content";
import { notFound } from "next/navigation";
import { ContentBlocks } from "./blocks";
import { Schema } from "./schema";
import type { SEO, AEO, Block } from "@/types/content";
import { baseUrl } from "@/lib/seo";
export async function ArticlePage({
  type,
  slug,
  species,
}: {
  type: string;
  slug: string;
  species?: string;
}) {
  const c = await article(type, slug, species);
  if (!c) notFound();
  const a = c.aeo as AEO;
  const path = contentPath(c);
  const cover = contentPhoto(c);
  return (
    <article className="container article-page">
      <Breadcrumbs items={[{ name: c.title, path }]} />
      <header className="article-heading">
        <span className="eyebrow">
          {c.type.replaceAll("_", " ").toLowerCase()}
        </span>
        <h1>{(c.seo as SEO).h1 || c.title}</h1>
        <p>{c.excerpt}</p>
        <div className="byline">
          {c.author && (
            <Link href={"/authors/" + c.author.slug}>By {c.author.name}</Link>
          )}
          <span>
            Updated{" "}
            {c.updatedAt.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        {c.reviewer && (
          <p className="reviewer">
            Reviewed by {c.reviewer.name}
            {c.reviewer.credentials && `, ${c.reviewer.credentials}`}
            {c.reviewedAt && ` · ${c.reviewedAt.toLocaleDateString("en-US")}`}
          </p>
        )}
      </header>
      {cover && (
        <Image
          className="article-cover"
          src={cover}
          alt={photoAlt(c.image, c.imageAlt, c.title)}
          width={1100}
          height={620}
          sizes="(max-width:760px) 94vw, 1100px"
          priority
        />
      )}
      <div className="article-body">
        {c.emergencyWarning && (
          <aside className="emergency">{c.emergencyWarning}</aside>
        )}
        {a.directAnswer && (
          <aside className="answer-block">
            <strong>At a glance</strong>
            <p>{a.directAnswer}</p>
          </aside>
        )}
        {a.takeaways?.length && (
          <section className="takeaways">
            <h2>Key takeaways</h2>
            <ul>
              {a.takeaways.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        )}
        <ContentBlocks
          blocks={c.blocks as Block[]}
          products={c.products.map((p) => p.product)}
          source={path}
        />
        {Object.entries(
          c.specialized as Record<string, string | string[]>,
        ).filter(([, v]) => v && (!Array.isArray(v) || v.length)).length >
          0 && (
          <section className="prose">
            <h2>
              {c.type.endsWith("BREED") ? "Breed profile" : "Further details"}
            </h2>
            <dl className="profile-facts">
              {Object.entries(
                c.specialized as Record<string, string | string[]>,
              )
                .filter(([, v]) => v && (!Array.isArray(v) || v.length))
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k.replace(/([A-Z])/g, " $1")}</dt>
                    <dd>{Array.isArray(v) ? v.join(", ") : v}</dd>
                  </div>
                ))}
            </dl>
          </section>
        )}
        {c.faqs.length > 0 && (
          <section className="prose">
            <h2>Common questions</h2>
            {c.faqs.map((f, i) => (
              <details className="faq" key={i}>
                <summary>{f.question}</summary>
                <p>{f.answer}</p>
              </details>
            ))}
            <Schema
              value={{
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: c.faqs.map((f) => ({
                  "@type": "Question",
                  name: f.question,
                  acceptedAnswer: { "@type": "Answer", text: f.answer },
                })),
              }}
            />
          </section>
        )}
        {c.sources.length > 0 && (
          <section className="sources">
            <h2>Sources and references</h2>
            <ul>
              {c.sources.map((r, i) => (
                <li key={i}>
                  <a href={r.url} rel="noopener" target="_blank">
                    {r.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        {c.disclaimer && <p className="notice">{c.disclaimer}</p>}
        {c.relatedFrom.length > 0 && (
          <section>
            <h2>Keep exploring</h2>
            <div className="link-cards">
              {c.relatedFrom.map((r) => (
                <Link key={r.to.id} href={contentPath(r.to)}>
                  {r.to.title}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <Schema
        value={{
          "@context": "https://schema.org",
          "@type":
            c.type === "HEALTH"
              ? "MedicalWebPage"
              : c.type === "PAGE"
                ? "WebPage"
                : c.type === "BLOG"
                  ? "BlogPosting"
                  : "Article",
          headline: c.title,
          description: c.excerpt,
          url: baseUrl() + path,
          dateModified: c.updatedAt.toISOString(),
          ...(c.publishedAt
            ? { datePublished: c.publishedAt.toISOString() }
            : {}),
          ...(c.author
            ? {
                author: {
                  "@type": "Person",
                  name: c.author.name,
                  url: baseUrl() + "/authors/" + c.author.slug,
                },
              }
            : {}),
          ...(c.reviewer
            ? { reviewedBy: { "@type": "Person", name: c.reviewer.name } }
            : {}),
        }}
      />
    </article>
  );
}
