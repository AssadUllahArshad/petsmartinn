import "server-only";
import { expireAmazonCache } from "@/services/amazon/cache";
import { db, databaseConfigured } from "@/lib/db";
import {
  demoCategories,
  demoBrands,
  demoProducts,
  demoContent,
  defaultSettings,
} from "./demo";
import { Prisma, ContentType } from "@prisma/client";
export async function settings() {
  if (!databaseConfigured()) return defaultSettings;
  const row = await db.siteSetting.findUnique({ where: { key: "site" } });
  return { ...defaultSettings, ...((row?.value as object) ?? {}) };
}
export async function navigation(location = "header") {
  if (!databaseConfigured())
    return [
      { id: "dogs", label: "Dogs", href: "/dogs", parentId: null },
      { id: "cats", label: "Cats", href: "/cats", parentId: null },
      { id: "brands", label: "Brands", href: "/brands", parentId: null },
      {
        id: "guides",
        label: "Buying guides",
        href: "/buying-guides",
        parentId: null,
      },
      {
        id: "dog-breeds",
        label: "Dog breeds",
        href: "/dog-breeds",
        parentId: null,
      },
      {
        id: "cat-breeds",
        label: "Cat breeds",
        href: "/cat-breeds",
        parentId: null,
      },
      {
        id: "health",
        label: "Pet health",
        href: "/pet-health",
        parentId: null,
      },
    ];
  return db.navigationItem.findMany({
    where: { location, visible: true },
    orderBy: { order: "asc" },
  });
}
export async function categories() {
  if (!databaseConfigured()) return demoCategories;
  return db.category.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { order: "asc" },
  });
}
export async function brands() {
  if (!databaseConfigured()) return demoBrands;
  return db.brand.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { products: { some: { status: "PUBLISHED" } } },
        { body: { not: "" } },
      ],
    },
    orderBy: { name: "asc" },
  });
}
export type CatalogQuery = {
  q?: string;
  category?: string;
  brand?: string;
  min?: number;
  max?: number;
  rating?: number;
  sort?: string;
  page?: number;
  featured?: boolean;
};
export const productInclude = {
  brand: true,
  categories: { include: { category: true } },
  images: { orderBy: { order: "asc" as const } },
  relatedFrom: {
    where: { to: { status: "PUBLISHED" } },
    include: { to: { include: { brand: true } } },
  },
} satisfies Prisma.ProductInclude;
export async function products(query: CatalogQuery = {}) {
  const page = Math.max(1, query.page ?? 1),
    take = 12;
  if (!databaseConfigured()) {
    const rows = demoProducts.filter(
      (p) =>
        (!query.q ||
          [
            p.title,
            p.brand.name,
            p.shortDescription,
            ...p.categories.map((c) => c.category.name),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query.q.toLowerCase())) &&
        (!query.brand || p.brand.slug === query.brand) &&
        (!query.category ||
          p.categories.some(
            (c) =>
              c.category.path === query.category ||
              c.category.path.startsWith(query.category + "/"),
          )) &&
        (!query.featured || p.featured) &&
        (query.min === undefined || p.price >= query.min) &&
        (query.max === undefined || p.price <= query.max) &&
        !query.rating,
    );
    if (query.sort === "price-asc") rows.sort((a, b) => a.price - b.price);
    if (query.sort === "price-desc") rows.sort((a, b) => b.price - a.price);
    return {
      rows: rows.slice((page - 1) * take, page * take),
      total: rows.length,
      page,
    };
  }
  await expireAmazonCache();
  const where: Prisma.ProductWhereInput = {
    status: "PUBLISHED",
    ...(query.featured ? { featured: true } : {}),
    ...(query.brand
      ? { brand: { slug: query.brand, status: "PUBLISHED" } }
      : {}),
    ...(query.category
      ? {
          categories: {
            some: {
              category: {
                status: "PUBLISHED",
                OR: [
                  { path: query.category },
                  { path: { startsWith: query.category + "/" } },
                ],
              },
            },
          },
        }
      : {}),
    ...(query.min !== undefined || query.max !== undefined
      ? { price: { gte: query.min, lte: query.max } }
      : {}),
    ...(query.rating ? { rating: { gte: query.rating } } : {}),
    ...(query.q
      ? {
          OR: [
            { title: { contains: query.q, mode: "insensitive" } },
            { shortDescription: { contains: query.q, mode: "insensitive" } },
            { brand: { name: { contains: query.q, mode: "insensitive" } } },
            {
              categories: {
                some: {
                  category: {
                    name: { contains: query.q, mode: "insensitive" },
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    query.sort === "price-asc"
      ? { price: { sort: "asc", nulls: "last" } }
      : query.sort === "price-desc"
        ? { price: { sort: "desc", nulls: "last" } }
        : query.sort === "rating"
          ? { rating: { sort: "desc", nulls: "last" } }
          : query.sort === "popular"
            ? { clicks: { _count: "desc" } }
            : query.sort === "newest"
              ? { createdAt: "desc" }
              : { featured: "desc" };
  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      include: productInclude,
      orderBy: [orderBy, { id: "asc" }],
      skip: (page - 1) * take,
      take,
    }),
    db.product.count({ where }),
  ]);
  return { rows, total, page };
}
export async function product(slug: string) {
  if (!databaseConfigured())
    return demoProducts.find((p) => p.slug === slug) ?? null;
  await expireAmazonCache();
  return db.product.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: productInclude,
  });
}
export async function articles(
  type?: string,
  q?: string,
  page = 1,
  take = 100,
) {
  if (!databaseConfigured())
    return demoContent.filter(
      (c) =>
        (!type || c.type === type) &&
        (!q ||
          [c.title, c.excerpt]
            .join(" ")
            .toLowerCase()
            .includes(q.toLowerCase())),
    );
  return db.content.findMany({
    where: {
      status: "PUBLISHED",
      ...(type ? { type: type as ContentType } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { excerpt: { contains: q, mode: "insensitive" } },
              { tags: { has: q } },
            ],
          }
        : {}),
    },
    include: { author: true },
    orderBy: { publishedAt: "desc" },
    skip: (Math.max(1, page) - 1) * take,
    take,
  });
}
export async function article(type: string, slug: string, species?: string) {
  if (!databaseConfigured())
    return demoContent.find((c) => c.type === type && c.slug === slug) ?? null;
  await expireAmazonCache();
  return db.content.findFirst({
    where: {
      type: type as ContentType,
      slug,
      status: "PUBLISHED",
      ...(species ? { species } : {}),
    },
    include: {
      author: true,
      reviewer: true,
      sources: true,
      faqs: { orderBy: { order: "asc" } },
      products: {
        where: { product: { status: "PUBLISHED" } },
        include: { product: { include: productInclude } },
        orderBy: { order: "asc" },
      },
      categories: { include: { category: true } },
      relatedFrom: {
        where: { to: { status: "PUBLISHED" } },
        include: { to: true },
      },
    },
  });
}

export async function articleCount(type?: string, q?: string) {
  if (!databaseConfigured())
    return demoContent.filter(
      (c) =>
        (!type || c.type === type) &&
        (!q ||
          [c.title, c.excerpt]
            .join(" ")
            .toLowerCase()
            .includes(q.toLowerCase())),
    ).length;
  return db.content.count({
    where: {
      status: "PUBLISHED",
      ...(type ? { type: type as ContentType } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { excerpt: { contains: q, mode: "insensitive" } },
              { tags: { has: q } },
            ],
          }
        : {}),
    },
  });
}
