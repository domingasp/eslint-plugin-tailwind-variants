---
pageClass: rule-details
sidebarDepth: 0
title: tailwind-variants/require-variants-suffix
description: require variables assigned from tv() to end with a specific suffix
frameworks: agnostic
since: v0.1.0
---

# tailwind-variants/require-variants-suffix

> require variables assigned from tv() to end with a specific suffix

## :book: Rule Details

This rule enforces that variables assigned from `tv()` function calls must end with a specific suffix (default: `Variants`). This helps maintain consistent naming conventions for tailwind-variants definitions throughout your codebase.

## :wrench: Options

```json
{
  "tailwind-variants/require-variants-suffix": ["error", {
    "suffix": "Variants"
  }]
}
```

- `suffix` (`string`) ... The suffix required for variables assigned from `tv()`. Default is `"Variants"`.

### `{ "suffix": "Variants" }` (default)

<eslint-code-block :rules="{'tailwind-variants/require-variants-suffix': ['error']}">

```jsx
/* ✓ GOOD */
const buttonVariants = tv({
  base: "font-medium",
  variants: {
    color: {
      primary: "bg-blue-500"
    }
  }
});

const cardVariants = tv({});
```

</eslint-code-block>

<eslint-code-block :rules="{'tailwind-variants/require-variants-suffix': ['error']}">

```jsx
/* ✗ BAD */
const button = tv({
  base: "font-medium",
  variants: {
    color: {
      primary: "bg-blue-500"
    }
  }
});

const card = tv({});
```

</eslint-code-block>

### `{ "suffix": "Styles" }`

<eslint-code-block :rules="{'tailwind-variants/require-variants-suffix': ['error', { suffix: 'Styles' }]}">

```jsx
/* ✓ GOOD */
const buttonStyles = tv({
  base: "font-medium",
  variants: {
    color: {
      primary: "bg-blue-500"
    }
  }
});
```

</eslint-code-block>

<eslint-code-block :rules="{'tailwind-variants/require-variants-suffix': ['error', { suffix: 'Styles' }]}">

```jsx
/* ✗ BAD */
const button = tv({
  base: "font-medium",
  variants: {
    color: {
      primary: "bg-blue-500"
    }
  }
});

const buttonVariants = tv({}); // Wrong suffix
```

</eslint-code-block>

## :wrench: Auto-fix

This rule provides auto-fix functionality. When a variable name doesn't end with the required suffix, the fixer will automatically append the suffix to the variable name.

Before:
```jsx
const button = tv({});
```

After auto-fix (with default suffix):
```jsx
const buttonVariants = tv({});
```

## :rocket: Version

This rule was introduced in eslint-plugin-tailwind-variants v0.1.0

## :mag: Implementation

- [Rule source](https://github.com/domingasp/eslint-plugin-tailwind-variants/blob/main/src/rules/require-variants-suffix.ts)
- [Test source](https://github.com/domingasp/eslint-plugin-tailwind-variants/blob/main/src/rules/require-variants-suffix.test.ts)