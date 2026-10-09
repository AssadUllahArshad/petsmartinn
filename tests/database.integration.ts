import { GET as redirectGET } from "../app/go/[productId]/route";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { mutate, remove } from "../lib/admin/mutations";
import { products, product, article } from "../lib/catalog";
import { demoProducts } from "../lib/demo";
const stamp = Date.now();
const adminPromise = db.adminUser.findFirstOrThrow({
  where: { role: "OWNER" },
});
let admin: Awaited<typeof adminPromise>;

const created: { resource: string; id: string }[] = [];
after(async () => {
  admin = await adminPromise;
  for (const item of created.reverse())
    await remove(item.resource, item.id, admin).catch(() => {});
  await db.$disconnect();
});
test("product CRUD preserves URL and draft visibility; category and product blocks are relational", async () => {
  admin = await adminPromise;
  const category = await mutate(
    "categories",
    null,
    {
      name: "Integration category " + stamp,
      slug: "integration-" + stamp,
      path: "/dogs/integration-" + stamp,
      parentId: "demo-dogs",
      image: "/images/product-harness.svg",
      icon: "paw",
      intro: "Original introduction",
      body: "Useful category advice",
      featured: false,
      status: "PUBLISHED",
      order: 99,
      seo: {},
      aeo: {},
    },
    admin,
  );
  created.push({ resource: "categories", id: category.id! });
  const url =
    "https://www.amazon.com/dp/B123456789?tag=owner-20&subtag=a%2Fb&x=1&x=2";
  const input = {
    ...demoProducts[0],
    title: "Integration product " + stamp,
    slug: "integration-" + stamp,
    brandId: "demo-trail",
    affiliateUrl: url,
    status: "DRAFT",
    categoryIds: [category.id!],
    relatedProductIds: [],
    gallery: [],
  };
  const p = await mutate("products", null, input, admin);
  created.push({ resource: "products", id: p.id! });
  assert.equal(
    (await db.product.findUniqueOrThrow({ where: { id: p.id } })).affiliateUrl,
    url,
  );
  assert.equal(await product(input.slug), null);
  await mutate("products", p.id!, { ...input, status: "PUBLISHED" }, admin);
  assert.equal((await product(input.slug))?.affiliateUrl, url);
  const before = await db.affiliateClick.count({ where: { productId: p.id } });
  const response = await redirectGET(
    new Request(
      "http://localhost:3000/go/" +
        p.id +
        "?source=/product/test&campaign=test",
      {
        headers: {
          referer: "https://source.example/private?secret=x",
          "user-agent": "Mobile",
        },
      },
    ),
    { params: Promise.resolve({ productId: p.id! }) },
  );
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), url);
  assert.equal(
    await db.affiliateClick.count({ where: { productId: p.id } }),
    before + 1,
  );
  const click = await db.affiliateClick.findFirstOrThrow({
    where: { productId: p.id },
    orderBy: { createdAt: "desc" },
  });
  assert.equal(click.referrer, "source.example");
  assert.equal(click.device, "mobile");
  assert.equal(
    (await products({ q: "Integration product " + stamp })).total,
    1,
  );
  const guide = await mutate(
    "buying-guides",
    null,
    {
      type: "BUYING_GUIDE",
      title: "Integration guide " + stamp,
      slug: "guide-" + stamp,
      species: "dogs",
      excerpt: "An original guide",
      image: "",
      imageAlt: "",
      blocks: [{ type: "product", productId: p.id!, label: "Top pick" }],
      specialized: {},
      seo: { title: "Independent SEO title" },
      aeo: { directAnswer: "A sourced, concise summary." },
      tags: [],
      authorId: null,
      reviewerId: null,
      reviewedAt: null,
      emergencyWarning: "",
      disclaimer: "",
      status: "PUBLISHED",
      productIds: [],
      categoryIds: [category.id!],
      relatedContentIds: [],
      faqs: [],
      sources: [],
    },
    admin,
  );
  created.push({ resource: "buying-guides", id: guide.id! });
  const content = await article("BUYING_GUIDE", "guide-" + stamp);
  assert.equal(content?.products.length, 1);
  assert.equal(content?.products[0].product.affiliateUrl, url);
  await mutate(
    "products",
    p.id!,
    { ...input, status: "PUBLISHED", affiliateUrl: url + "&updated=1" },
    admin,
  );
  const updated = await article("BUYING_GUIDE", "guide-" + stamp);
  assert.equal(updated?.products[0].product.affiliateUrl, url + "&updated=1");
  assert.ok(
    await db.auditLog.count({
      where: { entityId: p.id, action: "affiliate_url_changed" },
    }),
  );
  await assert.rejects(
    mutate(
      "categories",
      category.id!,
      {
        name: "Cycle",
        slug: "integration-" + stamp,
        path: "/dogs/integration-" + stamp,
        parentId: category.id!,
        image: "/images/product-harness.svg",
        intro: "",
        body: "",
        featured: false,
        status: "DRAFT",
        order: 0,
        seo: {},
        aeo: {},
      },
      admin,
    ),
    /cycle/,
  );
});
test("health publication rejects unreviewed content", async () => {
  admin = await adminPromise;
  await assert.rejects(
    mutate(
      "pet-health",
      null,
      {
        type: "HEALTH",
        title: "Draft health " + stamp,
        slug: "health-" + stamp,
        species: "dogs",
        excerpt: "",
        image: "",
        imageAlt: "",
        blocks: [],
        specialized: {},
        seo: {},
        aeo: {},
        tags: [],
        authorId: null,
        reviewerId: null,
        reviewedAt: null,
        emergencyWarning: "",
        disclaimer: "",
        status: "PUBLISHED",
        productIds: [],
        categoryIds: [],
        relatedContentIds: [],
        faqs: [],
        sources: [],
      },
      admin,
    ),
    /reviewer/,
  );
});
