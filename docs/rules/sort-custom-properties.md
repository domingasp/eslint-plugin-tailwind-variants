---
pageClass: rule-details
sidebarDepth: 0
title: tailwind-variants/sort-custom-properties
description: enforce consistent ordering of CSS custom properties (CSS variables)
frameworks: agnostic
since: v1.1.0
---

# tailwind-variants/sort-custom-properties

> enforce consistent ordering of CSS custom properties (CSS variables)

## :book: Rule Details

This rule enforces a consistent ordering of CSS custom properties (CSS variables) within CSS blocks. By default, properties are organized into logical groups (spacing, font, transition, color) with alphabetical ordering within each group. Properties that don't match any specified pattern are placed at the end.

The rule works with various CSS syntaxes including standard CSS, Tailwind CSS `@theme` and `@utility` blocks.

## :wrench: Options

```json
{
  "tailwind-variants/sort-custom-properties": ["error", {
    "order": ["^--spacing-", "^--size-", "^--font-", "^--weight-", "^--leading-", "^--tracking-", "^--radius-", "^--shadow-", "^--animate-", "^--transition-", "^--color-"],
    "emptyLineBetweenGroups": false
  }]
}
```

- `order` (`string[]`) ... Array of regex patterns defining the sort order for custom properties. Default is `["^--spacing-", "^--size-", "^--font-", "^--weight-", "^--leading-", "^--tracking-", "^--radius-", "^--shadow-", "^--animate-", "^--transition-", "^--color-"]`.
- `emptyLineBetweenGroups` (`boolean`) ... Whether to enforce empty lines between different property groups. Default is `false`.

### `{ "order": ["^--spacing-", "^--size-", "^--font-", "^--weight-", "^--leading-", "^--tracking-", "^--radius-", "^--shadow-", "^--animate-", "^--transition-", "^--color-"] }` (default)

<eslint-code-block :rules="{'tailwind-variants/sort-custom-properties': ['error']}">

```css
/* ✓ GOOD */
:root {
  --spacing-lg: 2rem;
  --spacing-sm: 1rem;
  --font-family: Arial;
  --font-size: 16px;
  --transition-duration: 300ms;
  --transition-easing: ease-in-out;
  --color-primary: #007bff;
  --color-secondary: #6c757d;
}
```

</eslint-code-block>

<eslint-code-block :rules="{'tailwind-variants/sort-custom-properties': ['error']}">

```css
/* ✗ BAD */
:root {
  --color-primary: #007bff;
  --font-family: Arial;
  --spacing-lg: 2rem;
  --transition-duration: 300ms;
}
```

</eslint-code-block>

### `{ order: ['^--color-', '^--font-'] }`

<eslint-code-block :rules="{'tailwind-variants/sort-custom-properties': ['error', { order: ['^--color-', '^--font-'] }]}">

```css
/* ✓ GOOD */
:root {
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --font-family: Arial;
  --font-size: 16px;
  --spacing-lg: 2rem; /* Unmatched patterns go to end */
}
```

</eslint-code-block>

### `{ emptyLineBetweenGroups: true }`

<eslint-code-block :rules="{'tailwind-variants/sort-custom-properties': ['error', { emptyLineBetweenGroups: true }]}">

```css
/* ✓ GOOD */
:root {
  --spacing-lg: 2rem;
  --spacing-sm: 1rem;

  --font-family: Arial;
  --font-size: 16px;

  --color-primary: #007bff;
}
```

</eslint-code-block>

<eslint-code-block :rules="{'tailwind-variants/sort-custom-properties': ['error', { emptyLineBetweenGroups: true }]}">

```css
/* ✗ BAD */
:root {
  --spacing-lg: 2rem;
  --font-family: Arial;
  --color-primary: #007bff;
}
```

</eslint-code-block>

## :gear: Pattern Matching

The rule supports various regex patterns for flexible ordering:

### Prefix Patterns

<eslint-code-block :rules="{'tailwind-variants/sort-custom-properties': ['error', { order: ['^--button-', '^--input-'] }]}">

```css
/* ✓ GOOD */
:root {
  --button-bg: blue;
  --button-text: white;
  --input-border: gray;
  --input-focus: blue;
}
```

</eslint-code-block>

### Suffix Patterns

<eslint-code-block :rules="{'tailwind-variants/sort-custom-properties': ['error', { order: ['-size$', '-color$'] }]}">

```css
/* ✓ GOOD */
:root {
  --button-size: large;
  --input-size: medium;
  --primary-color: blue;
  --secondary-color: red;
}
```

</eslint-code-block>

### Exact Name Patterns

<eslint-code-block :rules="{'tailwind-variants/sort-custom-properties': ['error', { order: ['^--z-index$', '^--opacity$'] }]}">

```css
/* ✓ GOOD */
:root {
  --z-index: 999;
  --opacity: 0.8;
  --color-primary: blue; /* Other properties go to end */
}
```

</eslint-code-block>

### Substring Patterns

<eslint-code-block :rules="{'tailwind-variants/sort-custom-properties': ['error', { order: ['dark', 'light'] }]}">

```css
/* ✓ GOOD */
:root {
  --dark-primary: black;
  --dark-secondary: gray;
  --light-primary: white;
  --light-secondary: lightgray;
  --primary-font: Arial; /* No match, goes to end */
}
```

</eslint-code-block>

## :sparkles: Supported Syntaxes

### Standard CSS

<eslint-code-block :rules="{'tailwind-variants/sort-custom-properties': ['error']}">

```css
/* ✓ GOOD */
:root {
  --spacing-lg: 2rem;
  --font-family: Arial;
  --color-primary: #007bff;
}

.component {
  --spacing-sm: 1rem;
  --font-size: 14px;
}
```

</eslint-code-block>

### Tailwind CSS Syntax

<eslint-code-block :rules="{'tailwind-variants/sort-custom-properties': ['error']}">

```css
/* ✓ GOOD */
@theme {
  --spacing-lg: 2rem;
  --font-family: Arial;
  --color-primary: #007bff;
}

@utility example {
  --spacing-sm: 1rem;
  --font-size: 16px;
  --color-text: #333;
}
```

</eslint-code-block>

### Mixed Properties

<eslint-code-block :rules="{'tailwind-variants/sort-custom-properties': ['error']}">

```css
/* ✓ GOOD */
:root {
  display: flex; /* Regular properties are not affected */
  margin: 0;
  --spacing-lg: 2rem; /* Custom properties are sorted */
  --font-family: Arial;
  --color-primary: #007bff;
}
```

</eslint-code-block>

## :wrench: Auto-fix

This rule provides auto-fix functionality. It will automatically:
- Reorder custom properties according to the configured pattern order
- Sort properties alphabetically within each group
- Add or remove empty lines between groups when `emptyLineBetweenGroups` is configured

Before:
```css
:root {
  --color-primary: #007bff;
  --font-family: Arial;
  --spacing-lg: 2rem;
}
```

After auto-fix:
```css
:root {
  --spacing-lg: 2rem;
  --font-family: Arial;
  --color-primary: #007bff;
}
```

## :rocket: Version

This rule was introduced in eslint-plugin-tailwind-variants v1.1.0

## :mag: Implementation

- [Rule source](https://github.com/domingasp/eslint-plugin-tailwind-variants/blob/main/src/rules/sort-custom-properties.ts)
- [Test source](https://github.com/domingasp/eslint-plugin-tailwind-variants/blob/main/src/rules/sort-custom-properties.test.ts)
