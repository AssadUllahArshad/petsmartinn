import { amazonImage } from "@/lib/amazon/normalize";
import { AmazonPriceNotice } from "./amazon-price-notice";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "@/components/ui/icon";
import { productPhoto, photoAlt } from "@/lib/storefront-media";
export type CardProduct = {
  source?: string;
  amazonLastSyncAt?: Date | string | null;
  id: string;
  title: string;
  slug: string;
  mainImage: string;
  imageAlt?: string;
  brand?: { name: string; slug: string } | null;
  price: unknown;
  oldPrice: unknown;
  currency: string;
  rating: number | null;
  reviewCount: number | null;
  badge?: string | null;
  isDemo: boolean;
  buttonText: string;
  openNewTab: boolean;
};
export function money(value: unknown, currency = "USD") {
  if (value === null || value === undefined) return "";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(Number(value));
  } catch {
    return String(value);
  }
}
export function AffiliateButton({
  product,
  source,
}: {
  product: Pick<CardProduct, "id" | "buttonText" | "openNewTab" | "isDemo"> & {
    price?: unknown;
  };
  source: string;
}) {
  return (
    <a
      className="button affiliate"
      href={`/go/${product.id}?source=${encodeURIComponent(source)}`}
      target={product.openNewTab ? "_blank" : undefined}
      rel="sponsored nofollow noopener"
    >
      {product.isDemo
        ? "Preview demo link"
        : product.price === null
          ? "Check Price"
          : product.buttonText || "Shop Now"}
      <ArrowUpRight size={17} />
    </a>
  );
}
export function ProductCard({
  product: p,
  source = "/",
}: {
  product: CardProduct;
  source?: string;
}) {
  const image = productPhoto(p);
  return (
    <article className="product-card">
      <Link href={"/product/" + p.slug} className="product-image">
        {image ? (
          <Image
            unoptimized={!!amazonImage(image)}
            src={image}
            alt={photoAlt(p.mainImage, p.imageAlt, p.title)}
            fill
            sizes="(max-width:640px) 94vw, (max-width:1024px) 45vw, 25vw"
          />
        ) : (
          <span className="image-unavailable">Product photo coming soon</span>
        )}
        {p.badge && <span className="badge">{p.badge}</span>}
      </Link>
      <div className="product-info">
        <span className="eyebrow">{p.brand?.name || "Pet essentials"}</span>
        <Link className="product-title" href={"/product/" + p.slug}>
          {p.title}
        </Link>
        {p.rating !== null && (
          <div className="rating">
            ★ {p.rating.toFixed(1)}{" "}
            {p.reviewCount !== null && <span>({p.reviewCount})</span>}
          </div>
        )}
        <div className="price">
          {p.price !== null ? money(p.price, p.currency) : "Check Price"}
          {p.oldPrice !== null && Number(p.oldPrice) > Number(p.price) && (
            <del>{money(p.oldPrice, p.currency)}</del>
          )}
          {p.isDemo && <small>Demo price</small>}
        </div>
        {p.source === "AMAZON" && (
          <AmazonPriceNotice syncedAt={p.amazonLastSyncAt} />
        )}
        <AffiliateButton product={p} source={source} />
        <span className="card-disclosure">
          Affiliate link · Purchase on merchant site
        </span>
      </div>
    </article>
  );
}
