import {
  InvalidTestCase,
  RuleTester as TSRuleTester,
  ValidTestCase,
} from "@typescript-eslint/rule-tester";
import vueParser from "vue-eslint-parser";

import { MESSAGE_IDS, rule } from "./limited-inline-classname.js";

const tester = new TSRuleTester();

const classes = {
  FIVE: "bg-red-500 text-white p-2 m-1 rounded",
  FOUR: "bg-red-500 text-white p-2 m-1",
  SINGLE: "bg-red-500",
  SIX: "bg-red-500 text-white p-2 m-1 rounded border",
} as const;

const vueParserConfig = {
  languageOptions: { parser: vueParser },
};

// #region Valid Test Cases
const valid: ValidTestCase<readonly unknown[]>[] = [
  // Vue: static class with acceptable number of classes
  {
    code: `<template><div class="${classes.FIVE}"></div></template>`,
    filename: "/components/Button.vue",
    name: "Vue: class with 5 classes",
    ...vueParserConfig,
  },
  {
    code: `<template><div class="${classes.FOUR}"></div></template>`,
    filename: "/components/Button.vue",
    name: "Vue: class with 4 classes",
    ...vueParserConfig,
  },
  {
    code: `<template><div class="${classes.SINGLE}"></div></template>`,
    filename: "/components/Button.vue",
    name: "Vue: class with 1 class",
    ...vueParserConfig,
  },
  {
    code: `<template><div class=""></div></template>`,
    filename: "/components/Button.vue",
    name: "Vue: empty class",
    ...vueParserConfig,
  },

  // Vue: dynamic class with acceptable number of classes
  {
    code: `<template><div :class="'${classes.FIVE}'"></div></template>`,
    filename: "/components/Button.vue",
    name: "Vue: :class with 5 classes (string literal)",
    ...vueParserConfig,
  },
  {
    code: `<template><div :class="\`${classes.FIVE}\`"></div></template>`,
    filename: "/components/Button.vue",
    name: "Vue: :class with 5 classes (template literal)",
    ...vueParserConfig,
  },
  {
    code: `<template><div :class="buttonVariants"></div></template>`,
    filename: "/components/Button.vue",
    name: "Vue: :class variable reference",
    ...vueParserConfig,
  },
  {
    code: `<template><div :class="['${classes.FOUR}', '${classes.SINGLE}']"></div></template>`,
    filename: "/components/Button.vue",
    name: "Vue: :class array with acceptable class count",
    ...vueParserConfig,
  },

  // JSX: static class with acceptable number of classes
  {
    code: `const element = <div className="${classes.FIVE}"></div>;`,
    filename: "/components/Button.tsx",
    name: "JSX: className with 5 classes",
  },
  {
    code: `const element = <div className="${classes.FOUR}"></div>;`,
    filename: "/components/Button.tsx",
    name: "JSX: className with 4 classes",
  },
  {
    code: `const element = <div className="${classes.SINGLE}"></div>;`,
    filename: "/components/Button.tsx",
    name: "JSX: className with 1 class",
  },
  {
    code: `const element = <div className=""></div>;`,
    filename: "/components/Button.tsx",
    name: "JSX: empty className",
  },

  // JSX: Dynamic className with acceptable number of classes
  {
    code: `const element = <div className={'${classes.FIVE}'}></div>;`,
    filename: "/components/Button.tsx",
    name: "JSX: className with 5 classes (string literal)",
  },
  {
    code: `const element = <div className={\`${classes.FIVE}\`}></div>;`,
    filename: "/components/Button.tsx",
    name: "JSX: className with 5 classes (template literal)",
  },
  {
    code: `const element = <div className={buttonVariants}></div>;`,
    filename: "/components/Button.tsx",
    name: "JSX: className variable reference",
  },
  {
    code: `const element = <div className={condition ? '${classes.FOUR}' : '${classes.SINGLE}'}></div>;`,
    filename: "/components/Button.tsx",
    name: "JSX: className with ternary (both sides <= 5 classes)",
  },

  // Options: Custom maxInlineClasses
  {
    code: `<template><div class="${classes.FOUR}"></div></template>`,
    filename: "/components/Button.vue",
    name: "Vue: 4 classes allowed with custom maxInlineClasses",
    options: [{ maxInlineClasses: 4 }],
    ...vueParserConfig,
  },
  {
    code: `const element = <div className="${classes.FOUR}"></div>;`,
    filename: "/components/Button.tsx",
    name: "JSX: 4 classes allowed with custom maxInlineClasses",
    options: [{ maxInlineClasses: 4 }],
  },

  // Options: directoryPattern exclusion
  {
    code: `<template><div class="${classes.SIX}"></div></template>`,
    filename: "/utils/helpers.vue",
    name: "Vue: 6 classes allowed outside of directoryPattern",
    options: [{ directoryPattern: "/components/" }],
    ...vueParserConfig,
  },
  {
    code: `const element = <div className="${classes.SIX}"></div>;`,
    filename: "/utils/helpers.tsx",
    name: "JSX: 6 classes allowed outside of directoryPattern",
    options: [{ directoryPattern: "/components/" }],
  },
];
// #endregion Valid Test Cases

