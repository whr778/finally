import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TradeBar from "@/components/TradeBar";
import * as api from "@/lib/api";
import type { PriceUpdate } from "@/types";

jest.mock("@/lib/api");
const mockExecuteTrade = api.executeTrade as jest.Mock;

const PRICES: Record<string, PriceUpdate> = {
  AAPL: {
    ticker: "AAPL",
    price: 190.5,
    previous_price: 189.0,
    timestamp: 1700000000,
    change: 1.5,
    change_percent: 0.79,
    direction: "up",
  },
};

const TRADE_RESULT = {
  ticker: "AAPL",
  side: "buy",
  quantity: 5,
  price: 190.5,
  executed_at: "2024-01-01T00:00:00Z",
};

beforeEach(() => {
  mockExecuteTrade.mockResolvedValue(TRADE_RESULT);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("TradeBar", () => {
  it("renders trade inputs and buttons", () => {
    render(<TradeBar prices={PRICES} selectedTicker={null} onTradeComplete={jest.fn()} />);
    expect(screen.getByTestId("trade-bar")).toBeInTheDocument();
    expect(screen.getByTestId("trade-ticker")).toBeInTheDocument();
    expect(screen.getByTestId("trade-qty")).toBeInTheDocument();
    expect(screen.getByTestId("btn-buy")).toBeInTheDocument();
    expect(screen.getByTestId("btn-sell")).toBeInTheDocument();
  });

  it("shows current price when ticker has price in cache", () => {
    render(<TradeBar prices={PRICES} selectedTicker="AAPL" onTradeComplete={jest.fn()} />);
    expect(screen.getByText(/190\.50/)).toBeInTheDocument();
  });

  it("does not show price when ticker has no cached price", () => {
    render(<TradeBar prices={PRICES} selectedTicker="UNKNOWN" onTradeComplete={jest.fn()} />);
    expect(screen.queryByText(/@/)).toBeNull();
  });

  it("shows error when buy clicked with no ticker", async () => {
    render(<TradeBar prices={{}} selectedTicker={null} onTradeComplete={jest.fn()} />);
    fireEvent.click(screen.getByTestId("btn-buy"));
    await waitFor(() => {
      expect(screen.getByTestId("trade-error")).toBeInTheDocument();
    });
  });

  it("shows error when buy clicked with invalid quantity", async () => {
    const user = userEvent.setup();
    render(<TradeBar prices={PRICES} selectedTicker="AAPL" onTradeComplete={jest.fn()} />);
    await user.type(screen.getByTestId("trade-qty"), "-5");
    fireEvent.click(screen.getByTestId("btn-buy"));
    await waitFor(() => {
      expect(screen.getByTestId("trade-error")).toBeInTheDocument();
    });
  });

  it("executes a buy trade and shows success", async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    render(<TradeBar prices={PRICES} selectedTicker="AAPL" onTradeComplete={onComplete} />);

    await user.type(screen.getByTestId("trade-qty"), "5");
    fireEvent.click(screen.getByTestId("btn-buy"));

    await waitFor(() => {
      expect(mockExecuteTrade).toHaveBeenCalledWith({
        ticker: "AAPL",
        side: "buy",
        quantity: 5,
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId("trade-success")).toBeInTheDocument();
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it("executes a sell trade", async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    mockExecuteTrade.mockResolvedValueOnce({ ...TRADE_RESULT, side: "sell" });
    render(<TradeBar prices={PRICES} selectedTicker="AAPL" onTradeComplete={onComplete} />);

    await user.type(screen.getByTestId("trade-qty"), "3");
    fireEvent.click(screen.getByTestId("btn-sell"));

    await waitFor(() => {
      expect(mockExecuteTrade).toHaveBeenCalledWith({
        ticker: "AAPL",
        side: "sell",
        quantity: 3,
      });
    });
  });

  it("shows error message on failed trade", async () => {
    const user = userEvent.setup();
    mockExecuteTrade.mockRejectedValueOnce(new Error("Insufficient cash"));
    render(<TradeBar prices={PRICES} selectedTicker="AAPL" onTradeComplete={jest.fn()} />);

    await user.type(screen.getByTestId("trade-qty"), "5");
    fireEvent.click(screen.getByTestId("btn-buy"));

    await waitFor(() => {
      expect(screen.getByTestId("trade-error")).toHaveTextContent("Insufficient cash");
    });
  });

  it("clears quantity field after successful trade", async () => {
    const user = userEvent.setup();
    render(<TradeBar prices={PRICES} selectedTicker="AAPL" onTradeComplete={jest.fn()} />);

    await user.type(screen.getByTestId("trade-qty"), "5");
    fireEvent.click(screen.getByTestId("btn-buy"));

    await waitFor(() => {
      expect(screen.getByTestId("trade-qty")).toHaveValue(null);
    });
  });

  it("shows trade result with ticker and price", async () => {
    const user = userEvent.setup();
    render(<TradeBar prices={PRICES} selectedTicker="AAPL" onTradeComplete={jest.fn()} />);

    await user.type(screen.getByTestId("trade-qty"), "5");
    fireEvent.click(screen.getByTestId("btn-buy"));

    await waitFor(() => {
      const success = screen.getByTestId("trade-success");
      expect(success).toHaveTextContent("AAPL");
    });
  });
});
