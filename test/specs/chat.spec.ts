import { test, expect } from "@playwright/test";

/**
 * AI Chat panel scenarios.
 * Requires LLM_MOCK=true in the app environment.
 *
 * The mock LLM (backend/app/llm.py) parses simple intents from the user
 * message:
 *   "buy N TICKER"  -> emits a trade
 *   "sell N TICKER" -> emits a sell
 *   "add TICKER"    -> watchlist add
 *   "remove TICKER" -> watchlist remove
 * Any message that doesn't match returns a default canned response.
 */

test.describe("Chat panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("chat-panel")).toBeVisible({ timeout: 10_000 });
  });

  test("input accepts text and Send button toggles disabled state", async ({ page }) => {
    const input = page.getByLabel("chat message");
    const send = page.getByRole("button", { name: "Send", exact: true });

    await expect(send).toBeDisabled();
    await input.fill("Hello");
    await expect(send).toBeEnabled();
  });

  test("user message and assistant response render", async ({ page }) => {
    await page.getByLabel("chat message").fill("hello");
    await page.getByRole("button", { name: "Send", exact: true }).click();

    await expect(page.getByTestId("chat-msg-user")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("chat-msg-assistant")).toBeVisible({ timeout: 30_000 });
  });

  test("loading indicator appears while waiting for response", async ({ page }) => {
    await page.getByLabel("chat message").fill("hello");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByTestId("chat-loading")).toBeVisible({ timeout: 3_000 });
  });

  test("input clears after sending", async ({ page }) => {
    const input = page.getByLabel("chat message");
    await input.fill("hello");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(input).toHaveValue("", { timeout: 3_000 });
  });

  test("buy intent triggers inline trade execution in chat", async ({ page }) => {
    // Wait for prices so the trade can actually fill
    await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible({ timeout: 10_000 });

    await page.getByLabel("chat message").fill("buy 1 AAPL");
    await page.getByRole("button", { name: "Send", exact: true }).click();

    const actions = page.getByTestId("chat-actions");
    await expect(actions).toBeVisible({ timeout: 30_000 });
    await expect(actions).toContainText("AAPL");
  });

  test("watchlist-add intent updates the watchlist", async ({ page }) => {
    // Remove NFLX first so we can re-add it via chat
    await expect(page.getByTestId("watchlist-row-NFLX")).toBeVisible({ timeout: 10_000 });
    await page.getByLabel("Remove NFLX").click();
    await expect(page.getByTestId("watchlist-row-NFLX")).not.toBeVisible({ timeout: 5_000 });

    await page.getByLabel("chat message").fill("add NFLX");
    await page.getByRole("button", { name: "Send", exact: true }).click();

    await expect(page.getByTestId("chat-actions")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("watchlist-row-NFLX")).toBeVisible({ timeout: 8_000 });
  });
});
