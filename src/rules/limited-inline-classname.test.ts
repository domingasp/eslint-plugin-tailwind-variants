import {
  InvalidTestCase,
  RuleTester as TSRuleTester,
  ValidTestCase,
} from "@typescript-eslint/rule-tester";
import { MESSAGE_IDS, rule } from "./limited-inline-classname.js";

const tester = new TSRuleTester();

const classes = {
  SIX: "bg-red-500 text-white p-2 m-1 rounded border",
  FIVE: "bg-red-500 text-white p-2 m-1 rounded",
  FOUR: "bg-red-500 text-white p-2 m-1",
  SINGLE: "bg-red-500",
} as const;

const vueParser = {
  languageOptions: { parser: require("vue-eslint-parser") },
};

type TestCase =
  | ValidTestCase<readonly unknown[]>
  | InvalidTestCase<string, readonly unknown[]>;

// #region Valid Test Cases
const valid: ValidTestCase<readonly unknown[]>[] = [
  // Vue: static class with acceptable number of classes
  {
    name: "Vue: class with 5 classes",
    code: `<template><div class="${classes.FIVE}"></div></template>`,
    filename: "/components/Button.vue",
    ...vueParser,
  },
  {
    name: "Vue: class with 4 classes",
    code: `<template><div class="${classes.FOUR}"></div></template>`,
    filename: "/components/Button.vue",
    ...vueParser,
  },
  {
    name: "Vue: class with 1 class",
    code: `<template><div class="${classes.SINGLE}"></div></template>`,
    filename: "/components/Button.vue",
    ...vueParser,
  },
  {
    name: "Vue: empty class",
    code: `<template><div class=""></div></template>`,
    filename: "/components/Button.vue",
    ...vueParser,
  },

  // Vue: dynamic class with acceptable number of classes
  {
    name: "Vue: :class with 5 classes (string literal)",
    code: `<template><div :class="'${classes.FIVE}'"></div></template>`,
    filename: "/components/Button.vue",
    ...vueParser,
  },
  {
    name: "Vue: :class with 5 classes (template literal)",
    code: `<template><div :class="\`${classes.FIVE}\`"></div></template>`,
    filename: "/components/Button.vue",
    ...vueParser,
  },
  {
    name: "Vue: :class variable reference",
    code: `<template><div :class="buttonVariants"></div></template>`,
    filename: "/components/Button.vue",
    ...vueParser,
  },
  {
    name: "Vue: :class array with acceptable class count",
    code: `<template><div :class="['${classes.FOUR}', '${classes.SINGLE}']"></div></template>`,
    filename: "/components/Button.vue",
    ...vueParser,
  },

  // JSX: static class with acceptable number of classes
  {
    name: "JSX: className with 5 classes",
    code: `const element = <div className="${classes.FIVE}"></div>;`,
    filename: "/components/Button.tsx",
  },
  {
    name: "JSX: className with 4 classes",
    code: `const element = <div className="${classes.FOUR}"></div>;`,
    filename: "/components/Button.tsx",
  },
  {
    name: "JSX: className with 1 class",
    code: `const element = <div className="${classes.SINGLE}"></div>;`,
    filename: "/components/Button.tsx",
  },
  {
    name: "JSX: empty className",
    code: `const element = <div className=""></div>;`,
    filename: "/components/Button.tsx",
  },

  // JSX: Dynamic className with acceptable number of classes
  {
    name: "JSX: className with 5 classes (string literal)",
    code: `const element = <div className={'${classes.FIVE}'}></div>;`,
    filename: "/components/Button.tsx",
  },
  {
    name: "JSX: className with 5 classes (template literal)",
    code: `const element = <div className={\`${classes.FIVE}\`}></div>;`,
    filename: "/components/Button.tsx",
  },
  {
    name: "JSX: className variable reference",
    code: `const element = <div className={buttonVariants}></div>;`,
    filename: "/components/Button.tsx",
  },
  {
    name: "JSX: className with ternary (both sides <= 5 classes)",
    code: `const element = <div className={condition ? '${classes.FOUR}' : '${classes.SINGLE}'}></div>;`,
    filename: "/components/Button.tsx",
  },

  // Options: Custom maxInlineClasses
  {
    name: "Vue: 4 classes allowed with custom maxInlineClasses",
    code: `<template><div class="${classes.FOUR}"></div></template>`,
    filename: "/components/Button.vue",
    options: [{ maxInlineClasses: 4 }],
    ...vueParser,
  },
  {
    name: "JSX: 4 classes allowed with custom maxInlineClasses",
    code: `const element = <div className="${classes.FOUR}"></div>;`,
    filename: "/components/Button.tsx",
    options: [{ maxInlineClasses: 4 }],
  },

  // Options: directoryPattern exclusion
  {
    name: "Vue: 6 classes allowed outside of directoryPattern",
    code: `<template><div class="${classes.SIX}"></div></template>`,
    filename: "/utils/helpers.vue",
    options: [{ directoryPattern: "/components/" }],
    ...vueParser,
  },
  {
    name: "JSX: 6 classes allowed outside of directoryPattern",
    code: `const element = <div className="${classes.SIX}"></div>;`,
    filename: "/utils/helpers.tsx",
    options: [{ directoryPattern: "/components/" }],
  },
];
// #endregion Valid Test Cases

