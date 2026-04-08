import { render, screen } from "@testing-library/react";
import Header from "@/components/Header";

describe("Header", () => {
  it("renders FinAlly brand name", () => {
    render(<Header totalValue={10000} cashBalance={8000} status="connected" />);
    expect(screen.getByText("Fin")).toBeInTheDocument();
    expect(screen.getByText("Ally")).toBeInTheDocument();
  });

  it("displays total portfolio value", () => {
    render(<Header totalValue={12345.67} cashBalance={8000} status="connected" />);
    expect(screen.getByTestId("total-value")).toHaveTextContent("12,345.67");
  });

  it("displays cash balance", () => {
    render(<Header totalValue={10000} cashBalance={3456.78} status="connected" />);
    expect(screen.getByTestId("cash-balance")).toHaveTextContent("3,456.78");
  });

  it("shows em dash when values are null", () => {
    render(<Header totalValue={null} cashBalance={null} status="connecting" />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("shows connection dot with correct status", () => {
    render(<Header totalValue={null} cashBalance={null} status="disconnected" />);
    expect(screen.getByTestId("connection-dot")).toHaveTextContent("DISCONNECTED");
  });

  it("shows LIVE for connected status", () => {
    render(<Header totalValue={null} cashBalance={null} status="connected" />);
    expect(screen.getByTestId("connection-dot")).toHaveTextContent("LIVE");
  });
});
