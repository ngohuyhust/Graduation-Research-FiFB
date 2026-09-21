import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["node_modules/**", "coverage/**", "dist/**"],
  },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: ["**/*.ts"] })),
  { files: ["**/*.ts"], rules: { "@typescript-eslint/no-require-imports": "off" } },
  prettier,
];
