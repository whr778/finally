import { render, container } from "@testing-library/react";
import Sparkline from "@/components/Sparkline";

describe("Sparkline", () => {
  it("renders an SVG element", () => {
    const { container } = render(<Sparkline data={[100, 101, 102]} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders empty SVG for < 2 data points", () => {
    const { container } = render(<Sparkline data={[100]} />);
    const path = container.querySelector("path");
    expect(path).toBeNull();
  });

  it("uses green stroke for upward trend", () => {
    const { container } = render(<Sparkline data={[100, 105]} />);
    const path = container.querySelector("path");
    expect(path?.getAttribute("stroke")).toBe("#3fb950");
  });

  it("uses red stroke for downward trend", () => {
    const { container } = render(<Sparkline data={[105, 100]} />);
    const path = container.querySelector("path");
    expect(path?.getAttribute("stroke")).toBe("#f85149");
  });

  it("respects explicit positive=true", () => {
    const { container } = render(<Sparkline data={[105, 100]} positive={true} />);
    const path = container.querySelector("path");
    expect(path?.getAttribute("stroke")).toBe("#3fb950");
  });

  it("respects explicit positive=false", () => {
    const { container } = render(<Sparkline data={[100, 105]} positive={false} />);
    const path = container.querySelector("path");
    expect(path?.getAttribute("stroke")).toBe("#f85149");
  });
});
