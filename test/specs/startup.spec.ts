import { test, expect } from "@playwright/test";

/**
 * Startup scenarios: verify the app loads correctly on first visit.
 */

test.describe("App startup", () => {
  test("page loads and shows the FinAlly header", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("header").getByText("FinAlly")).toBeVisible();
  });

  test("shows $10,000 starting portfolio value in header", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header");
    await expect(header.getByText(/Total Value/i)).toBeVisible({ timeout: 10_000 });
    await expect(header).toContainText(/10,000/);
  });

  test("shows $10,000 starting cash balance in header", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header");
    await expect(header.getByText(/Cash/i)).toBeVisible({ timeout: 10_000 });
    await expect(header).toContainText(/10,000/);
  });

  test("default watchlist shows expected tickers", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("watchlist-row-GOOGL")).toBeVisible();
    await expect(page.getByTestId("watchlist-row-MSFT")).toBeVisible();
    await expect(page.getByTestId("watchlist-row-TSLA")).toBeVisible();
  });

  test("connection status indicator becomes 'connected'", async ({ page }) => {
    await page.goto("/");
    const status = page.getByTestId("connection-status");
    await expect(status).toContainText("connected", { timeout: 10_000 });
  });

  test("AI chat panel is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("chat-panel")).toBeVisible();
    await expect(page.getByLabel("chat message")).toBeVisible();
  });

  test("trade bar inputs are visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("trade-bar")).toBeVisible();
    await expect(page.getByLabel("ticker")).toBeVisible();
    await expect(page.getByLabel("quantity")).toBeVisible();
    await expect(page.getByRole("button", { name: "Buy", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sell", exact: true })).toBeVisible();
  });
});
