import type { Config } from "jest";

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
        "^lucide-react$": "<rootDir>/tests/__mocks__/lucide-react.tsx",
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
        "^lucide-react$": "<rootDir>/tests/__mocks__/lucide-react.tsx",
        "^@/components/ui/.*$": "<rootDir>/tests/__mocks__/shadcn-ui.tsx",
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
