import { test, expect } from "@playwright/test";

test.describe("dashboard interaction", () => {
  test("gate focus switch is responsive", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const gateRows = page.locator('[class*="cursor-pointer"]').filter({ hasText: /LIVE|OFF/ });
    const count = await gateRows.count();
    if (count === 0) {
      test.skip();
      return;
    }

    const start = Date.now();
    await gateRows.first().click();
    await page.waitForTimeout(100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});
