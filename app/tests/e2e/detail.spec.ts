import { test, expect } from "@playwright/test";

test("opening an item shows detail with metrics", async ({ page }) => {
  await page.goto("/gallery");
  await page.getByTestId("gallery-card").first().click();
  await expect(page).toHaveURL(/\/item\//);
  await expect(page.getByRole("heading", { name: /Item|Reconstruction/i })).toBeVisible();
  await expect(page.getByTestId("metric").first()).toBeVisible();
});

test("a non-displayable item shows the masked-source placeholder", async ({ page }) => {
  // item 0002 = licence 2 (NC) dans le fixture => source masquée
  await page.goto("/item/0002");
  await expect(page.getByText(/Source masquée/i)).toBeVisible();
});
