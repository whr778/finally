import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Mock canvas-based libraries
    "^lightweight-charts$": "<rootDir>/src/__mocks__/lightweight-charts.ts",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/layout.tsx",
    "!src/__mocks__/**",
  ],
  coverageThreshold: {
    global: { lines: 80 },
  },
};

export default createJestConfig(config);
