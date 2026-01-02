---
pageClass: rule-details
sidebarDepth: 0
title: tailwind-variants/require-variants-call-styles-name
description: enforce that the first argument to variants() is a styles name identifier
frameworks: agnostic
since: v0.1.0
---

# tailwind-variants/require-variants-call-styles-name

> enforce that the result of tailwind-variants (`tv()`) is assigned to a variable named `styles` (or a configurable name)

## :book: Rule Details

This rule enforces that the result of calling `tv()` (from tailwind-variants) must be assigned to a variable named `styles` (by default), or to a custom name if configured. This helps ensure consistency and clarity in codebases using tailwind-variants.

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
const styles = tv({});
```

</eslint-code-block>

<eslint-code-block :rules="{'tailwind-variants/require-variants-suffix': ['error']}">
```js
// ✗ BAD
const button = tv({});
```

</eslint-code-block>

### `{ "name": "variants" }`

<eslint-code-block :rules="{'tailwind-variants/require-variants-call-styles-name': ['error', { name: 'variants' }]}">

```js
// ✓ GOOD
const variants = tv({});
```

</eslint-code-block>

<eslint-code-block :rules="{'tailwind-variants/require-variants-call-styles-name': ['error', { name: 'variants' }]}">

```js
// ✗ BAD
const styles = tv({});
```

</eslint-code-block>

## :no_entry: Prohibited Patterns

Assigning the result of `tv()` to any variable name other than the configured one is not allowed.

<eslint-code-block :rules="{'tailwind-variants/require-variants-call-styles-name': ['error']}">

```js
// ✗ BAD
const button = tv({});
let myStyles = tv({});
```

</eslint-code-block>

<eslint-code-block :rules="{'tailwind-variants/require-variants-call-styles-name': ['error']}">

```js
// ✓ GOOD
const styles = tv({});
```

</eslint-code-block>

## :wrench: Auto-fix

This rule provides auto-fix functionality. When a variable name assigned from `tv` does not match the configured value, the fixer will automatically replace the name.

Before:
```jsx
const button = tv({});
```

After auto-fix (with default name):
```jsx
const styles = tv({});
```

## :rocket: Version

This rule was introduced in eslint-plugin-tailwind-variants v0.1.0

## :mag: Implementation

TODO

- Rule source
- Test source