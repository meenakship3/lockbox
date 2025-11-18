import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { ignores: [
      'src/renderer/components/ui/**',
      'dist/**',
      'build/**',
      'node_modules/**'
  ]},
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"], ...js.configs.recommended, languageOptions: { globals: {...globals.browser, ...globals.node, ...globals.jest} } },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ["**/*.{ts,tsx,mts,cts}"],
  })),
  pluginReact.configs.flat.recommended,
  { rules: {
    '@typescript-eslint/no-require-imports': 'off',
    'react/react-in-jsx-scope': 'off'
  } }

]);
