import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  testMatch: ["**/tests/integration/**/*.integration.ts"],
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.spec.json" }] },
  setupFiles: ["<rootDir>/tests/integration/setup-env.ts"],
  testTimeout: 15000,
};
export default config;
