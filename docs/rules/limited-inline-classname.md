---
pageClass: rule-details
sidebarDepth: 0
title: tailwind-variants/limited-inline-classname
description: enforce limited number of inline class names and prohibit cn() usage
frameworks: vue,react
since: v0.1.0
---

# tailwind-variants/limited-inline-classname

> enforce limited number of inline class names and prohibit cn() usage

## :book: Rule Details

This rule limits the number of inline class names that can be used in `className` (JSX) and `class`/`:class` (Vue) attributes. It also prohibits the use of `cn()` function calls within these attributes. Rule runs only within `/components/` (configurable via options).

The goal is to encourage the use of `tailwind-variants` for complex styling instead of inline class definitions.

## :wrench: Options

```json
{
  "tailwind-variants/limited-inline-classname": ["error", {
    "maxInlineClasses": 5,
    "directoryPattern": "/components/"
  }]
}
```

- `maxInlineClasses` (`number`) ... Maximum number of inline classes allowed. Default is `5`.
- `directoryPattern` (`string`) ... Directory pattern to match for this rule to apply. Default is `"/components/"`.

### `{ "maxInlineClasses": 5 }` (default)

<eslint-code-block :rules="{'tailwind-variants/limited-inline-classname': ['error']}">

```vue
<!-- ✓ GOOD -->
<template>
  <div class="bg-red-500 text-white p-2 m-1 rounded"></div>
</template>
```

</eslint-code-block>

<eslint-code-block :rules="{'tailwind-variants/limited-inline-classname': ['error']}">

```vue
<!-- ✗ BAD -->
<template>
  <div class="bg-red-500 text-white p-2 m-1 rounded border"></div>
</template>
```

</eslint-code-block>

### `{ "maxInlineClasses": 3 }`

<eslint-code-block :rules="{'tailwind-variants/limited-inline-classname': ['error', { maxInlineClasses: 3 }]}">

```jsx
/* ✓ GOOD */
const Button = () => (
  <div className="bg-red-500 text-white p-2"></div>
);
```

</eslint-code-block>

<eslint-code-block :rules="{'tailwind-variants/limited-inline-classname': ['error', { maxInlineClasses: 3 }]}">

```jsx
/* ✗ BAD */
const Button = () => (
  <div className="bg-red-500 text-white p-2 m-1"></div>
);
```

</eslint-code-block>

### `{ "directoryPattern": "/src/" }`

Only files matching the directory pattern will be checked by this rule.

<eslint-code-block :rules="{'tailwind-variants/limited-inline-classname': ['error', { directoryPattern: '/src/' }]}">

```jsx
// File: /src/components/Button.tsx
/* ✗ BAD - Rule applies in /src/ directory */
const Button = () => (
  <div className="bg-red-500 text-white p-2 m-1 rounded border"></div>
);
```

</eslint-code-block>

<eslint-code-block :rules="{'tailwind-variants/limited-inline-classname': ['error', { directoryPattern: '/src/' }]}">

```jsx
// File: /utils/helper.tsx
/* ✓ GOOD - Rule does not apply outside /src/ directory */
const Helper = () => (
  <div className="bg-red-500 text-white p-2 m-1 rounded border"></div>
);
```

</eslint-code-block>

## :no_entry: Prohibited Patterns

This rule prohibits the use of `cn()` function calls in className attributes, regardless of the number of classes.

<eslint-code-block :rules="{'tailwind-variants/limited-inline-classname': ['error']}">

```vue
<!-- ✗ BAD -->
<template>
  <div :class="cn('bg-red-500', 'text-white')"></div>
  <div :class="cn('bg-red-500', cn('text-white', 'p-2'))"></div>
</template>
```

</eslint-code-block>

<eslint-code-block :rules="{'tailwind-variants/limited-inline-classname': ['error']}">

```jsx
/* ✗ BAD */
const Button = () => (
  <div className={cn('bg-red-500', 'text-white')}></div>
);

const Button = () => (
  <div className={`base ${cn('bg-red-500', 'text-white')}`}></div>
);
```

</eslint-code-block>

## :rocket: Version

This rule was introduced in eslint-plugin-tailwind-variants v0.1.0

## :mag: Implementation

TODO

- Rule source
- Test source