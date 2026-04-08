import type { NextConfig } from "next";

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["recharts"],

  // In dev mode (next dev), proxy /api/* to the FastAPI backend.
  // In production the static export is served by FastAPI on the same origin,
  // so no proxy is needed — returning [] keeps output: "export" happy.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
