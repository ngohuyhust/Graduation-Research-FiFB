const tseslint = require("typescript-eslint");
const prettier = require("eslint-config-prettier");

module.exports = [
  {
    ignores: ["node_modules/**", "coverage/**", "dist/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        describe: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        jest: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      semi: ["error", "always"],
      quotes: ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],
    },
  },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ["**/*.ts"] })),
  { files: ["**/*.ts"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  prettier,
];
