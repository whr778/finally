import { render, screen } from "@testing-library/react";
import ConnectionDot from "@/components/ConnectionDot";

describe("ConnectionDot", () => {
  it.each([
    ["connected", "LIVE"],
    ["connecting", "CONNECTING"],
    ["disconnected", "DISCONNECTED"],
  ] as const)("shows correct label for %s status", (status, label) => {
    render(<ConnectionDot status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
