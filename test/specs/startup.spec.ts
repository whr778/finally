import { test, expect } from "@playwright/test";

/**
 * Startup scenarios: verify the app loads correctly on first visit.
 */

test.describe("App startup", () => {
  test("page loads and shows the FinAlly header", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByText("Fin")).toBeVisible();
    await expect(page.getByText("Ally")).toBeVisible();
  });

  test("shows $10,000 starting portfolio value", async ({ page }) => {
    await page.goto("/");
    // Wait for the portfolio data to load
    const totalValue = page.getByTestId("total-value");
    await expect(totalValue).toBeVisible({ timeout: 10_000 });
    await expect(totalValue).toContainText("10,000");
  });

  test("shows $10,000 starting cash balance", async ({ page }) => {
    await page.goto("/");
    const cashBalance = page.getByTestId("cash-balance");
    await expect(cashBalance).toBeVisible({ timeout: 10_000 });
    await expect(cashBalance).toContainText("10,000");
  });

  test("default watchlist shows expected tickers", async ({ page }) => {
    await page.goto("/");
    // Wait for the watchlist to appear
    await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("watchlist-row-GOOGL")).toBeVisible();
    await expect(page.getByTestId("watchlist-row-MSFT")).toBeVisible();
    await expect(page.getByTestId("watchlist-row-TSLA")).toBeVisible();
  });

  test("SSE connection indicator shows LIVE", async ({ page }) => {
    await page.goto("/");
    const dot = page.getByTestId("connection-dot");
    // Wait up to 10s for SSE to connect
    await expect(dot).toContainText("LIVE", { timeout: 10_000 });
  });

  test("AI chat panel is visible and shows prompt", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("chat-panel")).toBeVisible();
    await expect(page.getByText("AI Assistant")).toBeVisible();
    await expect(page.getByTestId("chat-input")).toBeVisible();
  });

  test("trade bar inputs are visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("trade-bar")).toBeVisible();
    await expect(page.getByTestId("trade-ticker")).toBeVisible();
    await expect(page.getByTestId("trade-qty")).toBeVisible();
    await expect(page.getByTestId("btn-buy")).toBeVisible();
    await expect(page.getByTestId("btn-sell")).toBeVisible();
  });
});
