import Link from "next/link";
import Image from "next/image";
import { PawPrint, Search, ArrowUpRight, Menu } from "@/components/ui/icon";
import { navigation, settings } from "@/lib/catalog";
export async function Header() {
  const [nav, s] = await Promise.all([navigation(), settings()]);
  const roots = nav.filter((n) => !n.parentId);
  return (
    <>
      <div className="announcement">
        Thoughtful essentials. Practical advice.{" "}
        <Link href="/buying-guides">
          Explore buying guides <ArrowUpRight size={13} />
        </Link>
      </div>
      <header>
        <div className="header-main container">
          <Link href="/" className="logo" aria-label={s.siteName + " home"}>
            {s.logo ? (
              <Image src={s.logo} alt="" width={42} height={42} />
            ) : (
              <span className="logo-icon">
                <PawPrint size={27} />
              </span>
            )}
            {s.siteName.toLowerCase()}
            <span className="logo-dot">.</span>
          </Link>
          <form action="/search" className="search-form" role="search">
            <Search size={19} />
            <input
              aria-label="Search products and guides"
              name="q"
              placeholder="Search products, brands & pet advice"
            />
            <button aria-label="Submit search">
              <ArrowUpRight size={20} />
            </button>
          </form>
          <Link className="header-note" href="/about">
            <HeartMark />
            Made for pet people
          </Link>
          <details className="mobile-menu">
            <summary aria-label="Open navigation">
              <Menu />
            </summary>
            <nav>
              {roots.map((n) => (
                <Link key={n.id} href={n.href}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
        <nav className="desktop-nav container" aria-label="Main navigation">
          {roots.map((n) => {
            const children = nav.filter((c) => c.parentId === n.id);
            return children.length ? (
              <details className="mega-menu" key={n.id}>
                <summary>{n.label}</summary>
                <div>
                  <Link href={n.href}>Shop all {n.label.toLowerCase()} ↗</Link>
                  {children.map((c) => (
                    <Link key={c.id} href={c.href}>
                      {c.label}
                    </Link>
                  ))}
                </div>
              </details>
            ) : (
              <Link key={n.id} href={n.href}>
                {n.label}
              </Link>
            );
          })}
          <Link href="/blog" className="nav-journal">
            The pet journal <ArrowUpRight size={15} />
          </Link>
        </nav>
      </header>
    </>
  );
}
function HeartMark() {
  return <span aria-hidden="true">♡</span>;
}
