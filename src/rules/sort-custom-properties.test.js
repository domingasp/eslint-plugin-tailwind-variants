// oxlint-disable max-lines
import css from "@eslint/css";
import { RuleTester } from "eslint";

import { MESSAGE_IDS, rule } from "./sort-custom-properties";

const tester = new RuleTester({
  language: "css/css",
  plugins: { css },
});

/** @type {import("eslint").RuleTester.ValidTestCase[]} */
const valid = [
  {
    code: `
			:root {
				--font-family: Arial;
				--color-primary: #007bff;
			}
		`,
    filename: "styles.css",
    name: "Properties already sorted correctly (default order)",
  },
  {
    code: `
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
		`,
    filename: "styles.css",
    name: "All default order groups already in correct order",
  },
  {
    code: `
			:root {
				--font-weight: bold;
				--margin-top: 10px;
				--padding-left: 5px;
			}
		`,
    filename: "styles.css",
    name: "Properties without specified order (should go to end)",
  },
  {
    code: `
			:root {
				--font-family: Arial;
			}
		`,
    filename: "styles.css",
    name: "Single custom property",
  },
  {
    code: `
			:root {
				--font-family: Arial;
				--color-primary: #007bff;

				.dark {
					--font-family: Arial;
					--color-primary: #007bff;
				}
			}
		`,
    filename: "styles.css",
    name: "Nested blocks",
  },
  {
    code: `
			:root {
				regular-property: value;
				--font-family: Arial;
				--color-primary: #007bff;
			}
		`,
    filename: "styles.css",
    name: "Mixed regular and custom properties",
  },
  {
    code: `
			:root {
				--font-family: Arial;
				--font-size: 16px;
			}
		`,
    filename: "styles.css",
    name: "Multiple properties with same order pattern in alphabetical order",
  },
  {
    code: `
			@theme {
				--font-family: Arial;
				--color-primary: #007bff;
			}

			@utility example {
				--font-family: Arial;
				--color-primary: #007bff;
			}
		`,
    filename: "styles.css",
    name: "Work in tailwind syntax",
  },
  // Options
  {
    code: `
			:root {
				--color-primary: #007bff;
				--font-family: Arial;
			}
		`,
    filename: "styles.css",
    name: "Custom order",
    options: [{ order: ["^--color-", "^--font-"] }],
  },
  {
    code: `
			:root {
				--custom-primary: red;
				--spacing-lg: 2rem;
				--font-family: Arial;
			}
		`,
    filename: "styles.css",
    name: "Custom order with unlisted patterns at end",
    options: [{ order: ["^--custom-", "^--spacing-"] }],
  },
  {
    code: `
			:root {
				--spacing-lg: 2rem;

				--font-family: Arial;
			}
		`,
    filename: "styles.css",
    name: "Empty line between groups",
    options: [{ emptyLineBetweenGroups: true }],
  },
  {
    code: `
			:root {
				--spacing-lg: 2rem;
				--spacing-sm: 1rem;

				--font-family: Arial;
				--font-size: 16px;

				--color-primary: #007bff;
			}
		`,
    filename: "styles.css",
    name: "Multiple groups already correctly spaced with empty lines",
    options: [{ emptyLineBetweenGroups: true }],
  },
  {
    code: `
			:root {
				--font-family: Arial;
			}
		`,
    filename: "styles.css",
    name: "Single property with emptyLineBetweenGroups enabled",
    options: [{ emptyLineBetweenGroups: true }],
  },
  // Suffix-based order patterns
  {
    code: `
			:root {
				--button-size: large;
				--input-size: medium;
				--primary-color: blue;
				--secondary-color: red;
			}
		`,
    filename: "styles.css",
    name: "Properties ordered by suffix (-size before -color)",
    options: [{ order: ["-size$", "-color$"] }],
  },
  {
    code: `
			:root {
				--border-radius: 4px;
				--button-radius: 8px;
				--card-width: 300px;
				--sidebar-width: 250px;
			}
		`,
    filename: "styles.css",
    name: "Properties ordered by multiple suffix patterns",
    options: [{ order: ["-radius$", "-width$"] }],
  },
  // Substring-based patterns
  {
    code: `
			:root {
				--dark-primary: black;
				--dark-secondary: gray;
				--light-primary: white;
				--light-secondary: lightgray;
				--primary-font: Arial;
			}
		`,
    filename: "styles.css",
    name: "Properties ordered by substring patterns (dark, light, then others)",
    options: [{ order: ["dark", "light"] }],
  },
  // Exact name patterns
  {
    code: `
			:root {
				--z-index: 999;
				--opacity: 0.8;
				--color-primary: blue;
				--font-family: Arial;
			}
		`,
    filename: "styles.css",
    name: "Properties with exact name priority",
    options: [{ order: ["^--z-index$", "^--opacity$"] }],
  },
  {
    code: `
			:root {
				--background-color: white;
				--margin-top: 20px;
				--top: 5px;
				--width: 100%;
				--x: 10px;
			}
		`,
    filename: "styles.css",
    name: "Properties naturally sorted alphabetically (no custom order)",
  },
  {
    code: "",
    filename: "styles.css",
    name: "Empty block",
  },
  {
    code: `
			:root {
			}
		`,
    filename: "styles.css",
    name: "Empty block with braces",
  },
];

