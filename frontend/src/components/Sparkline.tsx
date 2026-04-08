"use client";

interface Props {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
}

/** Tiny SVG sparkline drawn from a price history buffer. */
export default function Sparkline({
  data,
  width = 64,
  height = 22,
  positive,
}: Props) {
  if (data.length < 2) {
    return <svg width={width} height={height} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const color =
    positive === undefined
      ? data[data.length - 1] >= data[0]
        ? "#3fb950"
        : "#f85149"
      : positive
      ? "#3fb950"
      : "#f85149";

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </svg>
  );
}
