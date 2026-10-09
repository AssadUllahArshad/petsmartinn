import { notFound, redirect } from "next/navigation";
import { record, editorOptions } from "@/lib/admin/queries";
import { editableResources, adminResources } from "@/lib/admin/resources";
import { RecordEditor } from "@/components/admin/record-editor";
import { requireAdmin } from "@/lib/auth";
export default async function RecordPage({
  params,
}: {
  params: Promise<{ resource: string; id: string }>;
}) {
  const { resource, id } = await params;
  if (!editableResources.includes(resource) && resource !== "users") notFound();
  const admin = await requireAdmin();
  if (resource === "users" && admin.role !== "OWNER") redirect("/admin");
  const initial = id === "new" ? undefined : await record(resource, id);
  if (id !== "new" && !initial) notFound();
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">
            {adminResources.find(([k]) => k === resource)?.[1]}
          </span>
          <h1>{id === "new" ? "Create a new record" : "Edit record"}</h1>
        </div>
      </div>
      <RecordEditor
        resource={resource}
        id={id === "new" ? undefined : id}
        initial={initial ? JSON.parse(JSON.stringify(initial)) : undefined}
        options={JSON.parse(JSON.stringify(await editorOptions()))}
      />
    </>
  );
}
