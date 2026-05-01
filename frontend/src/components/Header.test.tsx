import { act, render, screen, waitFor } from "@testing-library/react";
import { Header } from "./Header";

const okJson = (body: object) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

const setFetch = (fn: jest.Mock) => {
  (global as unknown as { fetch: typeof fetch }).fetch =
    fn as unknown as typeof fetch;
};

interface MockES extends EventSource {
  simulateMessage: (data: object) => void;
}

function latestES(): MockES {
  const ctor = (
    global as unknown as { EventSource: { instances: MockES[] } }
  ).EventSource;
  return ctor.instances[ctor.instances.length - 1];
}

describe("Header", () => {
  afterEach(() => {
    delete (global as { fetch?: typeof fetch }).fetch;
    jest.useRealTimers();
  });

  it("renders brand and dash placeholders before portfolio loads", () => {
    setFetch(jest.fn().mockReturnValue(new Promise(() => {})));
    render(<Header />);
    expect(screen.getByText("FinAlly")).toBeInTheDocument();
    expect(screen.getByText("AI Trading Workstation")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBe(2);
  });

  it("renders formatted total value and cash once portfolio loads", async () => {
    setFetch(
      jest.fn().mockResolvedValue(
        okJson({
          cash_balance: 10000,
          positions: [],
          total_value: 12345.67,
        }),
      ),
    );
    render(<Header />);
    await waitFor(() =>
      expect(screen.getByText("$12,345.67")).toBeInTheDocument(),
    );
    expect(screen.getByText("$10,000.00")).toBeInTheDocument();
  });

  it("shows the connection dot transitioning to connected on SSE open", async () => {
    setFetch(jest.fn().mockReturnValue(new Promise(() => {})));
    render(<Header />);

    const dot = screen.getByRole("status");
    expect(dot).toHaveAttribute("data-status", "connecting");

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveAttribute(
        "data-status",
        "connected",
      ),
    );
  });

  it("flags disconnected status on SSE error", async () => {
    setFetch(jest.fn().mockReturnValue(new Promise(() => {})));
    render(<Header />);

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveAttribute(
        "data-status",
        "connected",
      ),
    );

    act(() => {
      latestES().onerror?.(new Event("error"));
    });

    expect(screen.getByRole("status")).toHaveAttribute(
      "data-status",
      "disconnected",
    );
  });

  it("polls /api/portfolio on an interval", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        okJson({ cash_balance: 100, positions: [], total_value: 100 }),
      );
    setFetch(fetchMock);

    jest.useFakeTimers();
    render(<Header />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
