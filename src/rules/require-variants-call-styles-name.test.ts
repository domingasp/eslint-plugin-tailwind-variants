import {
  InvalidTestCase,
  RuleTester,
  ValidTestCase,
} from "@typescript-eslint/rule-tester";

import {
  MESSAGE_IDS,
  MessageIds,
  Options,
  rule,
} from "./require-variants-call-styles-name";

const tester = new RuleTester();

// #region Valid Test Cases
const valid: ValidTestCase<Options>[] = [
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
// #endregion Valid Test Cases

// #region Invalid Test Cases
const invalid: InvalidTestCase<MessageIds, Options>[] = [
  {
    code: `
			const buttonVariants = tv({});
			const buttonStyles = buttonVariants();
		`,
    errors: [{ messageId: MESSAGE_IDS.requireVariantsCallStylesName }],
    name: "Variant function call not named 'styles' (default)",
    output: `
			const buttonVariants = tv({});
			const styles = buttonVariants();
		`,
  },
  {
    code: `
			const cardVariants = tv({});
			const styles = cardVariants();
		`,
    errors: [{ messageId: MESSAGE_IDS.requireVariantsCallStylesName }],
    name: "Variant function call not named custom 'variants'",
    options: [{ name: "variants" }],
    output: `
			const cardVariants = tv({});
			const variants = cardVariants();
		`,
  },
];
// #endregion Invalid Test Cases

tester.run("require-variants-call-styles-name", rule, {
  invalid,
  valid,
});
