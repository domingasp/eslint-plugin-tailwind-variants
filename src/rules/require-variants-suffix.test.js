import { RuleTester } from "eslint";

import { MESSAGE_IDS, rule } from "./require-variants-suffix";

const tester = new RuleTester();

const valid = [
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

const invalid = [
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

tester.run("require-variants-suffix", rule, {
  invalid,
  valid,
});
