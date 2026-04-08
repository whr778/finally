import { test, expect } from "@playwright/test";

/**
 * AI Chat panel scenarios.
 * Requires LLM_MOCK=true in the app environment for deterministic responses.
 */

test.describe("Chat panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("chat-panel")).toBeVisible({ timeout: 10_000 });
  });

  test("chat input accepts text", async ({ page }) => {
    const input = page.getByTestId("chat-input");
    await input.fill("Hello FinAlly");
    await expect(input).toHaveValue("Hello FinAlly");
  });

  test("send button is disabled when input is empty", async ({ page }) => {
    await expect(page.getByTestId("chat-send")).toBeDisabled();
  });

  test("send button enables when text is typed", async ({ page }) => {
    await page.getByTestId("chat-input").fill("How am I doing?");
    await expect(page.getByTestId("chat-send")).toBeEnabled();
  });

  test("sending a message shows it in chat history", async ({ page }) => {
    const input = page.getByTestId("chat-input");
    await input.fill("What is my cash balance?");
    await page.getByTestId("chat-send").click();

    // User message should appear
    await expect(page.getByTestId("chat-msg-user")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("What is my cash balance?")).toBeVisible();
  });

  test("loading indicator appears while waiting for response", async ({ page }) => {
    const input = page.getByTestId("chat-input");
    await input.fill("Tell me about my portfolio");
    await page.getByTestId("chat-send").click();

    // Loading dots should briefly appear
    await expect(page.getByTestId("chat-loading")).toBeVisible({ timeout: 3_000 });
  });

  test("assistant response appears after loading", async ({ page }) => {
    await page.getByTestId("chat-input").fill("How is my portfolio?");
    await page.getByTestId("chat-send").click();

    // Wait for assistant response (with longer timeout for LLM)
    await expect(page.getByTestId("chat-msg-assistant")).toBeVisible({ timeout: 30_000 });
  });

  test("input clears after sending", async ({ page }) => {
    const input = page.getByTestId("chat-input");
    await input.fill("Some message");
    await page.getByTestId("chat-send").click();

    await expect(input).toHaveValue("", { timeout: 3_000 });
  });
});
