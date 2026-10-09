import js from "@eslint/js";
import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y";
export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": hooks, "jsx-a11y": a11y },
    rules: {
      ...hooks.configs.recommended.rules,
      ...a11y.configs.recommended.rules,
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        setInterval: "readonly",
        fetch: "readonly",
        File: "readonly",
        Request: "readonly",
        Response: "readonly",
        FormData: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        navigator: "readonly",
        confirm: "readonly",
        React: "readonly",
      },
    },
  },
);
