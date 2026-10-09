import "server-only";
import { expireAmazonCache } from "@/services/amazon/cache";
import { db } from "@/lib/db";
import { contentTypes } from "./resources";
import { Prisma } from "@prisma/client";
export async function resourceRows(
  resource: string,
  q = "",
  status = "",
  page = 1,
  sort = "newest",
) {
  if (resource === "products") await expireAmazonCache();
  const skip = (page - 1) * 20,
    take = 20;
  const text = q ? { contains: q, mode: "insensitive" as const } : undefined;
  if (resource === "products") {
    const where: Prisma.ProductWhereInput = {
      ...(text
        ? { OR: [{ title: text }, { slug: text }, { brand: { name: text } }] }
        : {}),
      ...(["DRAFT", "PUBLISHED", "NEEDS_REVIEW", "REVIEWED"].includes(status)
        ? { status: status as "DRAFT" }
        : {}),
    };
    const [rows, total] = await Promise.all([
      db.product.findMany({
        where,
        include: { brand: true },
        orderBy: sort === "title" ? { title: "asc" } : { updatedAt: "desc" },
        skip,
        take,
      }),
      db.product.count({ where }),
    ]);
    return { rows, total };
  }
  if (contentTypes[resource]) {
    const where: Prisma.ContentWhereInput = {
      type: contentTypes[resource],
      ...(text ? { title: text } : {}),
      ...(["DRAFT", "PUBLISHED", "NEEDS_REVIEW", "REVIEWED"].includes(status)
        ? { status: status as "DRAFT" }
        : {}),
    };
    const [rows, total] = await Promise.all([
      db.content.findMany({
        where,
        orderBy: sort === "title" ? { title: "asc" } : { updatedAt: "desc" },
        skip,
        take,
      }),
      db.content.count({ where }),
    ]);
    return { rows, total };
  }
  if (resource === "categories") {
    const where = { ...(text ? { name: text } : {}) };
    return {
      rows: await db.category.findMany({
        where,
        orderBy: { order: "asc" },
        skip,
        take,
      }),
      total: await db.category.count({ where }),
    };
  }
  if (resource === "brands") {
    const where = { ...(text ? { name: text } : {}) };
    return {
      rows: await db.brand.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take,
      }),
      total: await db.brand.count({ where }),
    };
  }
  if (resource === "authors") {
    const where = { ...(text ? { name: text } : {}) };
    return {
      rows: await db.author.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take,
      }),
      total: await db.author.count({ where }),
    };
  }
  if (resource === "navigation")
    return {
      rows: await db.navigationItem.findMany({
        orderBy: { order: "asc" },
        skip,
        take,
      }),
      total: await db.navigationItem.count(),
    };
  if (resource === "users")
    return {
      rows: await db.adminUser.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          updatedAt: true,
        },
        skip,
        take,
      }),
      total: await db.adminUser.count(),
    };
  return { rows: [], total: 0 };
}
export async function record(resource: string, id: string) {
  if (resource === "products") await expireAmazonCache();
  if (resource === "products") {
    const p = await db.product.findUnique({
      where: { id },
      include: {
        categories: true,
        images: { orderBy: { order: "asc" } },
        relatedFrom: true,
      },
    });
    return p
      ? {
          ...p,
          price: p.price === null ? null : Number(p.price),
          oldPrice: p.oldPrice === null ? null : Number(p.oldPrice),
          categoryIds: p.categories.map((c) => c.categoryId),
          relatedProductIds: p.relatedFrom.map((r) => r.toId),
          gallery: p.images.map((i) => ({ url: i.url, alt: i.alt })),
        }
      : null;
  }
  if (contentTypes[resource]) {
    const c = await db.content.findUnique({
      where: { id, type: contentTypes[resource] },
      include: {
        products: { orderBy: { order: "asc" } },
        categories: true,
        faqs: { orderBy: { order: "asc" } },
        sources: true,
        relatedFrom: true,
      },
    });
    return c
      ? {
          ...c,
          reviewedAt: c.reviewedAt?.toISOString().slice(0, 10) ?? null,
          productIds: c.products.map((p) => p.productId),
          categoryIds: c.categories.map((p) => p.categoryId),
          relatedContentIds: c.relatedFrom.map((r) => r.toId),
        }
      : null;
  }
  if (resource === "categories")
    return db.category.findUnique({ where: { id } });
  if (resource === "brands") return db.brand.findUnique({ where: { id } });
  if (resource === "authors") return db.author.findUnique({ where: { id } });
  if (resource === "navigation")
    return db.navigationItem.findUnique({ where: { id } });
  if (resource === "users")
    return db.adminUser.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
  return null;
}
export async function editorOptions() {
  await expireAmazonCache();
  const [categories, brands, products, content, authors, media, navigation] =
    await Promise.all([
      db.category.findMany({ select: { id: true, name: true, path: true } }),
      db.brand.findMany({ select: { id: true, name: true } }),
      db.product.findMany({
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      }),
      db.content.findMany({ select: { id: true, title: true, type: true } }),
      db.author.findMany({ select: { id: true, name: true, type: true } }),
      db.media.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      db.navigationItem.findMany({ select: { id: true, label: true } }),
    ]);
  return { categories, brands, products, content, authors, media, navigation };
}
