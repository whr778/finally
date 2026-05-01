interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

/** Tiny SVG line chart of a numeric series. Auto-colors green/red by trend. */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color,
}: SparklineProps) {
  if (data.length < 2) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }

  let min = data[0];
  let max = data[0];
  for (const v of data) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = (i * stepX).toFixed(2);
      const y = (height - ((v - min) / range) * height).toFixed(2);
      return `${x},${y}`;
    })
    .join(" ");

  const stroke =
    color ?? (data[data.length - 1] >= data[0] ? "var(--green)" : "var(--red)");

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="price trend sparkline"
    >
      <polyline fill="none" stroke={stroke} strokeWidth="1.25" points={points} />
    </svg>
  );
}
