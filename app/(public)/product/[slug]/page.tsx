import { AmazonPriceNotice } from "@/components/store/amazon-price-notice";
import { Breadcrumbs } from "@/components/content/breadcrumbs";
import { AnswerContent } from "@/components/content/answer-content";
import { ProductGallery } from "@/components/store/product-gallery";
import {
  productPhoto,
  isBundledArtwork,
  retailPhotos,
  photoAlt,
} from "@/lib/storefront-media";
import Link from "next/link";
import { notFound } from "next/navigation";
import { product, products, settings } from "@/lib/catalog";
import { metadata, baseUrl } from "@/lib/seo";
import { Schema } from "@/components/content/schema";
import {
  ProductCard,
  AffiliateButton,
  money,
} from "@/components/store/product-card";
import { db, databaseConfigured } from "@/lib/db";
import { contentPath } from "@/lib/content";
import type { SEO, AEO } from "@/types/content";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = await product((await params).slug);
  const site = await settings();
  return p
    ? metadata(
        p.title,
        p.shortDescription,
        "/product/" + p.slug,
        p.seo as SEO,
        p.isDemo || site.demoMode,
      )
    : { title: "Product not found", robots: { index: false } };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = await product((await params).slug);
  if (!p) notFound();
  const [s, related] = await Promise.all([
    settings(),
    products({ brand: p.brand?.slug }),
  ]);
  const mainPhoto = productPhoto(p);
  const photos = [
    ...(mainPhoto
      ? [{ url: mainPhoto, alt: photoAlt(p.mainImage, p.imageAlt, p.title) }]
      : []),
    ...p.images
      .filter((i) => !isBundledArtwork(i.url))
      .map((i) => ({ url: i.url, alt: i.alt || p.title })),
  ];
  if (p.isDemo && isBundledArtwork(p.mainImage)) {
    const lifestyle =
      p.slug === "everyday-adventure-harness"
        ? retailPhotos.hero
        : p.slug === "cozy-club-dog-hoodie"
          ? retailPhotos.clothing
          : p.slug === "gentle-grip-dog-socks"
            ? retailPhotos.paws
            : null;
    if (lifestyle)
      photos.push({
        url: lifestyle,
        alt: "Generated lifestyle example for " + p.title,
      });
  }
  const gallery = photos.filter(
    (photo, i) => photos.findIndex((item) => item.url === photo.url) === i,
  );
  const aeo = p.aeo as AEO;
  const selectedRelated =
    "relatedFrom" in p ? p.relatedFrom.map((r) => r.to) : [];
  const guides = databaseConfigured()
    ? await db.content.findMany({
        where: { status: "PUBLISHED", products: { some: { productId: p.id } } },
        take: 6,
      })
    : [];
  return (
    <div className="container product-page">
      <Breadcrumbs
        items={[
          ...(p.categories[0]
            ? [
                {
                  name: p.categories[0].category.name,
                  path: p.categories[0].category.path,
                },
              ]
            : []),
          { name: p.title, path: "/product/" + p.slug },
        ]}
      />
      {!p.isDemo && (
        <Schema
          value={{
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.title,
            image: p.mainImage,
            description: p.shortDescription,
            url: baseUrl() + "/product/" + p.slug,
            ...(p.brand
              ? { brand: { "@type": "Brand", name: p.brand.name } }
              : {}),
          }}
        />
      )}
      <div className="product-detail">
        <ProductGallery photos={gallery} />
        <div className="detail-copy">
          {p.brand && (
            <Link className="eyebrow" href={"/brands/" + p.brand.slug}>
              {p.brand.name}
            </Link>
          )}
          <h1>{(p.seo as SEO).h1 || p.title}</h1>
          {p.badge && <span className="badge inline">{p.badge}</span>}
          {p.rating !== null && (
            <p className="rating">
              ★ {p.rating}{" "}
              {p.reviewCount !== null && `(${p.reviewCount} ratings)`}
            </p>
          )}
          <div className="detail-price">
            {money(p.price, p.currency) || "Check Price"}
            {p.oldPrice !== null && Number(p.oldPrice) > Number(p.price) && (
              <del>{money(p.oldPrice, p.currency)}</del>
            )}
          </div>
          {"source" in p && p.source === "AMAZON" && (
            <AmazonPriceNotice syncedAt={p.amazonLastSyncAt} />
          )}
          <p>{p.shortDescription}</p>
          {p.isDemo && (
            <p className="notice">
              Development example: fictional product, illustrative price, and
              placeholder link.
            </p>
          )}
          {p.features.length > 0 && (
            <>
              <h2>At a glance</h2>
              <ul className="feature-list">
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </>
          )}
          <AffiliateButton product={p} source={"/product/" + p.slug} />
          <p className="affiliate-note">
            {p.affiliateDisclosure || s.affiliateDisclosure}
          </p>
          <p className="muted">
            Check current price, availability, sizing, and merchant terms before
            purchasing.
          </p>
        </div>
      </div>
      <AnswerContent value={aeo} />
      <section className="prose detail-section">
        <h2>The details</h2>
        <p className="preserve-lines">{p.description}</p>
        <div className="two-col">
          {p.pros.length > 0 && (
            <div>
              <h3>What to like</h3>
              <ul>
                {p.pros.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {p.cons.length > 0 && (
            <div>
              <h3>Things to consider</h3>
              <ul>
                {p.cons.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {p.bestFor && (
          <p>
            <strong>Best for:</strong> {p.bestFor}
          </p>
        )}
        {p.notIdealFor && (
          <p>
            <strong>Not ideal for:</strong> {p.notIdealFor}
          </p>
        )}
      </section>
      {guides.length > 0 && (
        <section className="section">
          <h2>Helpful reading</h2>
          <div className="link-cards">
            {guides.map((g) => (
              <Link key={g.id} href={contentPath(g)}>
                {g.title}
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="section">
        <h2>More to explore</h2>
        <div className="product-grid">
          {(selectedRelated.length ? selectedRelated : related.rows)
            .filter((r) => r.id !== p.id)
            .slice(0, 4)
            .map((r) => (
              <ProductCard
                key={r.id}
                product={r}
                source={"/product/" + p.slug}
              />
            ))}
        </div>
      </section>
    </div>
  );
}
