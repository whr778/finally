"use client";

import { useId } from "react";

interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
}

export default function Sparkline({ points, width = 60, height = 24 }: SparklineProps) {
  const gradId = useId();

  if (points.length < 2) return <svg width={width} height={height} />;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return `${x},${y}`;
  });

  const polylinePoints = coords.join(" ");
  const areaPoints = `0,${height} ${polylinePoints} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#209dd7" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#209dd7" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline points={polylinePoints} fill="none" stroke="#209dd7" strokeWidth={1.5} />
    </svg>
  );
}
