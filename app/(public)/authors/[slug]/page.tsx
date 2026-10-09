import { db, databaseConfigured } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { contentPath } from "@/lib/content";
export default async function Author({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!databaseConfigured()) notFound();
  const a = await db.author.findUnique({
    where: { slug: (await params).slug },
    include: { articles: { where: { status: "PUBLISHED" } } },
  });
  if (!a) notFound();
  return (
    <div className="container article-page">
      <span className="eyebrow">Meet the writer</span>
      <h1>{a.name}</h1>
      <p>{a.jobTitle}</p>
      {a.credentials && <p>{a.credentials}</p>}
      <div className="prose">
        <p>{a.bio}</p>
      </div>
      <h2>Published work</h2>
      <div className="link-cards">
        {a.articles.map((c) => (
          <Link href={contentPath(c)} key={c.id}>
            {c.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