// #region Invalid Test Cases
const invalid: InvalidTestCase<string, readonly unknown[]>[] = [
  // Vue: static class exceeding maxInlineClasses
  {
    name: "Vue: class with 6 classes",
    code: `<template><div class="${classes.SIX}"></div></template>`,
    filename: "/components/Button.vue",
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
    ...vueParser,
  },

  // Vue: dynamic class exceeding maxInlineClasses
  {
    name: "Vue: :class with 6 classes (string literal)",
    code: `<template><div :class="'${classes.SIX}'"></div></template>`,
    filename: "/components/Button.vue",
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
    ...vueParser,
  },
  {
    name: "Vue: :class with 6 classes (template literal)",
    code: `<template><div :class="\`${classes.SIX}\`"></div></template>`,
    filename: "/components/Button.vue",
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
    ...vueParser,
  },
  {
    name: "Vue: :class array with one item exceeding maxInlineClasses",
    code: `<template><div :class="['${classes.SIX}', '${classes.SINGLE}']"></div></template>`,
    filename: "/components/Button.vue",
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
    ...vueParser,
  },

  // JSX: static className exceeding maxInlineClasses
  {
    name: "JSX: className with 6 classes",
    code: `const element = <div className="${classes.SIX}"></div>;`,
    filename: "/components/Button.tsx",
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
  },

  // JSX: dynamic className exceeding maxInlineClasses
  {
    name: "JSX: className with 6 classes (string literal)",
    code: `const element = <div className={'${classes.SIX}'}></div>;`,
    filename: "/components/Button.tsx",
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
  },
  {
    name: "JSX: className with 6 classes (template literal)",
    code: `const element = <div className={\`${classes.SIX}\`}></div>;`,
    filename: "/components/Button.tsx",
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
  },
  {
    name: "JSX: className with ternary with 6 classes on left side",
    code: `const element = <div className={condition ? '${classes.SIX}' : '${classes.SINGLE}'}></div>;`,
    filename: "/components/Button.tsx",
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
  },

  // cn() usage violations
  {
    name: "Vue: cn() in :class",
    code: `<template><div :class="cn('${classes.SINGLE}')"></div></template>`,
    filename: "/components/Button.vue",
    errors: [{ messageId: MESSAGE_IDS.noCnInClassName }],
    ...vueParser,
  },
  {
    name: "Vue: nested cn() in :class",
    code: `<template><div :class="cn('${classes.SINGLE}', cn('${classes.SINGLE}'))"></div></template>`,
    filename: "/components/Button.vue",
    errors: [{ messageId: MESSAGE_IDS.noCnInClassName }],
    ...vueParser,
  },
  {
    name: "JSX: cn() in className",
    code: `const element = <div className={cn('${classes.SINGLE}')}></div>;`,
    filename: "/components/Button.tsx",
    errors: [{ messageId: MESSAGE_IDS.noCnInClassName }],
  },
  {
    name: "JSX: nested cn() in className",
    code: `const element = <div className={cn('${classes.SINGLE}', cn('${classes.SINGLE}'))}></div>;`,
    filename: "/components/Button.tsx",
    errors: [{ messageId: MESSAGE_IDS.noCnInClassName }],
  },
  {
    name: "JSX: cn() in template literal",
    code: `const element = <div className={\`base \${cn('${classes.SINGLE}')}\`}></div>;`,
    filename: "/components/Button.tsx",
    errors: [{ messageId: MESSAGE_IDS.noCnInClassName }],
  },

  // Multiple violations in one file
  {
    name: "Vue: multiple :class violations",
    code: `<template><div :class="'${classes.SIX}'" :class="cn('${classes.SINGLE}')"></div></template>`,
    filename: "/components/Button.vue",
    errors: [
      { messageId: MESSAGE_IDS.limitedInlineClassName },
      { messageId: MESSAGE_IDS.noCnInClassName },
    ],
    ...vueParser,
  },
];
// #endregion Invalid Test Cases

tester.run("limited-inline-classname", rule as any, {
  valid,
  invalid,
});
