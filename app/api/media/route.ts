import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { currentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { storeMedia, deleteMedia } from "@/services/media";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function authorize(req: Request) {
  if (
    req.headers.get("origin") !==
    new URL(process.env.NEXTAUTH_URL || req.url).origin
  )
    return null;
  return currentAdmin();
}
export async function POST(req: Request) {
  const admin = await authorize(req);
  if (!admin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const form = await req.formData(),
      file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size > 5 * 1024 * 1024 ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    )
      throw new Error("Upload a PNG, JPEG, or WebP under 5 MB.");
    const image = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 40000000,
    });
    const buffer = await image
      .rotate()
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
    const meta = await sharp(buffer).metadata();
    const key = randomUUID() + ".webp";
    const url = await storeMedia(key, buffer, "image/webp");
    const media = await db.$transaction(async (tx) => {
      const m = await tx.media.create({
        data: {
          filename: file.name.slice(0, 200),
          url,
          storageKey: key,
          mimeType: "image/webp",
          alt: String(form.get("alt") || "").slice(0, 500),
          title: file.name.slice(0, 200),
          width: meta.width!,
          height: meta.height!,
          bytes: buffer.length,
        },
      });
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: "uploaded",
          entity: "media",
          entityId: m.id,
        },
      });
      return m;
    });
    return NextResponse.json(media);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 400 },
    );
  }
}
export async function PATCH(req: Request) {
  const admin = await authorize(req);
  if (!admin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id, alt, caption, title } = await req.json();
    if (
      [id, alt, caption, title].some(
        (v) => typeof v !== "string" || v.length > 1000,
      )
    )
      throw new Error("Invalid metadata");
    const m = await db.$transaction(async (tx) => {
      const m = await tx.media.update({
        where: { id },
        data: { alt, caption, title },
      });
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: "updated",
          entity: "media",
          entityId: id,
        },
      });
      return m;
    });
    return NextResponse.json(m);
  } catch {
    return NextResponse.json(
      { error: "Could not update media" },
      { status: 400 },
    );
  }
}
export async function DELETE(req: Request) {
  const admin = await authorize(req);
  if (!admin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await req.json();
    const m = await db.media.findUniqueOrThrow({ where: { id } });
    const [ps, cs, cats, bs, authors, settings] = await Promise.all([
      db.product.findMany({
        select: {
          mainImage: true,
          images: { select: { url: true } },
          seo: true,
        },
      }),
      db.content.findMany({ select: { image: true, blocks: true, seo: true } }),
      db.category.findMany({ select: { image: true, seo: true } }),
      db.brand.findMany({ select: { logo: true, seo: true } }),
      db.author.findMany({ select: { image: true } }),
      db.siteSetting.findMany({ select: { value: true } }),
    ]);
    if (JSON.stringify([ps, cs, cats, bs, authors, settings]).includes(m.url))
      throw new Error(
        "This image is in use. Remove its references before deleting it.",
      );
    await deleteMedia(m.storageKey);
    await db.$transaction(async (tx) => {
      await tx.media.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          adminId: admin.id,
          action: "deleted",
          entity: "media",
          entityId: id,
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Deletion failed" },
      { status: 400 },
    );
  }
}
