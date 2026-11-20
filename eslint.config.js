import { defineConfig } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  // 1. Ignores
  {
    ignores: [
      "legacy/**",
      "**/dist/**",
      "**/.wrangler/**",
      "**/coverage/**",
      "apps/api/worker-configuration.d.ts",
      "apps/mobile/ios/**",
      "apps/mobile/android/**",
    ],
  },
  // 2. All TypeScript
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommendedTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "no-console": "error",
    },
  },
  // 3. Domain purity
  {
    files: ["packages/domain/src/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "The domain package must not do I/O" },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Pass time in as a parameter" },
        { object: "Math", property: "random", message: "Pass randomness in as a parameter" },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "Pass time in as a parameter",
        },
      ],
    },
  },
  // 4. API: no interactive D1 transactions; console only in the logger
  {
    files: ["apps/api/src/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='transaction']",
          message: "D1 has no interactive transactions; use UnitOfWork",
        },
      ],
    },
  },
  {
    files: ["apps/api/src/shared/logger.ts"],
    rules: { "no-console": "off" },
  },
  // 5. Web: React, hooks, accessibility, i18n
  {
    files: ["apps/web/src/**/*.tsx"],
    extends: [react.configs.flat.recommended, jsxA11y.flatConfigs.recommended],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: globals.browser },
    settings: { react: { version: "detect" } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react/jsx-no-literals": [
        "error",
        { noStrings: true, ignoreProps: true, allowedStrings: ["·", "—", "→", "/", ":"] },
      ],
      "react/react-in-jsx-scope": "off",
    },
  },
  // 6. Web layering: screens and ui do not fetch or touch Capacitor directly
  {
    files: ["apps/web/src/{screens,ui}/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Use the api-client, not fetch, in screens and ui" },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@capacitor/*"],
              message: "Use the platform adapter, not Capacitor directly",
            },
          ],
        },
      ],
    },
  },
  // 6b. Web: colours come from design tokens, never hex literals
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message: "Use a design token utility instead of a hex colour",
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}\\b/]",
          message: "Use a design token utility instead of a hex colour",
        },
      ],
    },
  },
  // 7. Tests
  {
    files: ["**/*.test.{ts,tsx}", "**/e2e/**", "**/test/**"],
    rules: {
      "react/jsx-no-literals": "off",
      "no-console": "off",
      "no-restricted-syntax": "off",
      "@typescript-eslint/no-floating-promises": "off",
    },
  },
);
