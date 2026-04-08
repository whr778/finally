import { renderHook, act } from "@testing-library/react";
import { useChat } from "@/hooks/useChat";
import * as api from "@/lib/api";

jest.mock("@/lib/api");
const mockSend = api.sendChatMessage as jest.Mock;

const CHAT_RESP = {
  message: "You have $8,000 in cash.",
  trades_executed: [],
  watchlist_changes: [],
};

beforeEach(() => mockSend.mockResolvedValue(CHAT_RESP));
afterEach(() => jest.clearAllMocks());

describe("useChat", () => {
  it("starts with empty messages", () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.sending).toBe(false);
  });

  it("send adds user message then assistant response", async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.send("What is my balance?");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe("user");
    expect(result.current.messages[0].content).toBe("What is my balance?");
    expect(result.current.messages[1].role).toBe("assistant");
    expect(result.current.messages[1].content).toBe(CHAT_RESP.message);
  });

  it("returns the chat response from send", async () => {
    const { result } = renderHook(() => useChat());
    let resp: unknown;
    await act(async () => {
      resp = await result.current.send("Help me");
    });
    expect(resp).toEqual(CHAT_RESP);
  });

  it("returns null for empty input", async () => {
    const { result } = renderHook(() => useChat());
    let resp: unknown;
    await act(async () => {
      resp = await result.current.send("  ");
    });
    expect(resp).toBeNull();
    expect(result.current.messages).toHaveLength(0);
  });

  it("sets error on API failure", async () => {
    mockSend.mockRejectedValueOnce(new Error("API down"));
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.send("Hello");
    });

    expect(result.current.error).toBe("API down");
  });

  it("clearError clears the error", async () => {
    mockSend.mockRejectedValueOnce(new Error("Oops"));
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.send("Hello");
    });
    expect(result.current.error).toBeTruthy();

    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it("stores trades_executed on assistant message", async () => {
    mockSend.mockResolvedValueOnce({
      message: "Done",
      trades_executed: [{ ticker: "AAPL", side: "buy", quantity: 5, price: 190, success: true }],
      watchlist_changes: [],
    });
    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.send("Buy 5 AAPL");
    });
    const assistant = result.current.messages[1];
    expect(assistant.trades_executed).toHaveLength(1);
    expect(assistant.trades_executed![0].ticker).toBe("AAPL");
  });
});
