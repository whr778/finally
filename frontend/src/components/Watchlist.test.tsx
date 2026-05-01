import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Watchlist } from "./Watchlist";
import type { WatchlistEntry } from "@/types";

interface MockEventSource extends EventSource {
  simulateMessage: (data: object) => void;
}

function latestES(): MockEventSource {
  const ctor = (global as unknown as { EventSource: { instances: MockEventSource[] } }).EventSource;
  return ctor.instances[ctor.instances.length - 1];
}

function makeEntry(ticker: string): WatchlistEntry {
  return {
    ticker,
    price: null,
    previous_price: null,
    change_percent: null,
    direction: null,
  };
}

function jsonResponse<T>(body: T, init: { status?: number } = {}) {
  const status = init.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function emptyResponse(status = 204) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({}),
    text: async () => "",
  } as unknown as Response;
}

describe("Watchlist", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("loads watchlist and renders rows; clicking a row calls onSelect", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([makeEntry("AAPL"), makeEntry("MSFT")]));
    const onSelect = jest.fn();

    render(<Watchlist selected={null} onSelect={onSelect} />);

    await screen.findByTestId("watchlist-row-AAPL");
    await screen.findByTestId("watchlist-row-MSFT");

    await userEvent.click(screen.getByTestId("watchlist-row-AAPL"));
    expect(onSelect).toHaveBeenCalledWith("AAPL");
  });

  it("flashes price on update", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([makeEntry("AAPL")]));

    render(<Watchlist selected={null} onSelect={() => {}} />);
    await screen.findByTestId("watchlist-row-AAPL");

    // wait for EventSource to open
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });

    act(() =>
      latestES().simulateMessage({
        AAPL: {
          ticker: "AAPL",
          price: 100,
          previous_price: 100,
          timestamp: 1,
          change: 0,
          change_percent: 0,
          direction: "flat",
        },
      }),
    );
    act(() =>
      latestES().simulateMessage({
        AAPL: {
          ticker: "AAPL",
          price: 105,
          previous_price: 100,
          timestamp: 2,
          change: 5,
          change_percent: 5,
          direction: "up",
        },
      }),
    );

    const cell = screen.getByTestId("price-AAPL");
    expect(cell.className).toContain("flash-up");
    expect(cell.textContent).toBe("105.00");
  });

  it("adds a ticker via the form and re-fetches", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([])) // initial GET
      .mockResolvedValueOnce(jsonResponse(makeEntry("TSLA"), { status: 201 })) // POST
      .mockResolvedValueOnce(jsonResponse([makeEntry("TSLA")])); // refresh GET

    render(<Watchlist selected={null} onSelect={() => {}} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const input = screen.getByLabelText("Add ticker");
    await userEvent.type(input, "tsla");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    await screen.findByTestId("watchlist-row-TSLA");

    const post = fetchMock.mock.calls[1];
    expect(post[0]).toBe("/api/watchlist");
    expect(post[1].method).toBe("POST");
    expect(JSON.parse(post[1].body)).toEqual({ ticker: "TSLA" });
  });

  it("surfaces add errors", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ detail: "Unknown ticker: ZZZ" }, { status: 400 }));

    render(<Watchlist selected={null} onSelect={() => {}} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText("Add ticker"), "ZZZ");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unknown ticker: ZZZ");
  });

  it("removes a ticker without selecting the row", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([makeEntry("AAPL")]))
      .mockResolvedValueOnce(emptyResponse(204))
      .mockResolvedValueOnce(jsonResponse([]));

    const onSelect = jest.fn();
    render(<Watchlist selected={null} onSelect={onSelect} />);
    await screen.findByTestId("watchlist-row-AAPL");

    await userEvent.click(screen.getByLabelText("Remove AAPL"));

    await waitFor(() =>
      expect(screen.queryByTestId("watchlist-row-AAPL")).toBeNull(),
    );
    expect(onSelect).not.toHaveBeenCalled();

    const del = fetchMock.mock.calls[1];
    expect(del[0]).toBe("/api/watchlist/AAPL");
    expect(del[1].method).toBe("DELETE");
  });
});
