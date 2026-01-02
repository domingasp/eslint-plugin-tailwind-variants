import { Linter } from "@typescript-eslint/utils/ts-eslint";
import { rules } from "./rules/index.js";

const plugin = {
  meta: {
    name: "eslint-plugin-tailwind-variants",
    version: "0.1.0",
    namespace: "tailwind-variants",
  },
  // Plugin type expects Config rather than ConfigType
  configs: {} as Record<string, Linter.Config>,
  rules,
} satisfies Linter.Plugin;

Object.assign(plugin.configs, {
  recommended: [
    {
      plugins: {
        "eslint-plugin-tailwind-variants": plugin,
      },
      rules: {
        "tailwind-variants/limited-inline-classname": "error",
      },
    },
  ] satisfies Linter.ConfigType,
});

export default plugin;
