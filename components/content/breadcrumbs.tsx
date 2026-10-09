import Link from "next/link";
import { Schema } from "./schema";
import { baseUrl } from "@/lib/seo";
export function Breadcrumbs({
  items,
}: {
  items: { name: string; path: string }[];
}) {
  const trail = [{ name: "Home", path: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        {trail.map((item, i) => (
          <span key={item.path} className="breadcrumb-item">
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === trail.length - 1 ? (
              <span aria-current="page">{item.name}</span>
            ) : (
              <Link href={item.path}>{item.name}</Link>
            )}
          </span>
        ))}
      </nav>
      <Schema
        value={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: trail.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.name,
            item: new URL(item.path, baseUrl()).href,
          })),
        }}
      />
    </>
  );
}
