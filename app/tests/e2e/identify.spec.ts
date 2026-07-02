import { test, expect } from "@playwright/test";

test("plays one identification round", async ({ page }) => {
  await page.goto("/identify");
  await expect(page.getByTestId("identify-recon")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const options = page.getByTestId("identify-option");
  await expect(options.first()).toBeVisible();
  await options.first().click();
  await expect(page.getByTestId("identify-feedback")).toBeVisible();
});
