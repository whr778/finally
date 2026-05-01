import { test, expect } from "@playwright/test";

/**
 * SSE resilience and connection status scenarios.
 */

test.describe("SSE connection resilience", () => {
  test("connection indicator becomes 'connected' when stream is active", async ({ page }) => {
    await page.goto("/");
    const status = page.getByTestId("connection-status");
    await expect(status).toContainText("connected", { timeout: 10_000 });
  });

  test("sparkline appears in watchlist row after prices stream in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible({ timeout: 10_000 });

    // Allow several simulator ticks (~500ms each) so the sparkline series builds up.
    await page.waitForTimeout(3_000);

    const row = page.getByTestId("watchlist-row-AAPL");
    await expect(row.locator("svg")).toBeVisible();
  });

  test("EventSource recovers after going offline and back online", async ({ page, context }) => {
    await page.goto("/");
    const status = page.getByTestId("connection-status");
    await expect(status).toContainText("connected", { timeout: 10_000 });

    // Drop the connection. The hook should mark the stream as not connected.
    await context.setOffline(true);
    await expect(status).not.toContainText("connected", { timeout: 10_000 });

    // Restore: EventSource auto-reconnects and status returns to 'connected'.
    await context.setOffline(false);
    await expect(status).toContainText("connected", { timeout: 20_000 });
  });
});
