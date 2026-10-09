import "server-only";
import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  productSchema,
  categorySchema,
  brandSchema,
  contentSchema,
  authorSchema,
  navSchema,
  healthPublishError,
  externalUrl,
} from "@/lib/validation";
import { contentTypes } from "./resources";
type Tx = Prisma.TransactionClient;
const json = (v: unknown) => v as Prisma.InputJsonValue;
export async function mutate(
  resource: string,
  id: string | null,
  input: unknown,
  admin: { id: string; role: string },
) {
  return db.$transaction(async (tx) => {
    let result: { id?: string; key?: string };
    if (resource === "products") {
      const v = productSchema.parse(input);
      const { categoryIds, relatedProductIds, gallery, ...fields } = v;
      const data = {
        ...fields,
        publishedAt: v.status === "PUBLISHED" ? new Date() : null,
        seo: json(v.seo),
        aeo: json(v.aeo),
        brandId: v.brandId || null,
        sku: v.sku || null,
      };
      const previous = id
        ? await tx.product.findUnique({
            where: { id },
            select: {
              affiliateUrl: true,
              publishedAt: true,
              source: true,
              title: true,
              amazonTitleManaged: true,
            },
          })
        : null;
      if (previous?.source === "AMAZON_MOCK" && v.status === "PUBLISHED")
        throw new Error(
          "Mock Amazon imports must remain drafts; use genuine Creators API data before publishing.",
        );
      if (v.status === "PUBLISHED" && previous?.publishedAt)
        data.publishedAt = previous.publishedAt;
      result = id
        ? await tx.product.update({
            where: { id },
            data: {
              ...data,
              ...(previous?.amazonTitleManaged && previous.title !== v.title
                ? { amazonTitleManaged: false }
                : {}),
            },
          })
        : await tx.product.create({ data });
      const productId = result.id!;
      await tx.productCategory.deleteMany({ where: { productId } });
      await tx.productImage.deleteMany({ where: { productId } });
      await tx.productRelation.deleteMany({ where: { fromId: productId } });
      await tx.productCategory.createMany({
        data: [...new Set(categoryIds)].map((categoryId, i) => ({
          productId,
          categoryId,
          primary: i === 0,
        })),
      });
      await tx.productImage.createMany({
        data: gallery.map((g, order) => ({ ...g, productId, order })),
      });
      await tx.productRelation.createMany({
        data: [...new Set(relatedProductIds)]
          .filter((toId) => toId !== productId)
          .map((toId) => ({ fromId: productId, toId })),
      });
      if (previous && previous.affiliateUrl !== v.affiliateUrl)
        await audit(tx, admin.id, "affiliate_url_changed", resource, productId);
    } else if (resource === "categories") {
      const v = categorySchema.parse(input);
      await checkCycle(tx, "category", id, v.parentId);
      const reserved = [
        "/admin",
        "/api",
        "/go",
        "/product",
        "/brands",
        "/search",
        "/buying-guides",
        "/dog-breeds",
        "/cat-breeds",
        "/pet-health",
        "/blog",
      ];
      if (reserved.some((p) => v.path === p || v.path.startsWith(p + "/")))
        throw new Error("That path belongs to another content area.");
      const data = { ...v, seo: json(v.seo), aeo: json(v.aeo) };
      result = id
        ? await tx.category.update({ where: { id }, data })
        : await tx.category.create({ data });
    } else if (resource === "brands") {
      const v = brandSchema.parse(input);
      const data = { ...v, seo: json(v.seo), aeo: json(v.aeo) };
      result = id
        ? await tx.brand.update({ where: { id }, data })
        : await tx.brand.create({ data });
    } else if (contentTypes[resource]) {
      const v = contentSchema.parse(input);
      if (v.type !== contentTypes[resource])
        throw new Error("Content type mismatch");
      const healthError = healthPublishError(v);
      if (healthError) throw new Error(healthError);
      if (v.type === "HEALTH" && ["REVIEWED", "PUBLISHED"].includes(v.status)) {
        const reviewer = await tx.author.findUnique({
          where: { id: v.reviewerId! },
        });
        if (
          reviewer?.type !== "Veterinary Reviewer" ||
          !reviewer.credentials?.trim()
        )
          throw new Error(
            "Choose a veterinary reviewer with verified credentials.",
          );
        if (
          new Date(v.reviewedAt!).getTime() > Date.now() ||
          !Number.isFinite(new Date(v.reviewedAt!).getTime())
        )
          throw new Error("Review date must be valid and not in the future.");
      }
      const {
        sources,
        faqs,
        productIds,
        categoryIds,
        relatedContentIds,
        ...fields
      } = v;
      const blockIds = v.blocks.flatMap((b) =>
        b.type === "product" && b.productId
          ? [b.productId]
          : b.type === "comparison"
            ? (b.productIds ?? [])
            : [],
      );
      const ids = [...new Set([...productIds, ...blockIds])];
      if (
        ids.length &&
        (await tx.product.count({ where: { id: { in: ids } } })) !== ids.length
      )
        throw new Error("A product block references a missing product.");
      const original = id
        ? await tx.content.findUnique({
            where: { id, type: v.type },
            select: { publishedAt: true },
          })
        : null;
      if (id && !original)
        throw new Error("Content record not found in this section.");
      const data = {
        ...fields,
        reviewedAt: v.reviewedAt ? new Date(v.reviewedAt) : null,
        publishedAt:
          v.status === "PUBLISHED"
            ? (original?.publishedAt ?? new Date())
            : null,
        blocks: json(v.blocks),
        specialized: json(v.specialized),
        seo: json(v.seo),
        aeo: json(v.aeo),
      };
      result = id
        ? await tx.content.update({ where: { id, type: v.type }, data })
        : await tx.content.create({ data });
      const contentId = result.id!;
      await tx.sourceReference.deleteMany({ where: { contentId } });
      await tx.fAQItem.deleteMany({ where: { contentId } });
      await tx.contentProduct.deleteMany({ where: { contentId } });
      await tx.contentCategory.deleteMany({ where: { contentId } });
      await tx.relatedContent.deleteMany({ where: { fromId: contentId } });
      await tx.sourceReference.createMany({
        data: sources.map((s) => ({ ...s, contentId })),
      });
      await tx.fAQItem.createMany({
        data: faqs.map((f, order) => ({ ...f, order, contentId })),
      });
      await tx.contentProduct.createMany({
        data: ids.map((productId, order) => ({ contentId, productId, order })),
      });
      await tx.contentCategory.createMany({
        data: [...new Set(categoryIds)].map((categoryId) => ({
          contentId,
          categoryId,
        })),
      });
      await tx.relatedContent.createMany({
        data: [...new Set(relatedContentIds)]
          .filter((toId) => toId !== contentId)
          .map((toId) => ({ fromId: contentId, toId })),
      });
    } else if (resource === "authors") {
      const v = authorSchema.parse(input);
      const data = { ...v, socialLinks: json(v.socialLinks) };
      result = id
        ? await tx.author.update({ where: { id }, data })
        : await tx.author.create({ data });
    } else if (resource === "navigation") {
      const v = navSchema.parse(input);
      await checkCycle(tx, "navigationItem", id, v.parentId);
      result = id
        ? await tx.navigationItem.update({ where: { id }, data: v })
        : await tx.navigationItem.create({ data: v });
    } else if (resource === "settings" || resource === "homepage") {
      if (admin.role !== "OWNER")
        throw new Error("Only owners can change site settings.");
      const v = siteSettings.parse(input);
      result = await tx.siteSetting.upsert({
        where: { key: "site" },
        create: { key: "site", value: json(v) },
        update: { value: json(v) },
      });
    } else if (resource === "users") {
      if (admin.role !== "OWNER")
        throw new Error("Only owners can manage administrators.");
      const v = z
        .object({
          name: z.string().min(2),
          email: z.email(),
          password: z.string().min(12).max(200).optional(),
          role: z.enum(["OWNER", "EDITOR"]),
          active: z.boolean(),
        })
        .parse(input);
      if (!id && !v.password)
        throw new Error("A password of at least 12 characters is required.");
      if (id === admin.id && (!v.active || v.role !== "OWNER"))
        throw new Error("You cannot disable or demote your own owner account.");
      const { password, ...fields } = v;
      const data = {
        ...fields,
        email: v.email.toLowerCase(),
        ...(password ? { passwordHash: await hash(password, 12) } : {}),
      };
      result = id
        ? await tx.adminUser.update({
            where: { id },
            data,
            select: { id: true },
          })
        : await tx.adminUser.create({
            data: { ...data, passwordHash: await hash(password!, 12) },
            select: { id: true },
          });
    } else throw new Error("Unsupported resource");
    await audit(
      tx,
      admin.id,
      id ? "updated" : "created",
      resource,
      result.id ?? result.key,
    );
    return result;
  });
}
const siteSettings = z.object({
  demoMode: z.boolean().default(true),
  siteName: z.string().min(2),
  contactEmail: z.union([z.email(), z.literal("")]),
  organizationName: z.string().min(2),
  defaultTitle: z.string().min(2),
  defaultDescription: z.string(),
  affiliateDisclosure: z.string().min(10),
  heroTitle: z.string().min(2),
  heroSubtitle: z.string(),
  heroButtonText: z.string(),
  heroButtonUrl: z.string().regex(/^\/(?!\/)/),
  heroImage: z.string(),
  featuredProductIds: z.array(z.string()),
  featuredCategoryIds: z.array(z.string()),
  featuredBrandIds: z.array(z.string()),
  featuredContentIds: z.array(z.string()),
  sectionOrder: z.array(
    z.enum([
      "pets",
      "categories",
      "products",
      "brands",
      "guides",
      "advice",
      "newsletter",
    ]),
  ),
  hiddenSections: z.array(z.string()),
  footerText: z.string(),
  socialProfiles: z.record(z.string(), externalUrl),
  googleAnalyticsId: z.string().regex(/^(G-[A-Z0-9]+)?$/),
  searchConsoleVerification: z.string(),
  defaultMedicalDisclaimer: z.string(),
  logo: z.string().optional(),
  favicon: z.string().optional(),
  defaultSocialImage: z.string().optional(),
  defaultAuthorId: z.string().optional(),
});
async function checkCycle(
  tx: Tx,
  table: "category" | "navigationItem",
  id: string | null,
  parentId: string | null,
) {
  const seen = new Set<string>();
  let parent = parentId;
  while (parent) {
    if (parent === id || seen.has(parent))
      throw new Error("Hierarchy cannot contain a cycle.");
    seen.add(parent);
    const row =
      table === "category"
        ? await tx.category.findUnique({
            where: { id: parent },
            select: { parentId: true },
          })
        : await tx.navigationItem.findUnique({
            where: { id: parent },
            select: { parentId: true },
          });
    if (!row) throw new Error("Parent does not exist");
    parent = row.parentId;
  }
}
export async function audit(
  tx: Tx,
  adminId: string,
  action: string,
  entity: string,
  entityId?: string,
) {
  await tx.auditLog.create({ data: { adminId, action, entity, entityId } });
}
export async function remove(
  resource: string,
  id: string,
  admin: { id: string; role: string },
) {
  if (["users", "settings", "homepage"].includes(resource))
    throw new Error("Deletion is not supported here.");
  return db.$transaction(async (tx) => {
    if (resource === "products") await tx.product.delete({ where: { id } });
    else if (resource === "categories")
      await tx.category.delete({ where: { id } });
    else if (resource === "brands") await tx.brand.delete({ where: { id } });
    else if (resource === "authors") await tx.author.delete({ where: { id } });
    else if (resource === "navigation")
      await tx.navigationItem.delete({ where: { id } });
    else if (contentTypes[resource])
      await tx.content.delete({ where: { id, type: contentTypes[resource] } });
    else throw new Error("Unsupported resource");
    await audit(tx, admin.id, "deleted", resource, id);
  });
}
