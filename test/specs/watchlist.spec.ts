import { test, expect } from "@playwright/test";

/**
 * Watchlist management scenarios.
 */

test.describe("Watchlist", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible({ timeout: 10_000 });
  });

  test("clicking a ticker row selects it", async ({ page }) => {
    await page.getByTestId("watchlist-row-GOOGL").click();
    await expect(page.getByTestId("watchlist-row-GOOGL")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("can add a new ticker to the watchlist", async ({ page }) => {
    // First remove a default ticker so we have a known starting state
    await page.getByLabel("Remove META").click();
    await expect(page.getByTestId("watchlist-row-META")).not.toBeVisible({ timeout: 5_000 });

    await page.getByLabel("Add ticker").fill("META");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByTestId("watchlist-row-META")).toBeVisible({ timeout: 5_000 });
  });

  test("can remove a ticker from the watchlist", async ({ page }) => {
    await page.getByLabel("Remove AMZN").click();
    await expect(page.getByTestId("watchlist-row-AMZN")).not.toBeVisible({ timeout: 5_000 });
  });

  test("prices flash on update (uptick or downtick)", async ({ page }) => {
    // The simulator emits both up and down ticks; either should trigger a flash class.
    await page.waitForSelector(".flash-up, .flash-down", { timeout: 10_000 });
    const flashed = await page.locator(".flash-up, .flash-down").count();
    expect(flashed).toBeGreaterThan(0);
  });

  test("shows error when adding a duplicate ticker", async ({ page }) => {
    await page.getByLabel("Add ticker").fill("AAPL");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5_000 });
  });
});
