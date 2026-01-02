import { TSESLint } from "@typescript-eslint/utils";

import { rule as limitedInlineClassName } from "./limited-inline-classname.js";

export const rules = {
  "limited-inline-classname": limitedInlineClassName,
} satisfies TSESLint.FlatConfig.Plugin["rules"];
