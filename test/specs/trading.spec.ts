import { test, expect } from "@playwright/test";

/**
 * Trading (buy/sell) scenarios.
 */

test.describe("Trading", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("trade-bar")).toBeVisible({ timeout: 10_000 });
    // Wait for prices to be available
    await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible({ timeout: 10_000 });
  });

  test("buying shares reduces cash balance", async ({ page }) => {
    // Get current cash before trade
    const cashEl = page.getByTestId("cash-balance");
    const cashBefore = await cashEl.textContent();

    // Execute buy
    await page.getByTestId("trade-ticker").fill("AAPL");
    await page.getByTestId("trade-qty").fill("1");
    await page.getByTestId("btn-buy").click();

    // Wait for success confirmation
    await expect(page.getByTestId("trade-success")).toBeVisible({ timeout: 5_000 });

    // Wait for portfolio to refresh (5s poll or immediate refresh on trade)
    await page.waitForTimeout(1000);
    const cashAfter = await cashEl.textContent();
    expect(cashBefore).not.toBe(cashAfter);
  });

  test("buy shows success confirmation with ticker", async ({ page }) => {
    await page.getByTestId("trade-ticker").fill("AAPL");
    await page.getByTestId("trade-qty").fill("2");
    await page.getByTestId("btn-buy").click();

    const success = page.getByTestId("trade-success");
    await expect(success).toBeVisible({ timeout: 5_000 });
    await expect(success).toContainText("AAPL");
    await expect(success).toContainText("BUY");
  });

  test("buy creates a position in the positions table", async ({ page }) => {
    await page.getByTestId("trade-ticker").fill("GOOGL");
    await page.getByTestId("trade-qty").fill("3");
    await page.getByTestId("btn-buy").click();

    await expect(page.getByTestId("trade-success")).toBeVisible({ timeout: 5_000 });

    // Wait for portfolio refresh
    await expect(page.getByTestId("position-row-GOOGL")).toBeVisible({ timeout: 8_000 });
  });

  test("sell shows error when no shares held", async ({ page }) => {
    await page.getByTestId("trade-ticker").fill("NVDA");
    await page.getByTestId("trade-qty").fill("1");
    await page.getByTestId("btn-sell").click();

    await expect(page.getByTestId("trade-error")).toBeVisible({ timeout: 5_000 });
  });

  test("empty quantity shows validation error", async ({ page }) => {
    await page.getByTestId("trade-ticker").fill("AAPL");
    await page.getByTestId("btn-buy").click();

    await expect(page.getByTestId("trade-error")).toBeVisible({ timeout: 3_000 });
  });

  test("can sell shares after buying them", async ({ page }) => {
    // Buy first
    await page.getByTestId("trade-ticker").fill("MSFT");
    await page.getByTestId("trade-qty").fill("2");
    await page.getByTestId("btn-buy").click();
    await expect(page.getByTestId("trade-success")).toBeVisible({ timeout: 5_000 });

    // Now sell
    await page.getByTestId("trade-qty").fill("2");
    await page.getByTestId("btn-sell").click();

    const success = page.getByTestId("trade-success");
    await expect(success).toBeVisible({ timeout: 5_000 });
    await expect(success).toContainText("SELL");
  });

  test("portfolio heatmap appears after buying", async ({ page }) => {
    await page.getByTestId("trade-ticker").fill("AAPL");
    await page.getByTestId("trade-qty").fill("5");
    await page.getByTestId("btn-buy").click();
    await expect(page.getByTestId("trade-success")).toBeVisible({ timeout: 5_000 });

    // Wait for the heatmap to show the position
    await expect(page.getByTestId("tile-AAPL")).toBeVisible({ timeout: 8_000 });
  });
});
