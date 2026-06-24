import { test, expect } from "@playwright/test";

test.describe("rapid gate switch", () => {
  test("switching gates does not throw", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const gateRows = page.locator('[class*="cursor-pointer"]').filter({ hasText: /Click to filter|Selected/ });
    const count = await gateRows.count();
    if (count < 2) {
      test.skip();
      return;
    }

    for (let i = 0; i < Math.min(10, count); i++) {
      await gateRows.nth(i % count).click();
      await page.waitForTimeout(50);
    }

    expect(await page.locator("body").isVisible()).toBe(true);
  });
});
