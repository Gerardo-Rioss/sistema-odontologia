import type { Config } from "jest";

/**
 * Jest dual-environment configuration.
 *
 * Uses the `projects[]` array to separate test environments:
 *  - node:  unit tests and service-level tests (no DOM needed)
 *  - jsdom: integration tests and a11y audits (need DOM APIs)
 *
 * Module alias `@/` maps to `src/` for clean imports in tests.
 * CSS modules are mocked via identity-obj-proxy.
 */
const config: Config = {
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      testMatch: [
        "<rootDir>/tests/unit/**/*.test.ts",
        "<rootDir>/tests/unit/**/*.test.tsx",
      ],
      preset: "ts-jest",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
      },
      moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
      },
    },
    {
      displayName: "integration",
      testEnvironment: "jsdom",
      testMatch: [
        "<rootDir>/tests/integration/**/*.test.ts",
        "<rootDir>/tests/integration/**/*.test.tsx",
        "<rootDir>/tests/a11y/**/*.test.tsx",
      ],
      preset: "ts-jest",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^next/server$": "<rootDir>/tests/__mocks__/next-server.ts",
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
      },
      moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
      },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    },
  ],
};

export default config;
