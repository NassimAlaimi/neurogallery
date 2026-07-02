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
  await page.getByLabel("Catégorie").selectOption("animal");
  await expect(page).toHaveURL(/category=animal/);
  await expect(await cards.count()).toBeLessThanOrEqual(initial);
});
