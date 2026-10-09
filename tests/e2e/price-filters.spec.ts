import { test, expect } from "@playwright/test";
test("price filters handle blank bounds and invalid URL input on the server", async ({
  page,
}) => {
  await page.goto("/dogs", { waitUntil: "networkidle" });
  const all = await page.locator(".product-title").allTextContents();
  expect(all).toContain("Everyday adventure harness");
  async function titles(query: string) {
    await page.goto("/dogs?" + query, { waitUntil: "networkidle" });
    await expect(page.locator(".result-count")).toBeVisible();
    return page.locator(".product-title").allTextContents();
  }
  expect(await titles("min=&max=")).toEqual(all);
  expect(await titles("min=%20%20&max=%20")).toEqual(all);
  expect(await titles("min=&max=30")).toContain("Weekend rope leash");
  expect(await titles("min=&max=30")).not.toContain(
    "Everyday adventure harness",
  );
  expect(await titles("min=30&max=")).toContain("Everyday adventure harness");
  expect(await titles("min=30&max=")).not.toContain("Weekend rope leash");
  expect(await titles("min=20&max=35")).toContain("Everyday adventure harness");
  expect(await titles("min=invalid&max=NaN")).toEqual(all);
  expect(await titles("min=-1&max=Infinity")).toEqual(all);
  expect(await titles("min=20&min=30&max=")).toEqual(all);
  expect(await titles("min=0&max=0")).toEqual([]);
  expect(await titles("min=100&max=20")).toEqual([]);
  // Exercise the actual form with only one bound filled, including mobile collapse.
  await page.goto("/dogs", { waitUntil: "networkidle" });
  const panel = page.locator(".filter-panel");
  if (!(await panel.evaluate((e) => (e as HTMLDetailsElement).open)))
    await panel.locator("summary").click();
  await panel.getByLabel("Minimum price", { exact: true }).fill("30");
  await panel.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/min=30/);
  await expect(
    page.locator(".product-title", { hasText: "Everyday adventure harness" }),
  ).toBeVisible();
  await expect(page.getByLabel("Maximum price", { exact: true })).toHaveValue(
    "",
  );
});
