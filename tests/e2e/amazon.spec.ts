import { test, expect } from "@playwright/test";
const origin = process.env.TEST_BASE_URL || "http://localhost:3000";
const email = process.env.TEST_ADMIN_EMAIL,
  password = process.env.TEST_ADMIN_PASSWORD;
test("Amazon Finder category ranking, accessible preview, draft import, deduplication and sync", async ({
  page,
}, info) => {
  test.skip(!email || !password, "Requires a seeded development database");
  test.setTimeout(90000);
  page.setDefaultTimeout(10000);
  const asin = info.project.name === "desktop" ? "MOCK000001" : "MOCK000007";
  let productId: string | undefined;
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  try {
    await page
      .getByRole("link", { name: "Amazon Product Finder", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Amazon Product Finder" }),
    ).toBeVisible();
    await expect(
      page.getByText("Mock mode — fictional fixtures.", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Sort by", exact: true }),
    ).toHaveValue("expected");
    await expect(
      page.getByLabel("Only Exact Category Matches", { exact: true }),
    ).toBeChecked();
    await expect(
      page.getByLabel("Allow Related Category Fallback", { exact: true }),
    ).toBeChecked();
    await page
      .getByRole("button", { name: "Search Amazon", exact: true })
      .click();
    const results = page.locator(".amazon-result");
    await expect(results).toHaveCount(20);
    const texts = await results.allTextContents();
    expect(texts.findIndex((t) => t.includes("MOCK000001"))).toBeLessThan(
      texts.findIndex((t) => t.includes("MOCK000002")),
    );
    await expect(
      page.getByRole("heading", { name: "Mock Expensive Dog Food" }),
    ).toHaveCount(0);
    const card = results.filter({ hasText: asin });
    await card.getByText("Score breakdown", { exact: true }).click();
    await expect(
      card.getByRole("cell", { name: /Conversion Potential/ }),
    ).toBeVisible();
    await expect(
      card.getByRole("row", { name: /Final Expected Earnings Score/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/private/tmp/petsmartinn-amazon-results-${info.project.name}.png`,
      fullPage: true,
    });
    await card.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Import preview" }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(
      "Draft · Mock fixture; cannot publish",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await card.getByRole("button", { name: "Preview", exact: true }).click();
    await page.getByRole("button", { name: "Import as Draft" }).click();
    await expect(page.getByRole("status")).toContainText("1 imported as Draft");
    await expect(card).toContainText("Already Imported");
    const edit = card.getByRole("link", { name: /Edit draft/ });
    productId = (await edit.getAttribute("href"))!.split("/").at(-1);
    const search = await page.request.post("/api/admin/amazon/search", {
      headers: { Origin: origin },
      data: {
        categoryId: await page
          .getByRole("combobox", {
            name: "Target Petsmartinn Category",
            exact: true,
          })
          .inputValue(),
        minPrice: "",
        maxPrice: "",
      },
    });
    expect(search.ok()).toBe(true);
    const batch = await search.json();
    const duplicate = await page.request.post("/api/admin/amazon/import", {
      headers: { Origin: origin },
      data: { batchId: batch.batchId, asins: [asin] },
    });
    expect(duplicate.ok()).toBe(true);
    expect((await duplicate.json()).duplicates).toEqual([asin]);
    const invalid = await page.request.post("/api/admin/amazon/search", {
      headers: { Origin: origin },
      data: {
        categoryId: await page
          .getByRole("combobox", {
            name: "Target Petsmartinn Category",
            exact: true,
          })
          .inputValue(),
        minPrice: "not-a-price",
      },
    });
    expect(invalid.status()).toBe(400);
    expect((await invalid.json()).error).toContain("minPrice");
    await edit.click();
    await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
      "DRAFT",
    );
    await page
      .getByLabel("Product name", { exact: true })
      .fill("Manually edited Finder fixture " + info.project.name);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    await page.goto("/admin/amazon/imported");
    const imported = page.getByRole("row").filter({ hasText: asin });
    await expect(imported).toContainText("DRAFT");
    await imported.getByRole("button", { name: "Sync managed fields" }).click();
    await expect(page.getByRole("status")).toContainText("1 product synced");
    await expect(imported).toContainText("Manually edited Finder fixture");
    const draft = await page.request.get("/go/" + productId, {
      maxRedirects: 0,
    });
    expect(draft.status()).toBe(404);
    await page.goto("/admin/amazon/logs");
    await expect(
      page.getByRole("heading", { name: "Amazon logs" }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "duplicate", exact: true }).first(),
    ).toBeVisible();
    await page.goto("/admin/amazon/import-rules");
    await expect(
      page.getByRole("heading", { name: "Amazon import rules" }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", {
        name: /Approved related-category fallback order/,
      }),
    ).toHaveValue(
      /No-Pull Harnesses[\s\S]*Walking Harnesses[\s\S]*Car Harnesses[\s\S]*Dog Walking Gear/,
    );
    await page.goto("/admin/settings/amazon");
    await expect(
      page.getByRole("heading", { name: "Amazon settings" }),
    ).toBeVisible();
    await expect(
      page.getByText("AMAZON_CREATOR_CREDENTIAL_SECRET", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Mock — fictional test fixtures", { exact: true }),
    ).toBeVisible();
    await page.goto("/admin/amazon/product-finder");
    await page.screenshot({
      path: `/private/tmp/petsmartinn-amazon-${info.project.name}.png`,
      fullPage: true,
    });
  } finally {
    if (productId) {
      test.setTimeout(test.info().timeout + 10000);
      const r = await page.request.delete("/api/admin/products/" + productId, {
        headers: { Origin: origin },
      });
      expect(r.ok()).toBe(true);
    }
  }
});
test("Amazon actions reject unauthenticated and cross-origin requests", async ({
  request,
}) => {
  const unauthorized = await request.post("/api/admin/amazon/search", {
    headers: { Origin: origin },
    data: { categoryId: "demo-harnesses" },
  });
  expect(unauthorized.status()).toBe(401);
  const crossOrigin = await request.post("/api/admin/amazon/import", {
    headers: { Origin: "https://untrusted.example" },
    data: {},
  });
  expect(crossOrigin.status()).toBe(403);
});
