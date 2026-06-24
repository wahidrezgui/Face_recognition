import { test, expect, chromium } from "@playwright/test";

test.describe("multi-tab SSE", () => {
  test("three contexts can open dashboard routes", async () => {
    const browser = await chromium.launch();
    const routes = ["/dashboard", "/events", "/access-log"];
    const contexts = await Promise.all(routes.map(() => browser.newContext()));
    const pages = await Promise.all(contexts.map((ctx, i) => ctx.newPage().then((p) => ({ p, route: routes[i] }))));

    for (const { p, route } of pages) {
      await p.goto(route);
      await p.waitForLoadState("domcontentloaded");
    }

    for (const { p } of pages) {
      expect(await p.title()).toBeTruthy();
    }

    await Promise.all(contexts.map((c) => c.close()));
    await browser.close();
  });
});
