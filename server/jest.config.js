module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
  clearMocks: true,
};
