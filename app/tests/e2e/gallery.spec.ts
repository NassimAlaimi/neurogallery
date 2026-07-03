import { test, expect } from "@playwright/test";

test("home loads with title and citations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/NSD|Natural Scenes/i)).toBeVisible();
});

test("gallery lists items and filters by category", async ({ page }) => {
  await page.goto("/gallery");
  const cards = page.getByTestId("gallery-card");
  await expect(cards.first()).toBeVisible();
  const initial = await cards.count();
  await page.getByLabel("Category").selectOption("animal");
  await expect(page).toHaveURL(/category=animal/);
  await expect(await cards.count()).toBeLessThanOrEqual(initial);
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("gallery is usable and has no horizontal overflow at 375px", async ({ page }) => {
    await page.goto("/gallery");
    const cards = page.getByTestId("gallery-card");
    await expect(cards.first()).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBeTruthy();
  });
});
