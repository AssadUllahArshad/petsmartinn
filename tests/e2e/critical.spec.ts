import { test, expect } from "@playwright/test";
const email = process.env.TEST_ADMIN_EMAIL,
  password = process.env.TEST_ADMIN_PASSWORD;
test("public discovery, search, demo product, and protected admin", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /everything your pet needs/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /cart|checkout/i })).toHaveCount(
    0,
  );
  await page.goto("/search?q=harness");
  await expect(
    page.getByRole("heading", { name: /results for/i }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Everyday adventure harness", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Everyday adventure harness" }),
  ).toBeVisible();
  const r = await request.get("/go/demo-product-0?source=/product/test", {
    maxRedirects: 0,
  });
  expect(r.status()).toBe(302);
  expect(r.headers().location).toBe(
    "https://example.com/?affiliate=development&product=0",
  );
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/admin\/login/);
  const unauthorized = await request.post("/api/admin/products", {
    data: { title: "Unauthorized" },
    headers: { Origin: process.env.TEST_BASE_URL || "http://localhost:3000" },
  });
  expect(unauthorized.status()).toBe(401);
  await page.goto("/");
  await page
    .getByRole("link", { name: "Affiliate disclosure", exact: true })
    .scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `/private/tmp/petsmartinn-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("owner login and affiliate product CRUD", async ({ page }) => {
  test.skip(
    !email || !password,
    "Requires a seeded test database and explicit test credentials",
  );
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/products/new");
  const stamp = Date.now();
  await page
    .getByLabel("Product name", { exact: true })
    .fill("Test affiliate product " + stamp);
  await page
    .getByLabel("Slug", { exact: true })
    .fill("test-affiliate-" + stamp);
  await page.getByLabel("Status", { exact: true }).selectOption("PUBLISHED");
  await page.getByLabel("Display price", { exact: true }).fill("34.99");
  await page.getByRole("tab", { name: "Affiliate", exact: true }).click();
  const url =
    "https://www.amazon.com/dp/B123456789?tag=owner-20&subtag=a%2Fb&x=1&x=2";
  await page.getByLabel("Affiliate URL", { exact: true }).fill(url);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await page
    .getByRole("row")
    .filter({ hasText: "Test affiliate product " + stamp })
    .getByRole("link", { name: /edit/i })
    .click();
  await expect(page).toHaveURL(/\/admin\/products\/(?!new)[a-z0-9]+$/);
  const id = page.url().split("/").at(-1)!;
  await page.getByRole("tab", { name: "Affiliate", exact: true }).click();
  await expect(page.getByLabel("Affiliate URL", { exact: true })).toHaveValue(
    url,
  );
  const r = await page.request.get("/go/" + id + "?source=/product/test", {
    maxRedirects: 0,
  });
  expect(r.status()).toBe(302);
  expect(r.headers().location).toBe(url);
  await page.goto("/admin/categories/new");
  await page
    .getByLabel("Category name", { exact: true })
    .fill("Test category " + stamp);
  await page.getByLabel("Slug", { exact: true }).fill("test-category-" + stamp);
  await page
    .getByLabel("Public URL path", { exact: true })
    .fill("/dogs/test-category-" + stamp);
  await page.getByLabel("Status", { exact: true }).selectOption("PUBLISHED");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/categories$/);
  await page
    .getByRole("row")
    .filter({ hasText: "Test category " + stamp })
    .getByRole("link", { name: /edit/i })
    .click();
  await expect(page).toHaveURL(/\/admin\/categories\/(?!new)[a-z0-9]+$/);
  const categoryId = page.url().split("/").at(-1)!;
  await page.goto("/admin/buying-guides/new");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Test buying guide " + stamp);
  await page.getByLabel("Slug", { exact: true }).fill("test-guide-" + stamp);
  await page
    .getByLabel("Editorial status", { exact: true })
    .selectOption("PUBLISHED");
  await page.getByLabel("Block type", { exact: true }).selectOption("product");
  await page.getByRole("button", { name: "+ Add block" }).click();
  await page
    .getByRole("combobox", { name: "Product", exact: true })
    .selectOption(id);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/buying-guides$/);
  await page
    .getByRole("row")
    .filter({ hasText: "Test buying guide " + stamp })
    .getByRole("link", { name: /edit/i })
    .click();
  await expect(page).toHaveURL(/\/admin\/buying-guides\/(?!new)[a-z0-9]+$/);
  const guideId = page.url().split("/").at(-1)!;
  await page.goto("/buying-guides/test-guide-" + stamp);
  await expect(
    page
      .getByRole("link", {
        name: "Test affiliate product " + stamp,
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await page.goto("/admin/products/" + id);
  await page.getByRole("tab", { name: "Content", exact: true }).click();
  await page
    .getByLabel("Product name", { exact: true })
    .fill("Edited test " + stamp);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await page.goto("/product/test-affiliate-" + stamp);
  await expect(
    page.getByRole("heading", { name: "Edited test " + stamp }),
  ).toBeVisible();
  await page.goto("/admin/affiliate-clicks");
  await expect(
    page.getByText("Test affiliate product " + stamp).first(),
  ).toBeVisible();
  await page.goto("/admin");
  await page.screenshot({
    path: `/private/tmp/petsmartinn-admin-${test.info().project.name}.png`,
    fullPage: true,
  });
  for (const [resource, record] of [
    ["buying-guides", guideId],
    ["categories", categoryId],
  ]) {
    const response = await page.request.delete(
      `/api/admin/${resource}/${record}`,
      {
        headers: {
          Origin: process.env.TEST_BASE_URL || "http://localhost:3000",
        },
      },
    );
    expect(response.ok()).toBe(true);
  }
  await page.goto("/admin/products/" + id);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete record" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
});
