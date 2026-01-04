---
pageClass: rule-details
sidebarDepth: 0
title: tailwind-variants/require-variants-call-styles-name
description: enforce that the first argument to variants() is a styles name identifier
frameworks: agnostic
since: v0.1.0
---

# tailwind-variants/require-variants-call-styles-name

> enforce that when calling a function returned by tailwind-variants (`tv()`), the result is assigned to a variable named `styles` (or a configurable name)

## :book: Rule Details

This rule enforces that when you call a function returned by `tv()` (from tailwind-variants), the result must be assigned to a variable named `styles` (by default), or to a custom name if configured. This helps ensure consistency and clarity in codebases using tailwind-variants.

## :wrench: Options

```json
{
	"tailwind-variants/require-variants-call-styles-name": ["error", {
		"name": "styles"
	}]
}
```

### `{ "name": "styles" }` (default)

<eslint-code-block :rules="{'tailwind-variants/require-variants-call-styles-name': ['error']}">

```js
// ✓ GOOD
const buttonVariants = tv({});
const styles = buttonVariants();
```

</eslint-code-block>

<eslint-code-block :rules="{'tailwind-variants/require-variants-call-styles-name': ['error']}">
```js
// ✗ BAD
const buttonVariants = tv({});
const button = buttonVariants();
```

</eslint-code-block>

### `{ "name": "variants" }`

<eslint-code-block :rules="{'tailwind-variants/require-variants-call-styles-name': ['error', { name: 'variants' }]}">

```js
// ✓ GOOD
const buttonVariants = tv({});
const variants = buttonVariants();
```

</eslint-code-block>

<eslint-code-block :rules="{'tailwind-variants/require-variants-call-styles-name': ['error', { name: 'variants' }]}">

```js
// ✗ BAD
const buttonVariants = tv({});
const styles = buttonVariants();
```

</eslint-code-block>

## :no_entry: Prohibited Patterns

Assigning the result of calling a function returned by `tv()` to any variable name other than the configured one is not allowed.

<eslint-code-block :rules="{'tailwind-variants/require-variants-call-styles-name': ['error']}">

```js
// ✗ BAD
const buttonVariants = tv({});
const button = buttonVariants();
const myStyles = buttonVariants();
```

</eslint-code-block>

<eslint-code-block :rules="{'tailwind-variants/require-variants-call-styles-name': ['error']}">

```js
// ✓ GOOD
const buttonVariants = tv({});
const styles = buttonVariants();
```

</eslint-code-block>

## :wrench: Auto-fix

This rule provides auto-fix functionality. When a variable name assigned from calling a variant function does not match the configured value, the fixer will automatically replace the name.

Before:
```jsx
const buttonVariants = tv({});
const button = buttonVariants();
```

After auto-fix (with default name):
```jsx
const buttonVariants = tv({});
const styles = buttonVariants();
```

## :rocket: Version

This rule was introduced in eslint-plugin-tailwind-variants v0.1.0

## :mag: Implementation

- [Rule source](https://github.com/domingasp/eslint-plugin-tailwind-variants/blob/main/src/rules/require-variants-call-styles-name.ts)
- [Test source](https://github.com/domingasp/eslint-plugin-tailwind-variants/blob/main/src/rules/require-variants-call-styles-name.test.ts)