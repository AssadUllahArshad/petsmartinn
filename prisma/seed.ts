import { PrismaClient, Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import {
  demoProducts,
  demoCategories,
  demoBrands,
  demoContent,
  defaultSettings,
} from "../lib/demo";
const db = new PrismaClient();
async function main() {
  for (const c of demoCategories)
    await db.category.upsert({
      where: { slug: c.slug },
      create: {
        ...c,
        status: "PUBLISHED",
        order: demoCategories.indexOf(c),
        seo: { noindex: true },
      },
      update: {},
    });
  const extra = [
    [
      "no-pull-harnesses",
      "No pull harnesses",
      "demo-harnesses",
      "/dogs/no-pull-harnesses",
    ],
    ["car-harnesses", "Car harnesses", "demo-harnesses", "/dogs/car-harnesses"],
    ["seat-belts", "Seat belts", "demo-car", "/dogs/seat-belts"],
    ["hoodies", "Hoodies", "demo-clothing", "/dogs/clothing/hoodies"],
    ["socks", "Dog socks", "demo-paws", "/dogs/socks"],
    ["non-slip-socks", "Non slip socks", "demo-paws", "/dogs/non-slip-socks"],
    ["paw-pads", "Paw pads", "demo-paws", "/dogs/paw-pads"],
    ["paw-wax", "Paw wax", "demo-paws", "/dogs/paw-wax"],
  ];
  for (const [slug, name, parentId, path] of extra)
    await db.category.upsert({
      where: { slug },
      create: {
        slug,
        name,
        parentId,
        path,
        status: "DRAFT",
        intro: "Add verified, original buying advice before publishing.",
      },
      update: {},
    });
  for (const b of demoBrands)
    await db.brand.upsert({
      where: { slug: b.slug },
      create: {
        ...b,
        status: "PUBLISHED",
        body: "Fictional development brand. Replace with genuine brand information before launch.",
        seo: { noindex: true },
      },
      update: {},
    });
  for (const p of demoProducts) {
    const { brand, categories, images, seo, aeo, status, ...fields } = p;
    await db.product.upsert({
      where: { slug: p.slug },
      create: {
        ...fields,
        status: "PUBLISHED",
        seo: { noindex: true },
        aeo: {},
        categories: {
          create: categories.map((c) => ({
            categoryId: c.category.id,
            primary: c.primary,
          })),
        },
      },
      update: {},
    });
  }
  for (const c of demoContent) {
    await db.content.upsert({
      where: { type_slug: { type: c.type as "BLOG", slug: c.slug } },
      create: {
        id: c.id,
        type: c.type as "BLOG",
        title: c.title,
        slug: c.slug,
        species: c.species,
        excerpt: c.excerpt,
        image: c.image,
        imageAlt: c.imageAlt,
        blocks: c.blocks as Prisma.InputJsonValue,
        aeo: c.aeo,
        seo: { noindex: true },
        status: "PUBLISHED",
        publishedAt: c.publishedAt,
        products: {
          create: c.products.map((p) => ({ productId: p.product.id })),
        },
      },
      update: {},
    });
  }
  for (const [type, slug, title] of [
    [
      "DOG_BREED",
      "hypoallergenic-dogs",
      "Hypoallergenic dogs: editorial planning guide",
    ],
    ["DOG_BREED", "newfoundland-dog", "Newfoundland dog breed profile"],
    ["CAT_BREED", "persian-cat", "Persian cat breed profile"],
    [
      "CAT_BREED",
      "hypoallergenic-cats",
      "Hypoallergenic cats: editorial planning guide",
    ],
    ["HEALTH", "kennel-cough", "Kennel cough: veterinary review required"],
  ] as const)
    await db.content.upsert({
      where: { type_slug: { type, slug } },
      create: {
        type,
        slug,
        title,
        status: "DRAFT",
        species: type === "CAT_BREED" ? "cats" : "dogs",
        excerpt:
          "Draft template. Add verified sources and original editorial content before publishing.",
        blocks: [],
        specialized: {},
        seo: { noindex: true },
      },
      update: {},
    });
  for (const [slug, title, text] of [
    [
      "about",
      "About Petsmartinn",
      "We are an independent pet product discovery website. We are not affiliated with PetSmart.",
    ],
    [
      "contact",
      "Contact",
      "Configure a verified contact email in Site Settings before launch.",
    ],
    [
      "affiliate-disclosure",
      "Affiliate disclosure",
      defaultSettings.affiliateDisclosure,
    ],
    [
      "privacy-policy",
      "Privacy policy",
      "Development draft: affiliate clicks store product identifiers, timestamps, source paths, referrer hostnames, campaign labels, and broad device categories. Click analytics do not store visitor IP addresses. Admin sessions use authentication cookies. Define retention and user-rights procedures before launch.",
    ],
    [
      "terms",
      "Terms and conditions",
      "Product purchases take place with external merchants. Confirm prices, specifications, and merchant terms before buying. This draft requires review before launch.",
    ],
    [
      "editorial-policy",
      "Editorial policy",
      "Verify factual claims and sources. Clearly disclose affiliate links. Maintain original content and identify authors.",
    ],
    [
      "medical-review-policy",
      "Medical review policy",
      "Health content must complete veterinary review before publication. Do not invent credentials, create unsourced dosage charts, or provide personal prescription advice.",
    ],
  ])
    await db.content.upsert({
      where: { type_slug: { type: "PAGE", slug } },
      create: {
        type: "PAGE",
        slug,
        title,
        status: "PUBLISHED",
        publishedAt: new Date(),
        blocks: [
          { type: "paragraph", text },
          {
            type: "callout",
            text: "Policy draft: review and adapt to actual business practices before launch.",
          },
        ],
        seo: { noindex: true },
      },
      update: {},
    });
  await db.siteSetting.upsert({
    where: { key: "site" },
    create: { key: "site", value: defaultSettings },
    update: {},
  });
  for (const [i, label, href] of [
    ["nav-dogs", "Dogs", "/dogs"],
    ["nav-cats", "Cats", "/cats"],
    ["nav-brands", "Brands", "/brands"],
    ["nav-guides", "Buying guides", "/buying-guides"],
    ["nav-dog-breeds", "Dog breeds", "/dog-breeds"],
    ["nav-cat-breeds", "Cat breeds", "/cat-breeds"],
    ["nav-health", "Pet health", "/pet-health"],
  ])
    await db.navigationItem.upsert({
      where: { id: i },
      create: {
        id: i,
        label,
        href,
        order: [
          "nav-dogs",
          "nav-cats",
          "nav-brands",
          "nav-guides",
          "nav-dog-breeds",
          "nav-cat-breeds",
          "nav-health",
        ].indexOf(i),
      },
      update: {},
    });
  for (const c of demoCategories.filter((c) => c.parentId === "demo-dogs"))
    await db.navigationItem.upsert({
      where: { id: "nav-" + c.slug },
      create: {
        id: "nav-" + c.slug,
        label: c.name,
        href: c.path,
        parentId: "nav-dogs",
      },
      update: {},
    });
  const email = process.env.SEED_ADMIN_EMAIL,
    password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    if (password.length < 12)
      throw new Error("Admin password must be at least 12 characters.");
    await db.adminUser.upsert({
      where: { email: email.toLowerCase() },
      create: {
        email: email.toLowerCase(),
        name: "Site owner",
        role: "OWNER",
        passwordHash: await hash(password, 12),
      },
      update: {},
    });
    console.log(
      "Administrator created or already exists. Existing passwords are not overwritten.",
    );
  }
  console.log(
    "Seed complete: 8 fictional products, category hierarchy, fictional brands, public demo guides, policy drafts, and unpublished breed/health templates.",
  );
}
main().finally(() => db.$disconnect());
