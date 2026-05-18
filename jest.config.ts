import type { Config } from "jest";

/**
 * Configuración de Jest para TypeScript con soporte de path alias (@/).
 *
 * Estructura de directorios:
 *  - tests/unit/       → pruebas unitarias puras (utils, validations, service logic)
 *  - tests/integration/ → pruebas de integración (repository + Prisma)
 *  - tests/e2e/        → pruebas end-to-end (Playwright en el futuro)
 */
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",

  // Mapeo del alias @/ a src/ para que los imports funcionen en pruebas
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Buscar pruebas en los tres directorios de test
  roots: ["<rootDir>/tests"],

  // Extensiones reconocidas
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // Transformar TypeScript con ts-jest
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },

  // Patrones de archivos de prueba
  testMatch: [
    "**/tests/unit/**/*.test.ts",
    "**/tests/unit/**/*.test.tsx",
    "**/tests/integration/**/*.test.ts",
    "**/tests/integration/**/*.test.tsx",
    "**/tests/e2e/**/*.test.ts",
    "**/tests/e2e/**/*.test.tsx",
  ],
};

export default config;
