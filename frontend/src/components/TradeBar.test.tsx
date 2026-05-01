import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TradeBar } from "./TradeBar";

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

const emptyPortfolio = {
  cash_balance: 10000,
  positions: [],
  total_value: 10000,
};

describe("TradeBar", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    Object.defineProperty(global, "fetch", { writable: true, value: fetchMock });
  });

  it("validates that ticker and positive quantity are required", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, body: emptyPortfolio }));

    render(<TradeBar />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole("button", { name: /buy/i }));
    expect(screen.getByTestId("trade-status")).toHaveTextContent(/ticker is required/i);

    await userEvent.type(screen.getByLabelText("ticker"), "aapl");
    await userEvent.click(screen.getByRole("button", { name: /buy/i }));
    expect(screen.getByTestId("trade-status")).toHaveTextContent(/quantity must be > 0/i);

    expect(fetchMock).toHaveBeenCalledTimes(1); // only the initial portfolio fetch
  });

  it("submits a buy and shows the fill inline", async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ ok: true, body: emptyPortfolio }))
      .mockResolvedValueOnce(
        mockResponse({
          ok: true,
          body: {
            ticker: "AAPL",
            side: "buy",
            quantity: 2,
            price: 190.5,
            executed_at: "2026-05-01T12:00:00Z",
          },
        }),
      )
      .mockResolvedValueOnce(mockResponse({ ok: true, body: emptyPortfolio }));

    render(<TradeBar />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await userEvent.type(screen.getByLabelText("ticker"), "aapl");
    await userEvent.type(screen.getByLabelText("quantity"), "2");
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /buy/i }));
    });

    await waitFor(() =>
      expect(screen.getByTestId("trade-status")).toHaveTextContent(
        /Filled BUY 2 AAPL @ \$190\.50/,
      ),
    );

    const tradeCall = fetchMock.mock.calls[1];
    expect(tradeCall[0]).toBe("/api/portfolio/trade");
    expect(JSON.parse(tradeCall[1].body)).toEqual({
      ticker: "AAPL",
      side: "buy",
      quantity: 2,
    });
  });

  it("shows the backend detail message on error", async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ ok: true, body: emptyPortfolio }))
      .mockResolvedValueOnce(
        mockResponse({ ok: false, status: 400, body: { detail: "Insufficient cash" } }),
      );

    render(<TradeBar />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await userEvent.type(screen.getByLabelText("ticker"), "tsla");
    await userEvent.type(screen.getByLabelText("quantity"), "100");
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /buy/i }));
    });

    await waitFor(() =>
      expect(screen.getByTestId("trade-status")).toHaveTextContent(/Insufficient cash/),
    );
  });

  it("submits a sell with the correct side", async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ ok: true, body: emptyPortfolio }))
      .mockResolvedValueOnce(
        mockResponse({
          ok: true,
          body: {
            ticker: "MSFT",
            side: "sell",
            quantity: 1.5,
            price: 410.0,
            executed_at: "2026-05-01T12:01:00Z",
          },
        }),
      )
      .mockResolvedValueOnce(mockResponse({ ok: true, body: emptyPortfolio }));

    render(<TradeBar />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await userEvent.type(screen.getByLabelText("ticker"), "msft");
    await userEvent.type(screen.getByLabelText("quantity"), "1.5");
    await act(async () => {
      await userEvent.click(screen.getByRole("button", { name: /sell/i }));
    });

    await waitFor(() =>
      expect(screen.getByTestId("trade-status")).toHaveTextContent(
        /Filled SELL 1\.5 MSFT/,
      ),
    );

    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      ticker: "MSFT",
      side: "sell",
      quantity: 1.5,
    });
  });
});
