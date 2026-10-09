import { db, databaseConfigured } from "@/lib/db";
import { safeUrl } from "@/lib/validation";
import Link from "next/link";
import { PawPrint, ArrowUpRight } from "@/components/ui/icon";
import { settings, navigation } from "@/lib/catalog";
export async function Footer() {
  const [s, nav] = await Promise.all([settings(), navigation("footer")]);
  const hasAmazon = databaseConfigured()
    ? !!(await db.product.findFirst({
        where: { source: "AMAZON", status: "PUBLISHED" },
        select: { id: true },
      }))
    : false;
  return (
    <footer>
      <div className="container footer-grid">
        <div>
          <Link className="logo" href="/">
            <PawPrint />
            {s.siteName.toLowerCase()}.
          </Link>
          <p>{s.footerText}</p>
          {s.contactEmail && (
            <a href={"mailto:" + s.contactEmail}>{s.contactEmail}</a>
          )}
          <div className="social-links">
            {Object.entries(s.socialProfiles)
              .filter(([, u]) => safeUrl(String(u)))
              .map(([label, url]) => (
                <a
                  href={String(url)}
                  key={label}
                  target="_blank"
                  rel="noopener"
                >
                  {label} ↗
                </a>
              ))}
          </div>
          <p className="muted">
            Thoughtful choices for the companions
            <br />
            who make every day better.
          </p>
        </div>
        <div>
          <h3>Explore</h3>
          {[
            ["Dogs", "/dogs"],
            ["Cats", "/cats"],
            ["Brands", "/brands"],
            ["Buying guides", "/buying-guides"],
          ].map(([l, h]) => (
            <Link key={h} href={h}>
              {l}
            </Link>
          ))}
        </div>
        <div>
          <h3>Get to know us</h3>
          {[
            ["About us", "/about"],
            ["Contact", "/contact"],
            ["Editorial policy", "/editorial-policy"],
            ["Medical review policy", "/medical-review-policy"],
          ].map(([l, h]) => (
            <Link key={h} href={h}>
              {l}
            </Link>
          ))}
        </div>
        <div>
          <h3>Stay curious</h3>
          <Link href="/dog-breeds">
            Dog breeds <ArrowUpRight size={13} />
          </Link>
          <Link href="/cat-breeds">
            Cat breeds <ArrowUpRight size={13} />
          </Link>
          <Link href="/pet-health">
            Pet health <ArrowUpRight size={13} />
          </Link>
          {nav
            .filter((n) => !n.parentId)
            .map((n) => (
              <Link href={n.href} key={n.id}>
                {n.label}
              </Link>
            ))}
        </div>
      </div>
      <div className="container disclosure">
        <p>{s.affiliateDisclosure}</p>
        {hasAmazon && (
          <p>
            CERTAIN CONTENT THAT APPEARS ON THIS SITE COMES FROM AMAZON. THIS
            CONTENT IS PROVIDED ‘AS IS’ AND IS SUBJECT TO CHANGE OR REMOVAL AT
            ANY TIME.
          </p>
        )}
        <p>
          Purchases, payment, delivery, and returns are handled by the linked
          merchant.
        </p>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {s.siteName}
        </span>
        <div>
          <Link href="/privacy-policy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/affiliate-disclosure">Affiliate disclosure</Link>
        </div>
      </div>
    </footer>
  );
}
