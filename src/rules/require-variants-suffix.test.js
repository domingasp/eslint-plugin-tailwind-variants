import { RuleTester } from "eslint";

import { MESSAGE_IDS, rule } from "./require-variants-suffix";

const tester = new RuleTester();

/** @type {import("eslint").RuleTester.ValidTestCase[]} */
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

/** @type {import("eslint").RuleTester.InvalidTestCase[]} */
const invalid = [
  {
    code: `const button = tv({})`,
    errors: [
      {
        messageId: MESSAGE_IDS.requireVariantsSuffix,
        suggestions: [
          {
            messageId: MESSAGE_IDS.renameAllOccurrences,
            output: `const buttonVariants = tv({})`,
          },
        ],
      },
    ],
    name: "Variable does not end with 'Variants' suffix (default)",
  },
  {
    code: `const button = tv({})`,
    errors: [
      {
        messageId: MESSAGE_IDS.requireVariantsSuffix,
        suggestions: [
          {
            messageId: MESSAGE_IDS.renameAllOccurrences,
            output: `const buttonStyles = tv({})`,
          },
        ],
      },
    ],
    name: "Variable does not end with custom 'Styles' suffix",
    options: [{ suffix: "Styles" }],
  },
  {
    code: `
      const button = tv({});
      console.log(button);
      const result = button;
    `,
    errors: [
      {
        messageId: MESSAGE_IDS.requireVariantsSuffix,
        suggestions: [
          {
            messageId: MESSAGE_IDS.renameAllOccurrences,
            output: `
      const buttonVariants = tv({});
      console.log(buttonVariants);
      const result = buttonVariants;
    `,
          },
        ],
      },
    ],
    name: "Renames declaration and all references via suggestion",
  },
];

tester.run("require-variants-suffix", rule, {
  invalid,
  valid,
});
