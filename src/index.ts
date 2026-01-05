import { ESLint, Linter } from "eslint";

import {
  name as packageName,
  version as packageVersion,
} from "../package.json";
import { rules } from "./rules/index.js";

type PluginConfigs = {
  recommended: Linter.Config[];
};

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
  ...plugin,
  configs,
} as ESLint.Plugin & { configs: PluginConfigs };
