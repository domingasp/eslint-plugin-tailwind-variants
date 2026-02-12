import css from "@eslint/css";
import type { ESLint, Linter } from "eslint";

import {
  name as packageName,
  version as packageVersion,
} from "../package.json";

import { rules } from "./rules/index.js";

interface PluginConfigs {
  recommended: Linter.Config[];
}

const pluginName = "tailwind-variants";

const plugin = {
  meta: {
    name: packageName,
    version: packageVersion,
  },
  rules,
} as ESLint.Plugin;

export const configs: PluginConfigs = {
  recommended: [
    {
      plugins: {
        [pluginName]: plugin,
      },
      rules: {
        [`${pluginName}/limited-inline-classes`]: "error",
        [`${pluginName}/require-variants-call-styles-name`]: "error",
        [`${pluginName}/require-variants-suffix`]: "error",
      },
    },
    {
      files: ["**/*.css"],
      language: "css/css",
      plugins: { css },
      rules: {
        [`${pluginName}/sort-custom-properties`]: [
          "error",
          {
            emptyLineBetweenGroups: true,
          },
        ],
      },
    },
  ],
};

export { plugin };

export default {
  configs,
  meta: plugin.meta,
  rules: plugin.rules,
} as ESLint.Plugin & { configs: PluginConfigs };
