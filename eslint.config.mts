import js from "@eslint/js";
import perfectionist from "eslint-plugin-perfectionist";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    extends: ["js/recommended"],
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: { globals: globals.node },
    plugins: { js },
  },
  tseslint.configs.recommended,
  perfectionist.configs["recommended-natural"],
  {
    rules: {
      "perfectionist/sort-objects": [
        "error",
        {
          customGroups: [
            {
              elementNamePattern: "^name$",
              groupName: "name",
            },
            {
              elementNamePattern: "^meta$",
              groupName: "meta",
            },
            {
              elementNamePattern: "^defaultOptions$",
              groupName: "defaultOptions",
            },
            {
              elementNamePattern: "^create$",
              groupName: "create",
            },
          ],
          groups: ["name", "meta", "defaultOptions", "create"],
          useConfigurationIf: {
            callingFunctionNamePattern: "^createRule$",
          },
        },
        { type: "natural" },
      ],
    },
  },
]);
