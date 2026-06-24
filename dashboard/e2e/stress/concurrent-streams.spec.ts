import { test, expect } from "@playwright/test";

test.describe("concurrent streams", () => {
  test("dashboard overview does not mount multiple stream imgs by default", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const streamImgs = page.locator('img[src*="/stream"]');
    const count = await streamImgs.count();
    expect(count).toBeLessThanOrEqual(1);
  });
});
