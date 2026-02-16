import { RuleTester } from "eslint";

import { MESSAGE_IDS, rule } from "./require-variants-call-styles-name";

const tester = new RuleTester();

/** @type {import("eslint").RuleTester.ValidTestCase[]} */
const valid = [
  {
    code: `const buttonVariants = tv({})`,
    name: "Direct tv() call - no enforcement",
  },
  {
    code: `
      const buttonVariants = tv({});
      const styles = buttonVariants();
    `,
    name: "Variant function call named 'styles' (default)",
  },
  {
    code: `
      const cardVariants = tv({});
      const variants = cardVariants();
    `,
    name: "Variable named custom 'variants'",
    options: [{ name: "variants" }],
  },
];

/** @type {import("eslint").RuleTester.InvalidTestCase[]} */
const invalid = [
  {
    code: `
      const buttonVariants = tv({});
      const buttonStyles = buttonVariants();
    `,
    errors: [
      {
        messageId: MESSAGE_IDS.requireVariantsCallStylesName,
        suggestions: [
          {
            messageId: MESSAGE_IDS.renameAllOccurrences,
            output: `
      const buttonVariants = tv({});
      const styles = buttonVariants();
    `,
          },
        ],
      },
    ],
    name: "Variant function call not named 'styles' (default)",
  },
  {
    code: `
      const cardVariants = tv({});
      const styles = cardVariants();
    `,
    errors: [
      {
        messageId: MESSAGE_IDS.requireVariantsCallStylesName,
        suggestions: [
          {
            messageId: MESSAGE_IDS.renameAllOccurrences,
            output: `
      const cardVariants = tv({});
      const variants = cardVariants();
    `,
          },
        ],
      },
    ],
    name: "Variant function call not named custom 'variants'",
    options: [{ name: "variants" }],
  },
  {
    code: `
      const buttonVariants = tv({});
      const buttonStyles = buttonVariants();
      console.log(buttonStyles);
      const result = buttonStyles();
    `,
    errors: [
      {
        messageId: MESSAGE_IDS.requireVariantsCallStylesName,
        suggestions: [
          {
            messageId: MESSAGE_IDS.renameAllOccurrences,
            output: `
      const buttonVariants = tv({});
      const styles = buttonVariants();
      console.log(styles);
      const result = styles();
    `,
          },
        ],
      },
    ],
    name: "Renames declaration and all references via suggestion",
  },
];

tester.run("require-variants-call-styles-name", rule, {
  invalid,
  valid,
});
