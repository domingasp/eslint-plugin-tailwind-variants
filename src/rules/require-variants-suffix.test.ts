import {
  type InvalidTestCase,
  type ValidTestCase,
  RuleTester,
} from "@typescript-eslint/rule-tester";

import {
  type MessageIds,
  type Options,
  MESSAGE_IDS,
  rule,
} from "./require-variants-suffix";

const tester = new RuleTester();

// #region Valid Test Cases
const valid: ValidTestCase<Options>[] = [
  {
    code: `const buttonVariants = tv({})`,
    name: "Variable ends with 'Variants' suffix (default)",
  },
  {
    code: `const buttonStyles = tv({})`,
    name: "Variable ends with custom 'Styles' suffix",
    options: [{ suffix: "Styles" }],
  },
];
// #endregion Valid Test Cases

// #region Invalid Test Cases
const invalid: InvalidTestCase<MessageIds, Options>[] = [
  {
    code: `const button = tv({})`,
    errors: [{ messageId: MESSAGE_IDS.requireVariantsSuffix }],
    name: "Variable does not end with 'Variants' suffix (default)",
    output: `const buttonVariants = tv({})`,
  },
  {
    code: `const button = tv({})`,
    errors: [{ messageId: MESSAGE_IDS.requireVariantsSuffix }],
    name: "Variable does not end with custom 'Styles' suffix",
    options: [{ suffix: "Styles" }],
    output: `const buttonStyles = tv({})`,
  },
];
// #endregion Invalid Test Cases

tester.run("require-variants-suffix", rule, {
  invalid,
  valid,
});
