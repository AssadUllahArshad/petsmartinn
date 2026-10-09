import { test, expect } from "@playwright/test";
test("mock paw products use appropriate images and simulated rates; leashes remain harness fallback", async ({
  page,
}, info) => {
  const email = process.env.TEST_ADMIN_EMAIL,
    password = process.env.TEST_ADMIN_PASSWORD;
  test.skip(!email || !password, "Requires a seeded local test account");
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/amazon/product-finder");
  const category = page.getByRole("combobox", {
    name: "Target Petsmartinn Category",
    exact: true,
  });
  await category.selectOption("demo-paws");
  await page
    .getByRole("button", { name: "Search Amazon", exact: true })
    .click();
  const cards = page.locator(".amazon-result");
  await expect(cards).toHaveCount(20);
  for (const kind of [
    "Paw Socks",
    "Paw Balm",
    "Paw Boots",
    "Paw Pads",
    "Paw Wax",
  ])
    await expect(cards.filter({ hasText: kind })).toHaveCount(4);
  await expect(
    cards.locator(".amazon-match", { hasText: "Exact match" }),
  ).toHaveCount(20);
  await expect(
    cards.getByText("Simulated commission rate", { exact: true }),
  ).toHaveCount(19);
  await expect(
    cards.getByText("Owner-verified rule rate", { exact: true }),
  ).toHaveCount(0);
  for (const label of [
    "Price · Mock data",
    "Rating · Mock data",
    "Review Count · Mock data",
  ])
    await expect(cards.getByText(label, { exact: true })).toHaveCount(20);
  const urls = await cards
    .locator("img")
    .evaluateAll((images) =>
      images.map((i) => (i as HTMLImageElement).getAttribute("src")),
    );
  expect(urls.filter((url) => url === "/images/retail/balm.webp")).toHaveLength(
    4,
  );
  expect(
    urls.filter((url) => url === "/images/retail/socks.webp"),
  ).toHaveLength(4);
  expect(urls).toHaveLength(8);
  await expect(
    cards.getByText("Image not provided", { exact: true }),
  ).toHaveCount(12);
  const socks = cards.filter({ hasText: "Paw Socks" }).first();
  await socks.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Simulated fixture commission; not an Amazon rate",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/private/tmp/petsmartinn-mock-paws-${info.project.name}.png`,
    fullPage: true,
  });
  await category.selectOption("demo-harnesses");
  await page.getByLabel("Maximum Results", { exact: true }).fill("100");
  await page
    .getByLabel("Only Exact Category Matches", { exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "Search Amazon", exact: true })
    .click();
  await expect(cards).toHaveCount(21);
  const leash = cards.filter({ hasText: "Walking Gear Leash" });
  await expect(leash.locator(".amazon-match")).toHaveText("Related fallback");
  await expect(leash.locator("img")).toHaveAttribute(
    "src",
    "/images/retail/leash.webp",
  );
  await expect(leash).toContainText("Approved related-category fallback");
  await expect(cards.filter({ hasText: "Food" })).toHaveCount(0);
});
