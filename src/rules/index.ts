import { ESLint } from "eslint";

import { rule as limitedInlineClasses } from "./limited-inline-classes.js";
import { rule as requireVariantsCallStylesName } from "./require-variants-call-styles-name.js";
import { rule as requireVariantsSuffix } from "./require-variants-suffix.js";

export const rules = {
  "limited-inline-classes": limitedInlineClasses,
  "require-variants-call-styles-name": requireVariantsCallStylesName,
  "require-variants-suffix": requireVariantsSuffix,
} as unknown as ESLint.Plugin["rules"];
