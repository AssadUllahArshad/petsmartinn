import Image from "next/image";
import Link from "next/link";
import type { Block } from "@/types/content";
import { ProductCard, type CardProduct } from "@/components/store/product-card";
import { safeUrl } from "@/lib/validation";
export function ContentBlocks({
  blocks,
  products,
  source,
}: {
  blocks: Block[];
  products: CardProduct[];
  source: string;
}) {
  return (
    <div className="prose">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return <h2 key={i}>{b.text}</h2>;
          case "h3":
            return <h3 key={i}>{b.text}</h3>;
          case "paragraph":
            return (
              <p className="preserve-lines" key={i}>
                {b.text}
              </p>
            );
          case "list":
            return (
              <ul key={i}>
                {b.items?.map((t, j) => (
                  <li key={j}>{t}</li>
                ))}
              </ul>
            );
          case "quote":
            return <blockquote key={i}>{b.text}</blockquote>;
          case "callout":
            return (
              <aside className="answer-block" key={i}>
                {b.text}
              </aside>
            );
          case "table":
            return (
              <div className="table-scroll" key={i}>
                <table>
                  <tbody>
                    {b.rows?.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) =>
                          j === 0 ? (
                            <th key={k} scope="col">
                              {c}
                            </th>
                          ) : (
                            <td key={k}>{c}</td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "image":
            return b.url &&
              (safeUrl(b.url) ||
                b.url.startsWith("/images/") ||
                b.url.startsWith("/uploads/")) ? (
              <figure key={i}>
                <Image
                  src={b.url}
                  alt={b.alt || ""}
                  width={900}
                  height={600}
                  sizes="90vw"
                />
                <figcaption>{b.text}</figcaption>
              </figure>
            ) : null;
          case "link":
            return b.url && (safeUrl(b.url) || /^\/(?!\/)/.test(b.url)) ? (
              <p key={i}>
                <Link href={b.url}>{b.text || b.url}</Link>
              </p>
            ) : null;
          case "product": {
            const p = products.find((p) => p.id === b.productId);
            return p ? (
              <div className="recommendation" key={i}>
                {b.label && <h3>{b.label}</h3>}
                <ProductCard product={p} source={source} />
              </div>
            ) : null;
          }
          case "comparison": {
            const ps = products.filter((p) => b.productIds?.includes(p.id));
            return (
              <div className="product-grid" key={i}>
                {ps.map((p) => (
                  <ProductCard key={p.id} product={p} source={source} />
                ))}
              </div>
            );
          }
        }
      })}
    </div>
  );
}
