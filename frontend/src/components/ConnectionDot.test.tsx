import { render, screen } from "@testing-library/react";
import { ConnectionDot } from "./ConnectionDot";

describe("ConnectionDot", () => {
  it("renders all three statuses with the right label", () => {
    const cases = [
      ["connected", "Connected"],
      ["connecting", "Connecting"],
      ["disconnected", "Disconnected"],
    ] as const;

    for (const [status, label] of cases) {
      const { unmount } = render(<ConnectionDot status={status} />);
      const node = screen.getByRole("status");
      expect(node).toHaveAttribute("data-status", status);
      expect(node).toHaveAttribute("aria-label", `Connection: ${label}`);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });
});
