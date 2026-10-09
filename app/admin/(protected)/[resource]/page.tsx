import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { adminResources, editableResources } from "@/lib/admin/resources";
import { resourceRows, editorOptions } from "@/lib/admin/queries";
import { RecordEditor } from "@/components/admin/record-editor";
import { ClickAnalytics } from "@/components/admin/analytics";
import { MediaLibrary } from "@/components/admin/media-library";
import { db } from "@/lib/db";
import { settings } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth";
import type { Params } from "@/components/store/catalog-page";
export default async function ResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>;
  searchParams: Promise<Params>;
}) {
  const { resource } = await params;
  const definition = adminResources.find(([k]) => k === resource);
  if (!definition) notFound();
  const admin = await requireAdmin();
  if (
    ["users", "settings", "homepage"].includes(resource) &&
    admin.role !== "OWNER"
  )
    redirect("/admin");
  const p = await searchParams;
  const q = typeof p.q === "string" ? p.q : "",
    status = typeof p.status === "string" ? p.status : "",
    page = Math.max(1, Math.floor(Number(p.page) || 1));
  const title = definition[1];
  let body: React.ReactNode;
  if (resource === "affiliate-clicks")
    body = (
      <ClickAnalytics
        from={typeof p.from === "string" ? p.from : undefined}
        to={typeof p.to === "string" ? p.to : undefined}
      />
    );
  else if (resource === "homepage" || resource === "settings")
    body = (
      <RecordEditor
        resource={resource}
        initial={await settings()}
        options={JSON.parse(JSON.stringify(await editorOptions()))}
      />
    );
  else if (resource === "media")
    body = (
      <MediaLibrary
        initial={JSON.parse(
          JSON.stringify(
            await db.media.findMany({
              where: q
                ? {
                    OR: [
                      { filename: { contains: q, mode: "insensitive" } },
                      { alt: { contains: q, mode: "insensitive" } },
                    ],
                  }
                : {},
              orderBy: { createdAt: "desc" },
              take: 100,
            }),
          ),
        )}
      />
    );
  else if (resource === "audit-log") {
    const rows = await db.auditLog.findMany({
      include: { admin: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
      skip: (page - 1) * 100,
    });
    body = (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Entity</th>
              <th>Administrator</th>
              <th>Time (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.action}</td>
                <td>{r.entity}</td>
                <td>{r.admin?.name || "System"}</td>
                <td>{r.createdAt.toISOString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 100 && (
          <Link href={"?page=" + (page + 1)}>Next page →</Link>
        )}
      </div>
    );
  } else if (resource === "seo") {
    const [ps, cs] = await Promise.all([
      db.product.findMany({
        take: 200,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, status: true, seo: true },
      }),
      db.content.findMany({
        take: 200,
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, status: true, seo: true },
      }),
    ]);
    body = (
      <div className="table-scroll">
        <p>
          SEO overview · latest 200 products and 200 content records. Edit SEO
          and answer fields in each record.
        </p>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>SEO title</th>
              <th>Indexing</th>
            </tr>
          </thead>
          <tbody>
            {[...ps, ...cs].map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.status}</td>
                <td>
                  {(r.seo as { title?: string }).title || "Uses content title"}
                </td>
                <td>
                  {(r.seo as { noindex?: boolean }).noindex
                    ? "Noindex"
                    : "Index"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    const result = await resourceRows(
      resource,
      q,
      status,
      page,
      typeof p.sort === "string" ? p.sort : undefined,
    );
    body = (
      <>
        <form className="list-filters">
          <input
            aria-label="Search records"
            name="q"
            placeholder="Search records…"
            defaultValue={q}
          />
          <select aria-label="Status" name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {["DRAFT", "NEEDS_REVIEW", "REVIEWED", "PUBLISHED"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select
            aria-label="Sort records"
            name="sort"
            defaultValue={String(p.sort || "newest")}
          >
            <option value="newest">Recently updated</option>
            <option value="title">Name / title</option>
          </select>
          <button className="button secondary">Search</button>
        </form>
        <p className="muted">{result.total} records</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status / type</th>
                <th>Slug / destination</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => {
                const row = r as unknown as Record<string, unknown>;
                return (
                  <tr key={String(row.id)}>
                    <td>
                      {String(row.title || row.name || row.label || "Untitled")}
                    </td>
                    <td>
                      <span className="status">
                        {String(row.status || row.type || row.role || "Active")}
                      </span>
                    </td>
                    <td>{String(row.slug || row.href || row.email || "")}</td>
                    <td>
                      <Link href={"/admin/" + resource + "/" + row.id}>
                        Edit ↗
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!result.rows.length && (
            <div className="empty-state">
              <h2>Your next great addition starts here.</h2>
              <p>Create your first record using the button above.</p>
            </div>
          )}
        </div>
        <nav className="pagination">
          {page > 1 && (
            <Link
              href={`?page=${page - 1}&q=${encodeURIComponent(q)}&status=${status}`}
            >
              ← Previous
            </Link>
          )}
          {page * 20 < result.total && (
            <Link
              href={`?page=${page + 1}&q=${encodeURIComponent(q)}&status=${status}`}
            >
              Next →
            </Link>
          )}
        </nav>
      </>
    );
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">Petsmartinn studio</span>
          <h1>{title}</h1>
        </div>
        {(editableResources.includes(resource) || resource === "users") && (
          <Link className="button" href={"/admin/" + resource + "/new"}>
            + Add {resource === "products" ? "product" : "record"}
          </Link>
        )}
      </div>
      {body}
    </>
  );
}
