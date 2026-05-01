import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChatPanel } from "./ChatPanel";

interface MockResponseInit {
  ok: boolean;
  status?: number;
  body: unknown;
}

function mockResponse({ ok, status = 200, body }: MockResponseInit): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("ChatPanel", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    Object.defineProperty(global, "fetch", { writable: true, value: fetchMock });
  });

  it("shows the empty-state hint and disables Send when input is empty", () => {
    render(<ChatPanel />);
    expect(screen.getByText(/ask me about your portfolio/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("sends a message and renders the assistant reply", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        ok: true,
        body: {
          message: "Got it.",
          trades_executed: [],
          watchlist_changes: [],
        },
      }),
    );

    render(<ChatPanel />);

    await userEvent.type(screen.getByLabelText("chat message"), "what is my portfolio?");
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /send/i }));
    });

    await waitFor(() =>
      expect(screen.getByTestId("chat-msg-assistant")).toHaveTextContent("Got it."),
    );
    expect(screen.getByTestId("chat-msg-user")).toHaveTextContent(
      /what is my portfolio\?/,
    );

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/api/chat");
    expect(JSON.parse(call[1].body)).toEqual({ content: "what is my portfolio?" });
  });

  it("renders inline trade and watchlist confirmations", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        ok: true,
        body: {
          message: "Done.",
          trades_executed: [
            {
              ticker: "AAPL",
              side: "buy",
              quantity: 2,
              price: 190.5,
              success: true,
            },
            {
              ticker: "TSLA",
              side: "buy",
              quantity: 100,
              price: 0,
              success: false,
              error: "Insufficient cash",
            },
          ],
          watchlist_changes: [
            { ticker: "PYPL", action: "add", success: true },
          ],
        },
      }),
    );

    const onActions = jest.fn();
    render(<ChatPanel onActions={onActions} />);

    await userEvent.type(screen.getByLabelText("chat message"), "buy aapl");
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /send/i }));
    });

    await waitFor(() =>
      expect(screen.getByTestId("chat-actions")).toHaveTextContent(/Filled BUY 2 AAPL/),
    );
    expect(screen.getByTestId("chat-actions")).toHaveTextContent(
      /BUY 100 TSLA failed: Insufficient cash/,
    );
    expect(screen.getByTestId("chat-actions")).toHaveTextContent(/Added PYPL to watchlist/);
    expect(onActions).toHaveBeenCalledTimes(1);
  });

  it("shows the error detail when /api/chat fails", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: false, status: 502, body: { detail: "LLM call failed: nope" } }),
    );

    render(<ChatPanel />);

    await userEvent.type(screen.getByLabelText("chat message"), "hi");
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /send/i }));
    });

    await waitFor(() =>
      expect(screen.getByTestId("chat-error")).toHaveTextContent(/LLM call failed/),
    );
  });

  it("collapses and re-expands", async () => {
    render(<ChatPanel />);

    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /collapse chat/i }));
    });
    expect(screen.getByTestId("chat-panel-collapsed")).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /expand chat/i }));
    });
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
  });
});
