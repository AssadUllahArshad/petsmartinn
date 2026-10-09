import Link from "next/link";
import Image from "next/image";
import {
  products,
  categories,
  brands,
  articles,
  settings,
} from "@/lib/catalog";
import { ProductCard } from "@/components/store/product-card";
import {
  ArrowUpRight,
  Heart,
  ShieldCheck,
  BookOpen,
  PawPrint,
} from "@/components/ui/icon";
import { Schema } from "@/components/content/schema";
import { baseUrl, metadata } from "@/lib/seo";
import { databaseConfigured } from "@/lib/db";
import { contentPath } from "@/lib/content";
import {
  categoryPhoto,
  contentPhoto,
  heroPhoto,
  photoAlt,
} from "@/lib/storefront-media";
export async function generateMetadata() {
  const s = await settings();
  return metadata(
    s.defaultTitle,
    s.defaultDescription,
    "/",
    {},
    s.demoMode || !databaseConfigured(),
  );
}
export default async function Home() {
  const [s, cats, bs, result, guides, posts, dogBreeds, catBreeds] =
    await Promise.all([
      settings(),
      categories(),
      brands(),
      products(),
      articles("BUYING_GUIDE"),
      articles("BLOG"),
      articles("DOG_BREED"),
      articles("CAT_BREED"),
    ]);
  const picks = s.featuredProductIds.length
    ? result.rows.filter((p) => s.featuredProductIds.includes(p.id))
    : result.rows.slice(0, 4);
  const featuredCats = s.featuredCategoryIds.length
    ? cats.filter((c) => s.featuredCategoryIds.includes(c.id))
    : cats.filter((c) => c.parentId).slice(0, 5);
  const selectedGuides = s.featuredContentIds.length
    ? guides.filter((g) => s.featuredContentIds.includes(g.id))
    : guides;
  const selectedPosts = s.featuredContentIds.length
    ? posts.filter((g) => s.featuredContentIds.includes(g.id))
    : posts;
  const heroTitle =
    s.heroTitle === "Good things.\nFor your best friend."
      ? "Everything your pet needs, thoughtfully chosen."
      : s.heroTitle;
  const sections: Record<string, React.ReactNode> = {
    pets: (
      <section className="container section">
        <SectionHead
          eyebrow="Shop by pet"
          title="Good things for your best friend."
          href="/search"
          label="Explore all products"
        />
        <div className="pet-photo-grid">
          {["/dogs", "/cats"].map((path) => {
            const c = cats.find((cat) => cat.path === path);
            return (
              <Link href={path} className="pet-photo-card" key={path}>
                <div className="pet-photo">
                  <Image
                    src={categoryPhoto(c || { path })}
                    fill
                    sizes="(max-width:700px) 90vw, 45vw"
                    alt={
                      path === "/dogs"
                        ? "Golden retriever relaxing at home"
                        : "Tabby cat relaxing by a sunny window"
                    }
                  />
                </div>
                <div>
                  <span className="eyebrow">Everyday essentials</span>
                  <h3>{c?.name || (path === "/dogs" ? "Dogs" : "Cats")}</h3>
                  <p>{c?.intro || "Thoughtfully chosen for your companion."}</p>
                  <span className="text-link">
                    Shop {path.slice(1)} <ArrowUpRight size={18} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    ),
    categories: (
      <section className="retail-band">
        <div className="container section">
          <SectionHead
            eyebrow="Find their favorites"
            title="Shop popular categories"
            href="/dogs"
            label="All dog essentials"
          />
          <div className="category-grid">
            {featuredCats.map((c) => (
              <Link href={c.path} className="category-tile" key={c.id}>
                <Image
                  src={categoryPhoto(c)}
                  width={400}
                  height={320}
                  sizes="(max-width:700px) 45vw, 20vw"
                  alt={c.name + " essentials"}
                />
                <div>
                  <h3>{c.name}</h3>
                  <ArrowUpRight size={19} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    ),
    products: (
      <section className="container section">
        <SectionHead
          eyebrow="Thoughtfully selected"
          title="Popular picks for everyday life"
          href="/search"
          label="View all products"
        />
        <div className="product-grid">
          {picks.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <p className="section-disclosure">
          We may earn a commission from qualifying purchases through our links.
        </p>
      </section>
    ),
    brands: (
      <section className="brand-strip">
        <div className="container section">
          <SectionHead
            eyebrow="Meet the makers"
            title="Explore by brand"
            href="/brands"
            label="All brands"
          />
          <div className="brand-row">
            {(s.featuredBrandIds.length
              ? bs.filter((b) => s.featuredBrandIds.includes(b.id))
              : bs
            ).map((b) => (
              <Link key={b.id} href={"/brands/" + b.slug}>
                {"logo" in b && typeof b.logo === "string" && b.logo ? (
                  <Image
                    src={b.logo}
                    alt={b.name + " logo"}
                    width={180}
                    height={64}
                  />
                ) : (
                  <span>{b.name}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>
    ),
    guides: (
      <section className="container section">
        <SectionHead
          eyebrow="Buy with a little more confidence"
          title="Practical guides. Better choices."
          href="/buying-guides"
          label="All buying guides"
        />
        <div className="guide-grid">
          {selectedGuides.slice(0, 3).map((g) => (
            <EditorialCard key={g.id} article={g} label="Buying guide" />
          ))}
        </div>
        <div className="breed-discovery">
          <Link href="/dog-breeds">
            <h3>Get to know your dog</h3>
            <p>Explore breed personalities and everyday care.</p>
            <span className="text-link">
              Dog breed guides <ArrowUpRight size={17} />
            </span>
          </Link>
          <Link href="/cat-breeds">
            <h3>Understand your cat</h3>
            <p>Discover what makes your feline companion unique.</p>
            <span className="text-link">
              Cat breed guides <ArrowUpRight size={17} />
            </span>
          </Link>
        </div>
        {dogBreeds.length > 0 && (
          <div className="breed-feature">
            <h2>Dog breed guides</h2>
            <div className="guide-grid">
              {dogBreeds.slice(0, 3).map((g) => (
                <EditorialCard key={g.id} article={g} label="Dog breeds" />
              ))}
            </div>
          </div>
        )}
        {catBreeds.length > 0 && (
          <div className="breed-feature">
            <h2>Cat breed guides</h2>
            <div className="guide-grid">
              {catBreeds.slice(0, 3).map((g) => (
                <EditorialCard key={g.id} article={g} label="Cat breeds" />
              ))}
            </div>
          </div>
        )}
      </section>
    ),
    advice: (
      <section className="retail-band">
        <div className="container section">
          <SectionHead
            eyebrow="For better days together"
            title="A little advice goes a long way"
            href="/blog"
            label="Read the pet journal"
          />
          <div className="guide-grid">
            {selectedPosts.slice(0, 3).map((p) => (
              <EditorialCard key={p.id} article={p} label="Pet advice" />
            ))}
          </div>
          <Link className="health-link" href="/pet-health">
            <ShieldCheck size={23} />
            <span>
              <strong>Practical pet health information</strong>
              <span>
                Explore source-led advice and the veterinary review process.
              </span>
            </span>
            <ArrowUpRight size={22} />
          </Link>
        </div>
      </section>
    ),
    newsletter: (
      <section className="newsletter container">
        <div>
          <span className="eyebrow">Stay curious. Choose thoughtfully.</span>
          <h2>More good days start here.</h2>
          <p>
            Find helpful guides and everyday essentials for life with your pet.
          </p>
        </div>
        <Link className="button" href="/buying-guides">
          Discover the guides <ArrowUpRight size={18} />
        </Link>
      </section>
    ),
  };
  return (
    <>
      <Schema
        value={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: s.organizationName,
          url: baseUrl(),
        }}
      />
      <section className="hero container">
        <div className="hero-copy">
          <div className="hero-kicker">FOR BETTER DAYS TOGETHER</div>
          <h1>{heroTitle}</h1>
          <p>
            {s.heroSubtitle ===
            "Thoughtful essentials, helpful guides, and a little more joy in every day together."
              ? "Discover useful products, buying guides, and practical pet advice for life with your best friend."
              : s.heroSubtitle}
          </p>
          <Link className="button" href={s.heroButtonUrl}>
            {s.heroButtonText}
            <ArrowUpRight size={19} />
          </Link>
          <Link className="hero-guide-link text-link" href="/buying-guides">
            Find your next buying guide <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="hero-art">
          <Image
            src={heroPhoto(s.heroImage)}
            fill
            priority
            sizes="(max-width:760px) 94vw, 50vw"
            alt={photoAlt(
              s.heroImage,
              "Petsmartinn pet lifestyle",
              "Dog enjoying an outdoor walk with its owner",
            )}
          />
        </div>
      </section>
      <div className="trust-strip container">
        <span>
          <PawPrint size={21} />
          Thoughtfully selected products
        </span>
        <span>
          <BookOpen size={21} />
          Independent buying guides
        </span>
        <span>
          <ShieldCheck size={21} />
          Clear affiliate links
        </span>
        <span>
          <Heart size={21} />
          Practical pet advice
        </span>
      </div>
      {s.sectionOrder
        .filter((k) => !s.hiddenSections.includes(k))
        .map((k) => (
          <div key={k}>{sections[k]}</div>
        ))}
    </>
  );
}
type EditorialArticle = {
  title: string;
  excerpt: string;
  type: string;
  slug: string;
  species?: string;
  image?: string | null;
  imageAlt?: string;
};
function EditorialCard({
  article: g,
  label,
}: {
  article: EditorialArticle;
  label: string;
}) {
  const image = contentPhoto(g);
  return (
    <Link className="guide-card" href={contentPath(g)}>
      {image && (
        <div className="guide-image">
          <Image
            src={image}
            fill
            sizes="(max-width:700px) 94vw, (max-width:1100px) 45vw, 32vw"
            alt={photoAlt(
              g.image,
              g.imageAlt,
              g.type === "BLOG"
                ? "Dog enjoying an outdoor walk"
                : "Dog wearing a harness outdoors",
            )}
          />
          <span>{label}</span>
        </div>
      )}
      <div className="guide-copy">
        <h3>{g.title}</h3>
        <p>{g.excerpt}</p>
        <span className="text-link">
          Read the guide <ArrowUpRight size={17} />
        </span>
      </div>
    </Link>
  );
}
function SectionHead({
  eyebrow,
  title,
  href,
  label,
}: {
  eyebrow: string;
  title: string;
  href: string;
  label: string;
}) {
  return (
    <div className="section-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <Link className="text-link" href={href}>
        {label}
        <ArrowUpRight size={17} />
      </Link>
    </div>
  );
}
