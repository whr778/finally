import { test, expect } from "@playwright/test";

/**
 * Trading (buy/sell) scenarios.
 */

test.describe("Trading", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("trade-bar")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible({ timeout: 10_000 });
  });

  test("buying shares shows a fill confirmation", async ({ page }) => {
    await page.getByLabel("ticker").fill("AAPL");
    await page.getByLabel("quantity").fill("1");
    await page.getByRole("button", { name: "Buy", exact: true }).click();

    const status = page.getByTestId("trade-status");
    await expect(status).toBeVisible({ timeout: 5_000 });
    await expect(status).toContainText(/Filled BUY/i);
    await expect(status).toContainText("AAPL");
  });

  test("buying shares reduces cash balance shown in the header", async ({ page }) => {
    const header = page.locator("header");
    // Wait until header has a numeric cash value
    await expect(header).toContainText(/10,000/, { timeout: 10_000 });

    await page.getByLabel("ticker").fill("AAPL");
    await page.getByLabel("quantity").fill("2");
    await page.getByRole("button", { name: "Buy", exact: true }).click();
    await expect(page.getByTestId("trade-status")).toContainText(/Filled BUY/i, {
      timeout: 5_000,
    });

    // Header refreshes on a 2s interval; wait then assert cash decreased
    await expect(header).not.toContainText(/Cash[^$]*\$10,000\.00/, { timeout: 10_000 });
  });

  test("sell with no shares held shows an error", async ({ page }) => {
    await page.getByLabel("ticker").fill("NVDA");
    await page.getByLabel("quantity").fill("1");
    await page.getByRole("button", { name: "Sell", exact: true }).click();

    const status = page.getByTestId("trade-status");
    await expect(status).toBeVisible({ timeout: 5_000 });
    await expect(status).toHaveClass(/negative/);
  });

  test("empty quantity shows a validation error", async ({ page }) => {
    await page.getByLabel("ticker").fill("AAPL");
    await page.getByRole("button", { name: "Buy", exact: true }).click();
    const status = page.getByTestId("trade-status");
    await expect(status).toBeVisible({ timeout: 3_000 });
    await expect(status).toContainText(/Quantity/i);
  });

  test("can sell shares after buying them", async ({ page }) => {
    await page.getByLabel("ticker").fill("MSFT");
    await page.getByLabel("quantity").fill("2");
    await page.getByRole("button", { name: "Buy", exact: true }).click();
    await expect(page.getByTestId("trade-status")).toContainText(/Filled BUY/i, {
      timeout: 5_000,
    });

    await page.getByLabel("quantity").fill("2");
    await page.getByRole("button", { name: "Sell", exact: true }).click();
    await expect(page.getByTestId("trade-status")).toContainText(/Filled SELL/i, {
      timeout: 5_000,
    });
  });
});
