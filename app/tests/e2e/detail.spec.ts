import { test, expect } from "@playwright/test";

test("opening an item shows detail with metrics", async ({ page }) => {
  await page.goto("/gallery");
  await page.getByTestId("gallery-card").first().click();
  await expect(page).toHaveURL(/\/item\//);
  await expect(page.getByRole("heading", { name: /Item|Reconstruction/i })).toBeVisible();
  await expect(page.getByTestId("metric").first()).toBeVisible();
});

test("a non-displayable item shows the masked-source placeholder", async ({ page }) => {
  // item 0002 = license 2 (NC) in the fixture => source hidden
  await page.goto("/item/0002");
  await expect(page.getByText(/Source hidden/i)).toBeVisible();
});

test("unknown id shows a graceful not-found page", async ({ page }) => {
  await page.goto("/item/9999");
  await expect(page.getByText(/not found/i)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByText(/← Gallery/)).toBeVisible();
});
