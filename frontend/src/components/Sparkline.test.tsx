import { render } from "@testing-library/react";
import { Sparkline } from "./Sparkline";

describe("Sparkline", () => {
  it("renders empty svg when fewer than 2 points", () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.querySelector("polyline")).toBeNull();
  });

  it("renders polyline with points for a series", () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4]} width={40} height={20} />);
    const line = container.querySelector("polyline");
    expect(line).not.toBeNull();
    const points = line!.getAttribute("points") ?? "";
    expect(points.split(" ").length).toBe(4);
  });

  it("uses green stroke when trend is up", () => {
    const { container } = render(<Sparkline data={[1, 5]} />);
    const line = container.querySelector("polyline");
    expect(line!.getAttribute("stroke")).toContain("green");
  });

  it("uses red stroke when trend is down", () => {
    const { container } = render(<Sparkline data={[5, 1]} />);
    const line = container.querySelector("polyline");
    expect(line!.getAttribute("stroke")).toContain("red");
  });
});
