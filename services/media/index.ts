import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
export async function storeMedia(key: string, buffer: Buffer, mime: string) {
  if (process.env.MEDIA_PROVIDER === "supabase") {
    const base = process.env.SUPABASE_URL,
      secret = process.env.SUPABASE_SERVICE_ROLE_KEY,
      bucket = process.env.SUPABASE_MEDIA_BUCKET || "media";
    if (!base || !secret) throw new Error("Storage is not configured");
    const r = await fetch(`${base}/storage/v1/object/${bucket}/${key}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        apikey: secret,
        "Content-Type": mime,
        "x-upsert": "false",
      },
      body: new Uint8Array(buffer),
    });
    if (!r.ok) throw new Error("Storage upload failed");
    return `${base}/storage/v1/object/public/${bucket}/${key}`;
  }
  if (process.env.NODE_ENV === "production")
    throw new Error(
      "Configure persistent storage before uploading production media.",
    );
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), buffer);
  return "/uploads/" + key;
}
export async function deleteMedia(key: string) {
  if (!/^[a-f0-9-]+\.(webp|png|jpg)$/.test(key))
    throw new Error("Invalid storage key");
  if (process.env.MEDIA_PROVIDER === "supabase") {
    const base = process.env.SUPABASE_URL,
      secret = process.env.SUPABASE_SERVICE_ROLE_KEY,
      bucket = process.env.SUPABASE_MEDIA_BUCKET || "media";
    const r = await fetch(`${base}/storage/v1/object/${bucket}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${secret}`,
        apikey: secret || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [key] }),
    });
    if (!r.ok) throw new Error("Storage deletion failed");
    return;
  }
  await unlink(path.join(process.cwd(), "public", "uploads", key));
}