// #region Invalid Test Cases
const invalid: InvalidTestCase<string, readonly unknown[]>[] = [
  // Vue: static class exceeding maxInlineClasses
  {
    code: `<template><div class="${classes.SIX}"></div></template>`,
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
    filename: "/components/Button.vue",
    name: "Vue: class with 6 classes",
    ...vueParserConfig,
  },

  // Vue: dynamic class exceeding maxInlineClasses
  {
    code: `<template><div :class="'${classes.SIX}'"></div></template>`,
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
    filename: "/components/Button.vue",
    name: "Vue: :class with 6 classes (string literal)",
    ...vueParserConfig,
  },
  {
    code: `<template><div :class="\`${classes.SIX}\`"></div></template>`,
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
    filename: "/components/Button.vue",
    name: "Vue: :class with 6 classes (template literal)",
    ...vueParserConfig,
  },
  {
    code: `<template><div :class="['${classes.SIX}', '${classes.SINGLE}']"></div></template>`,
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
    filename: "/components/Button.vue",
    name: "Vue: :class array with one item exceeding maxInlineClasses",
    ...vueParserConfig,
  },

  // JSX: static className exceeding maxInlineClasses
  {
    code: `const element = <div className="${classes.SIX}"></div>;`,
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
    filename: "/components/Button.tsx",
    name: "JSX: className with 6 classes",
  },

  // JSX: dynamic className exceeding maxInlineClasses
  {
    code: `const element = <div className={'${classes.SIX}'}></div>;`,
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
    filename: "/components/Button.tsx",
    name: "JSX: className with 6 classes (string literal)",
  },
  {
    code: `const element = <div className={\`${classes.SIX}\`}></div>;`,
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
    filename: "/components/Button.tsx",
    name: "JSX: className with 6 classes (template literal)",
  },
  {
    code: `const element = <div className={condition ? '${classes.SIX}' : '${classes.SINGLE}'}></div>;`,
    errors: [{ messageId: MESSAGE_IDS.limitedInlineClassName }],
    filename: "/components/Button.tsx",
    name: "JSX: className with ternary with 6 classes on left side",
  },

  // cn() usage violations
  {
    code: `<template><div :class="cn('${classes.SINGLE}')"></div></template>`,
    errors: [{ messageId: MESSAGE_IDS.noCnInClassName }],
    filename: "/components/Button.vue",
    name: "Vue: cn() in :class",
    ...vueParserConfig,
  },
  {
    code: `<template><div :class="cn('${classes.SINGLE}', cn('${classes.SINGLE}'))"></div></template>`,
    errors: [{ messageId: MESSAGE_IDS.noCnInClassName }],
    filename: "/components/Button.vue",
    name: "Vue: nested cn() in :class",
    ...vueParserConfig,
  },
  {
    code: `const element = <div className={cn('${classes.SINGLE}')}></div>;`,
    errors: [{ messageId: MESSAGE_IDS.noCnInClassName }],
    filename: "/components/Button.tsx",
    name: "JSX: cn() in className",
  },
  {
    code: `const element = <div className={cn('${classes.SINGLE}', cn('${classes.SINGLE}'))}></div>;`,
    errors: [{ messageId: MESSAGE_IDS.noCnInClassName }],
    filename: "/components/Button.tsx",
    name: "JSX: nested cn() in className",
  },
  {
    code: `const element = <div className={\`base \${cn('${classes.SINGLE}')}\`}></div>;`,
    errors: [{ messageId: MESSAGE_IDS.noCnInClassName }],
    filename: "/components/Button.tsx",
    name: "JSX: cn() in template literal",
  },

  // Multiple violations in one file
  {
    code: `<template><div :class="'${classes.SIX}'" :class="cn('${classes.SINGLE}')"></div></template>`,
    errors: [
      { messageId: MESSAGE_IDS.limitedInlineClassName },
      { messageId: MESSAGE_IDS.noCnInClassName },
    ],
    filename: "/components/Button.vue",
    name: "Vue: multiple :class violations",
    ...vueParserConfig,
  },
];
// #endregion Invalid Test Cases

tester.run("limited-inline-classname", rule as never, {
  invalid,
  valid,
});