/** @type {import("eslint").RuleTester.InvalidTestCase[]} */
const invalid = [
  {
    code: `
			:root {
				--spacing-lg: 2rem;
				--color-primary: #007bff;
				--font-family: Arial;
				--transition-duration: 300ms;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "Properties in wrong order (default order)",
    output: `
			:root {
				--spacing-lg: 2rem;
				--font-family: Arial;
				--transition-duration: 300ms;
				--color-primary: #007bff;
			}
		`,
  },
  {
    code: `
			:root {
				--font-size: 16px;
				--font-family: Arial;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "Properties with same order pattern in wrong alphabetical order",
    output: `
			:root {
				--font-family: Arial;
				--font-size: 16px;
			}
		`,
  },
  {
    code: `
			:root {
				--color-primary: #007bff;
				--transition-duration: 300ms;
				--spacing-lg: 2rem;
				--font-family: Arial;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "All groups in completely wrong order",
    output: `
			:root {
				--spacing-lg: 2rem;
				--font-family: Arial;
				--transition-duration: 300ms;
				--color-primary: #007bff;
			}
		`,
  },
  {
    code: `
			:root {
				--margin-top: 10px;
				--font-family: Arial;
				--padding-left: 5px;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "Mix of specified and unspecified order patterns in wrong order",
    output: `
			:root {
				--font-family: Arial;
				--margin-top: 10px;
				--padding-left: 5px;
			}
		`,
  },
  {
    code: `
			:root {
				--z-index: 999;
				--width: 100%;
				--height: 100vh;
				--margin: 0;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "Unspecified order patterns in wrong alphabetical order",
    output: `
			:root {
				--height: 100vh;
				--margin: 0;
				--width: 100%;
				--z-index: 999;
			}
		`,
  },
  {
    code: `
			@theme {
				--color-primary: #007bff;
				--font-family: Arial;
			}

			@utility example {
				--color-primary: #007bff;
				--font-family: Arial;
			}
		`,
    errors: [
      { messageId: MESSAGE_IDS.unsortedCustomProperties },
      { messageId: MESSAGE_IDS.unsortedCustomProperties },
    ],
    filename: "styles.css",
    name: "Work in tailwind syntax",
    output: `
			@theme {
				--font-family: Arial;
				--color-primary: #007bff;
			}

			@utility example {
				--font-family: Arial;
				--color-primary: #007bff;
			}
		`,
  },
  // Custom order tests
  {
    code: `
			:root {
				--font-family: Arial;
				--color-primary: #007bff;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "Wrong order with custom order option",
    options: [{ order: ["^--color-", "^--font-"] }],
    output: `
			:root {
				--color-primary: #007bff;
				--font-family: Arial;
			}
		`,
  },
  {
    code: `
			:root {
				--spacing-lg: 2rem;
				--custom-primary: red;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "Custom order with unlisted patterns at end",
    options: [{ order: ["^--custom-", "^--spacing-"] }],
    output: `
			:root {
				--custom-primary: red;
				--spacing-lg: 2rem;
			}
		`,
  },
  {
    code: `
			:root {
				--color-fill-brand-hover: oklch(
					from var(--color-fill-brand) calc(l + 0.1) c h
				);
				--spacing-lg: 2rem;
				--color-fill-brand-active: oklch(
					from var(--color-fill-brand) calc(l + 0.15) c h
				);
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "Multi-line unsorted properties",
    output: `
			:root {
				--spacing-lg: 2rem;
				--color-fill-brand-active: oklch(
					from var(--color-fill-brand) calc(l + 0.15) c h
				);
				--color-fill-brand-hover: oklch(
					from var(--color-fill-brand) calc(l + 0.1) c h
				);
			}
		`,
  },
  // Empty line between groups tests
  {
    code: `
			:root {
				--spacing-lg: 2rem;
				--font-family: Arial;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.missingEmptyLineBetweenGroups }],
    filename: "styles.css",
    name: "Missing empty line between different order pattern groups",
    options: [{ emptyLineBetweenGroups: true }],
    output: `
			:root {
				--spacing-lg: 2rem;

				--font-family: Arial;
			}
		`,
  },
  {
    code: `
			:root {
				--spacing-lg: 2rem;
				--spacing-sm: 1rem;
				--font-family: Arial;
				--font-size: 16px;
				--color-primary: #007bff;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.missingEmptyLineBetweenGroups }],
    filename: "styles.css",
    name: "Properties already sorted but missing empty lines between groups",
    options: [{ emptyLineBetweenGroups: true }],
    output: `
			:root {
				--spacing-lg: 2rem;
				--spacing-sm: 1rem;

				--font-family: Arial;
				--font-size: 16px;

				--color-primary: #007bff;
			}
		`,
  },
  {
    code: `
			:root {
				--font-family: Arial;
				--spacing-lg: 2rem;
				--color-primary: #007bff;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "Wrong order with emptyLineBetweenGroups (should fix order first)",
    options: [{ emptyLineBetweenGroups: true }],
    output: `
			:root {
				--spacing-lg: 2rem;

				--font-family: Arial;

				--color-primary: #007bff;
			}
		`,
  },
  {
    code: `
			:root {
				--font-weight: bold;
				--font-family: Arial;
				--margin-top: 10px;
				--padding-left: 5px;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "Mixed specified and unspecified order patterns with emptyLineBetweenGroups",
    options: [{ emptyLineBetweenGroups: true }],
    output: `
			:root {
				--font-family: Arial;
				--font-weight: bold;

				--margin-top: 10px;
				--padding-left: 5px;
			}
		`,
  },
  {
    code: `
			:root {
				--color-primary: #fff;

				--spacing-sm-md: 0.6rem;


				--spacing-xs: 0.25rem;

				--spacing-sm: 0.5rem;



				--spacing-md: 0.75rem;

				--spacing-lg: 1rem;

				--spacing-xl: 1.5rem;

				--spacing-2xl: 2rem;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "Properties with same order pattern in wrong alphabetical order with pre-existing empty lines",
    options: [{ emptyLineBetweenGroups: true }],
    output: `
			:root {
				--spacing-2xl: 2rem;
				--spacing-lg: 1rem;
				--spacing-md: 0.75rem;
				--spacing-sm: 0.5rem;
				--spacing-sm-md: 0.6rem;
				--spacing-xl: 1.5rem;
				--spacing-xs: 0.25rem;

				--color-primary: #fff;
			}
		`,
  },
  // Nested blocks
  {
    code: `
			:root {
				--color-primary: #007bff;
				--font-family: Arial;

				.dark {
					--font-size: 14px;
					--spacing-lg: 2rem;
				}
			}
		`,
    errors: [
      { messageId: MESSAGE_IDS.unsortedCustomProperties },
      { messageId: MESSAGE_IDS.unsortedCustomProperties },
    ],
    filename: "styles.css",
    name: "Wrong order in nested blocks",
    output: `
			:root {
				--font-family: Arial;
				--color-primary: #007bff;

				.dark {
					--spacing-lg: 2rem;
					--font-size: 14px;
				}
			}
		`,
  },
  // Suffix-based order pattern tests
  {
    code: `
			:root {
				--primary-color: blue;
				--button-size: large;
				--secondary-color: red;
				--input-size: medium;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "Wrong order with suffix-based patterns (-size should come before -color)",
    options: [{ order: ["-size$", "-color$"] }],
    output: `
			:root {
				--button-size: large;
				--input-size: medium;
				--primary-color: blue;
				--secondary-color: red;
			}
		`,
  },
  {
    code: `
			:root {
				--sidebar-width: 250px;
				--border-radius: 4px;
				--card-width: 300px;
				--button-radius: 8px;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "Wrong order with multiple suffix patterns (*-radius before *-width)",
    options: [{ order: ["-radius$", "-width$"] }],
    output: `
			:root {
				--border-radius: 4px;
				--button-radius: 8px;
				--card-width: 300px;
				--sidebar-width: 250px;
			}
		`,
  },
  // Substring-based pattern tests
  {
    code: `
			:root {
				--light-primary: white;
				--dark-primary: black;
				--primary-font: Arial;
				--light-secondary: lightgray;
				--dark-secondary: gray;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "Wrong order with substring patterns (dark should come before light)",
    options: [{ order: ["dark", "light"] }],
    output: `
			:root {
				--dark-primary: black;
				--dark-secondary: gray;
				--light-primary: white;
				--light-secondary: lightgray;
				--primary-font: Arial;
			}
		`,
  },
  // Exact name priority tests
  {
    code: `
			:root {
				--font-family: Arial;
				--z-index: 999;
				--color-primary: blue;
				--opacity: 0.8;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "Wrong order with exact name priority (--z-index and --opacity should come first)",
    options: [{ order: ["^--z-index$", "^--opacity$"] }],
    output: `
			:root {
				--z-index: 999;
				--opacity: 0.8;
				--color-primary: blue;
				--font-family: Arial;
			}
		`,
  },
  // Mixed pattern types
  {
    code: `
			:root {
				--button-size: large;
				--z-index: 999;
				--dark-theme: enabled;
				--primary-color: blue;
				--opacity: 0.8;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.unsortedCustomProperties }],
    filename: "styles.css",
    name: "Wrong order with mixed pattern types (exact names, substrings, and suffixes)",
    options: [
      { order: ["^--z-index", "^--opacity", "dark", "-color$", "-size$"] },
    ],
    output: `
			:root {
				--z-index: 999;
				--opacity: 0.8;
				--dark-theme: enabled;
				--primary-color: blue;
				--button-size: large;
			}
		`,
  },
  // Pattern too long tests
  {
    code: `
			:root {
				--color-primary: #007bff;
				--font-family: Arial;
			}
		`,
    errors: [{ messageId: MESSAGE_IDS.patternTooLong }],
    filename: "styles.css",
    name: "Pattern longer than 100 characters should trigger pattern too long error",
    options: [
      {
        order: [
          "^--this-is-a-very-long-pattern-that-exceeds-one-hundred-characters-and-should-trigger-the-pattern-too-long-error-message-because-it-is-way-too-long-for-performance-reasons$",
        ],
      },
    ],
  },
];

tester.run("sort-custom-properties", rule, {
  invalid,
  valid,
});
