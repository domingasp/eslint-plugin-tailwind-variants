import {
  InvalidTestCase,
  RuleTester,
  ValidTestCase,
} from "@typescript-eslint/rule-tester";

import { MESSAGE_IDS, rule } from "./require-variants-call-styles-name";

const tester = new RuleTester();

// #region Valid Test Cases
const valid: ValidTestCase<readonly unknown[]>[] = [
  {
    code: `const styles = tv({})`,
    name: "Variable named 'styles' (default)",
  },
  {
    code: `const variants = tv({})`,
    name: "Variable named custom 'variants'",
    options: [{ name: "variants" }],
  },
];
// #endregion Valid Test Cases

// #region Invalid Test Cases
const invalid: InvalidTestCase<string, readonly unknown[]>[] = [
  {
    code: `const variants = tv({})`,
    errors: [{ messageId: MESSAGE_IDS.requireVariantsCallStylesName }],
    name: "Variable not named 'styles' (default)",
    output: `const styles = tv({})`,
  },
  {
    code: `const styles = tv({})`,
    errors: [{ messageId: MESSAGE_IDS.requireVariantsCallStylesName }],
    name: "Variable not named custom 'variants'",
    options: [{ name: "variants" }],
    output: `const variants = tv({})`,
  },
];
// #endregion Invalid Test Cases

tester.run("require-variants-call-styles-name", rule as never, {
  invalid,
  valid,
});
