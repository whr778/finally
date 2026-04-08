import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatPanel from "@/components/ChatPanel";
import type { ChatMessage } from "@/types";

const MESSAGES: ChatMessage[] = [
  { id: "1", role: "user", content: "What is my balance?" },
  { id: "2", role: "assistant", content: "You have $8,000 in cash." },
];

const MSG_WITH_TRADE: ChatMessage = {
  id: "3",
  role: "assistant",
  content: "I bought 5 AAPL for you.",
  trades_executed: [
    { ticker: "AAPL", side: "buy", quantity: 5, price: 190.5, success: true },
  ],
  watchlist_changes: [],
};

const MSG_WITH_FAILED_TRADE: ChatMessage = {
  id: "4",
  role: "assistant",
  content: "I tried to buy but failed.",
  trades_executed: [
    { ticker: "NVDA", side: "buy", quantity: 10, price: 800, success: false, error: "Insufficient cash" },
  ],
  watchlist_changes: [],
};

const MSG_WITH_WATCHLIST: ChatMessage = {
  id: "5",
  role: "assistant",
  content: "Added PYPL to your watchlist.",
  trades_executed: [],
  watchlist_changes: [
    { ticker: "PYPL", action: "add", success: true },
  ],
};

describe("ChatPanel", () => {
  it("shows empty state hint when no messages", () => {
    render(<ChatPanel messages={[]} sending={false} error={null} onSend={jest.fn()} />);
    expect(screen.getByText(/Ask FinAlly/)).toBeInTheDocument();
  });

  it("renders chat panel container", () => {
    render(<ChatPanel messages={[]} sending={false} error={null} onSend={jest.fn()} />);
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
  });

  it("renders user and assistant messages", () => {
    render(<ChatPanel messages={MESSAGES} sending={false} error={null} onSend={jest.fn()} />);
    expect(screen.getByText("What is my balance?")).toBeInTheDocument();
    expect(screen.getByText("You have $8,000 in cash.")).toBeInTheDocument();
  });

  it("renders message with correct role test IDs", () => {
    render(<ChatPanel messages={MESSAGES} sending={false} error={null} onSend={jest.fn()} />);
    expect(screen.getByTestId("chat-msg-user")).toBeInTheDocument();
    expect(screen.getByTestId("chat-msg-assistant")).toBeInTheDocument();
  });

  it("calls onSend when form is submitted", async () => {
    const user = userEvent.setup();
    const onSend = jest.fn();
    render(<ChatPanel messages={[]} sending={false} error={null} onSend={onSend} />);

    await user.type(screen.getByTestId("chat-input"), "Buy 5 AAPL");
    fireEvent.submit(screen.getByTestId("chat-input").closest("form")!);

    expect(onSend).toHaveBeenCalledWith("Buy 5 AAPL");
  });

  it("clears input after send", async () => {
    const user = userEvent.setup();
    render(<ChatPanel messages={[]} sending={false} error={null} onSend={jest.fn()} />);

    await user.type(screen.getByTestId("chat-input"), "Hello");
    fireEvent.submit(screen.getByTestId("chat-input").closest("form")!);

    expect(screen.getByTestId("chat-input")).toHaveValue("");
  });

  it("does not call onSend for whitespace-only input", async () => {
    const onSend = jest.fn();
    render(<ChatPanel messages={[]} sending={false} error={null} onSend={onSend} />);
    // send button should be disabled for empty input
    expect(screen.getByTestId("chat-send")).toBeDisabled();
  });

  it("disables input and button while sending", () => {
    render(<ChatPanel messages={[]} sending={true} error={null} onSend={jest.fn()} />);
    expect(screen.getByTestId("chat-input")).toBeDisabled();
    expect(screen.getByTestId("chat-send")).toBeDisabled();
  });

  it("shows loading indicator while sending", () => {
    render(<ChatPanel messages={[]} sending={true} error={null} onSend={jest.fn()} />);
    expect(screen.getByTestId("chat-loading")).toBeInTheDocument();
  });

  it("shows error message", () => {
    render(<ChatPanel messages={[]} sending={false} error="API is down" onSend={jest.fn()} />);
    expect(screen.getByTestId("chat-error")).toHaveTextContent("API is down");
  });

  it("does not show error when error is null", () => {
    render(<ChatPanel messages={[]} sending={false} error={null} onSend={jest.fn()} />);
    expect(screen.queryByTestId("chat-error")).toBeNull();
  });

  it("shows inline trade confirmation for successful trade", () => {
    render(<ChatPanel messages={[MSG_WITH_TRADE]} sending={false} error={null} onSend={jest.fn()} />);
    const results = screen.getAllByTestId("chat-trade-result");
    expect(results[0]).toHaveTextContent("BUY 5 AAPL");
  });

  it("shows inline error for failed trade", () => {
    render(<ChatPanel messages={[MSG_WITH_FAILED_TRADE]} sending={false} error={null} onSend={jest.fn()} />);
    const results = screen.getAllByTestId("chat-trade-result");
    expect(results[0]).toHaveTextContent("Insufficient cash");
  });

  it("shows watchlist change confirmation", () => {
    render(<ChatPanel messages={[MSG_WITH_WATCHLIST]} sending={false} error={null} onSend={jest.fn()} />);
    const changes = screen.getAllByTestId("chat-watchlist-result");
    expect(changes[0]).toHaveTextContent("PYPL");
  });

  it("does not call onSend when sending is true", async () => {
    const user = userEvent.setup();
    const onSend = jest.fn();
    render(<ChatPanel messages={[]} sending={true} error={null} onSend={onSend} />);

    await user.type(screen.getByTestId("chat-input"), "Hello");
    fireEvent.submit(screen.getByTestId("chat-input").closest("form")!);

    expect(onSend).not.toHaveBeenCalled();
  });

  it("renders AI Assistant header label", () => {
    render(<ChatPanel messages={[]} sending={false} error={null} onSend={jest.fn()} />);
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });
});
