import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.spec.json" }] },
  clearMocks: true,
  setupFiles: ["<rootDir>/tests/setup-env.ts"],
};

export default config;
