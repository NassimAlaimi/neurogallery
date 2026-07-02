import { test, expect } from "@playwright/test";

for (const path of ["/", "/gallery"]) {
  test(`page ${path} has exactly one h1 and reachable nav`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("navigation")).toBeVisible();
  });
}

test("respects reduced motion (no crash, content visible)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/gallery");
  await expect(page.getByTestId("gallery-card").first()).toBeVisible();
});
