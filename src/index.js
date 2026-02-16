import css from "@eslint/css";

import pkg from "../package.json" with { type: "json" };

import { rules } from "./rules/index.js";

const { name: packageName, version: packageVersion } = pkg;

const pluginName = "tailwind-variants";

/** @type {import("eslint").ESLint.Plugin} */
const plugin = {
  meta: {
    name: packageName,
    version: packageVersion,
  },
  rules,
};

/**
 * @typedef {object} PluginConfigs
 * @property {import("eslint").Linter.Config[]} recommended Recommended ESLint configurations for this plugin.
 */

/** @type {PluginConfigs} */
export const configs = {
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

/** @type {import("eslint").ESLint.Plugin & { configs: PluginConfigs }} */
export default {
  configs,
  meta: plugin.meta,
  rules,
};
