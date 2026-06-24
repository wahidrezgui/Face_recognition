import { test, expect } from "@playwright/test";

test.describe("dashboard load", () => {
  test("login page loads quickly (warm)", async ({ page }) => {
    await page.goto("/login");
    await page.waitForSelector("input", { timeout: 30_000 });

    const start = Date.now();
    await page.reload();
    await page.waitForSelector("input", { timeout: 10_000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(8000);
  });

  test("dashboard route responds (warm)", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    await page.reload();
    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      return nav?.domContentLoadedEventEnd ?? 0;
    });
    expect(timing).toBeLessThan(8000);
  });
});
