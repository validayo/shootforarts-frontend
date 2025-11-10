import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import parser from "@typescript-eslint/parser";
import plugin from "@typescript-eslint/eslint-plugin";
export default [
  { ignores: ["dist"] },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2020, parser, parserOptions: { sourceType: "module", ecmaVersion: "latest" }, globals: globals.browser },
    plugins: { "@typescript-eslint": plugin, "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...js.configs.recommended.rules,
      ...plugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
];
