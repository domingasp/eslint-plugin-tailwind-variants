/**
 * @typedef {object} CustomProperty
 * @property {import("estree").Node} node AST node of the custom property declaration.
 * @property {number} orderIndex Index of the property based on matching order patterns.
 * @property {string} property Name of the custom property (e.g., '--color-primary').
 */

/** Selection support for custom tailwind blocks. */
const BLOCK_SELECTOR =
  "Rule > Block, AtRule[name='theme'] > Block, AtRule[name='utility'] > Block";

const DEFAULT_ORDER = [
  "^--spacing-",
  "^--size-",
  "^--font-",
  "^--weight-",
  "^--leading-",
  "^--tracking-",
  "^--radius-",
  "^--shadow-",
  "^--animate-",
  "^--transition-",
  "^--color-",
];

export const MESSAGE_IDS = {
  invalidPattern: "invalidPattern",
  missingEmptyLineBetweenGroups: "missingEmptyLineBetweenGroups",
  patternTooLong: "patternTooLong",
  unsortedCustomProperties: "unsortedCustomProperties",
};

/** @typedef {typeof MESSAGE_IDS[keyof typeof MESSAGE_IDS]} MessageIds */

/**
 * @typedef {object} RuleOptions
 * @property {boolean} [emptyLineBetweenGroups=false] Add empty line between different prefix groups.
 * @property {string[]} [order=DEFAULT_ORDER] Order of patterns (RegExp strings) for custom properties.
 */

/** @type {import("eslint").Rule.RuleModule} */
export const rule = {
  create: (context) => {
    const [options = {}] = /** @type {[RuleOptions]} */ context.options;
    const order = options.order ?? DEFAULT_ORDER;
    const emptyLineBetweenGroups = options.emptyLineBetweenGroups ?? false;
    const { sourceCode } = context;

    const compiledOrder = compileOrderPatterns(order, context);
    const getMatchingOrderIndex = createOrderIndexGetter(compiledOrder);

    /** @type {CustomProperty[][]} */
    const blockStack = [];

    return {
      [`${BLOCK_SELECTOR}:exit`]: handleBlockExit({
        blockStack,
        context,
        emptyLineBetweenGroups,
        order,
        sourceCode,
      }),
      [`:matches(${BLOCK_SELECTOR}) > Declaration`]: collectDeclaration(
        blockStack,
        getMatchingOrderIndex,
      ),
      [BLOCK_SELECTOR]() {
        blockStack.push([]);
      },
    };
  },

  meta: {
    defaultOptions: [
      {
        emptyLineBetweenGroups: false,
        order: DEFAULT_ORDER,
      },
    ],
    docs: {
      description:
        "Enforce sorting of CSS custom properties based on RegEx patterns within declaration blocks.",
    },
    fixable: "code",
    messages: {
      invalidPattern:
        "The pattern '{{pattern}}' is not a valid regular expression",
      missingEmptyLineBetweenGroups:
        "Expected empty line between different custom property prefix groups",
      patternTooLong:
        "The pattern '{{pattern}}' is too long and may cause performance issues",
      unsortedCustomProperties:
        "Custom properties should be sorted by the defined order: {{order}}",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          emptyLineBetweenGroups: {
            default: false,
            description: "Add empty line between different prefix groups",
            type: "boolean",
          },
          order: {
            default: DEFAULT_ORDER,
            description: "Array of RegEx patterns defining the sort order",
            items: {
              type: "string",
            },
            type: "array",
          },
        },
        type: "object",
      },
    ],
    type: "layout",
  },
};

/**
 * @typedef {object} FixerConfig
 * @property {CustomProperty[]} currentBlockProperties Properties in the current block being processed.
 * @property {CustomProperty[]} sorted Properties sorted according to the defined order.
 * @property {boolean} emptyLineBetweenGroups Whether empty lines are required between groups.
 * @property {import("eslint").SourceCode} sourceCode ESLint SourceCode instance for text extraction.
 */

/**
 * @typedef {object} BlockHandlerConfig
 * @property {CustomProperty[][]} blockStack Stack of property blocks being processed.
 * @property {boolean} emptyLineBetweenGroups Whether empty lines are required between groups.
 * @property {string[]} order Array of RegEx patterns defining the sort order.
 * @property {import("eslint").SourceCode} sourceCode ESLint SourceCode instance for text extraction.
 * @property {import("eslint").Rule.RuleContext} context ESLint rule context for reporting.
 */

/**
 * Get location information with offsets from a node.
 * @param {import("estree").Node} node
 * @returns {import("estree").SourceLocation} Location information with offsets.
 * @throws {Error} If node is missing location or offset information.
 */
const getNodeLoc = (node) => {
  if (
    node.loc === null ||
    typeof node.loc === "undefined" ||
    node.loc.start === null ||
    node.loc.end === null ||
    !("offset" in node.loc.start) ||
    !("offset" in node.loc.end) ||
    typeof node.loc.start.offset !== "number" ||
    typeof node.loc.end.offset !== "number"
  ) {
    throw new Error("Node missing location or offset information");
  }

  return node.loc;
};

/**
 * Compile regular expression pattern with validation and error reporting.
 * Reports errors for patterns that are too long or invalid, returning a
 * no-match fallback regex on failure.
 * @param {string} pattern
 * @param {import("eslint").Rule.RuleContext} context
 * @returns {RegExp} Compiled regex or fallback regex that matches nothing.
 */
const compilePattern = (pattern, context) => {
  const MATCHES_NOTHING = /(?!)/;
  const MAX_PATTERN_LENGTH = 100;
  if (pattern.length > MAX_PATTERN_LENGTH) {
    context.report({
      data: { pattern },
      loc: { column: 1, line: 1 },
      messageId: MESSAGE_IDS.patternTooLong,
    });

    return MATCHES_NOTHING;
  }

  try {
    return new RegExp(pattern);
  } catch {
    context.report({
      data: { pattern },
      loc: { column: 1, line: 1 },
      messageId: MESSAGE_IDS.invalidPattern,
    });
    // Fallback: escape special chars and treat as a prefix match
    return MATCHES_NOTHING;
  }
};

/**
 * Compile array of order patterns into regexes.
 * @param {string[]} order
 * @param {import("eslint").Rule.RuleContext} context
 * @returns {RegExp[]} Array of compiled regular expressions for order patterns.
 */
const compileOrderPatterns = (order, context) =>
  order.map((pattern) => compilePattern(pattern, context));

/**
 * Callback to get the order index of a property name based on compiled regex patterns.
 * @callback OrderIndexGetter
 * @param {string} propName Property name to check.
 * @returns {number} Order index based on matching pattern, or length of patterns if no match.
 */

/**
 * Create a function that returns the order index of a property name based on
 * compiled regex patterns. Returns pattern array length if no match found.
 * @param {RegExp[]} compiledOrder - Compiled regex patterns in priority order.
 * @returns {OrderIndexGetter} Function that takes a property name and returns its order index.
 */
const createOrderIndexGetter = (compiledOrder) => (propName) => {
  for (let i = 0; i < compiledOrder.length; i += 1) {
    if (compiledOrder[i].test(propName)) {
      return i;
    }
  }
  return compiledOrder.length;
};

/**
 * Check if properties are sorted by order index first, then alphabetically
 * within the same index.
 * @param {CustomProperty[]} properties
 * @returns {boolean} `true` if properties are sorted.
 */
const checkIfSorted = (properties) => {
  for (let i = 1; i < properties.length; i += 1) {
    const prev = properties[i - 1];
    const curr = properties[i];

    if (prev.orderIndex > curr.orderIndex) {
      return false;
    }

    if (prev.orderIndex === curr.orderIndex && prev.property > curr.property) {
      return false;
    }
  }
  return true;
};

/**
 * Check if empty lines are missing between property groups.
 * @param {CustomProperty[]} properties
 * @returns {boolean} `true` if empty lines are missing between groups.
 */
const hasMissingGroupSpacing = (properties) => {
  // Minimum lines between groups to be considered as having empty lines
  const SPACING_THRESHOLD = 2;
  for (let i = 1; i < properties.length; i += 1) {
    const prev = properties[i - 1];
    const curr = properties[i];

    if (
      prev.orderIndex !== curr.orderIndex &&
      typeof curr.node.loc?.start.line !== "undefined" &&
      typeof prev.node.loc?.end.line !== "undefined"
    ) {
      const linesBetween = curr.node.loc?.start.line - prev.node.loc?.end.line;
      if (linesBetween < SPACING_THRESHOLD) {
        // Needs empty lines
        return true;
      }
    }
  }
  return false;
};

/**
 * Sort properties by order index and then alphabetically within the same index.
 * @param {CustomProperty[]} properties
 * @returns {CustomProperty[]} Sorted properties.
 */
const sortProperties = (properties) =>
  [...properties].sort((a, b) => {
    if (a.orderIndex !== b.orderIndex) {
      return a.orderIndex - b.orderIndex;
    }

    return a.property.localeCompare(b.property);
  });

/**
 * Get full declaration text including leading whitespace and trailing semicolon.
 * Extracts from start of line to end of node, appending semicolon if present.
 * @param {import("estree").SourceLocation} loc
 * @param {import("eslint").SourceCode} sourceCode
 * @returns {string} Full declaration text with indentation and semicolon.
 */
const getFullDeclaration = (loc, sourceCode) => {
  const lineStartIndex = sourceCode.getIndexFromLoc({
    column: 1,
    line: loc.start.line,
  });

  if (!("offset" in loc.end) || typeof loc.end.offset !== "number") {
    throw new Error("Node missing offset information");
  }

  let endIndex = loc.end.offset;
  if (sourceCode.text[endIndex] === ";") {
    endIndex += 1;
  }

  return sourceCode.text.slice(lineStartIndex, endIndex);
};

/**
 * Calculate the end for a property declaration. Returns the start line of the
 * next property if it exists, otherwise one line past current property.
 * @param {CustomProperty} prop
 * @param {CustomProperty | undefined} nextProp
 * @returns {number} End line number for the property range.
 */
const calculateEndLine = (prop, nextProp) => {
  if (typeof prop.node.loc === "undefined" || prop.node.loc === null) {
    throw new Error("Node missing location information");
  }

  if (typeof nextProp !== "undefined") {
    if (
      typeof nextProp.node.loc === "undefined" ||
      nextProp.node.loc === null
    ) {
      throw new Error("Node missing location information");
    }
    return nextProp.node.loc.start.line;
  }

  return prop.node.loc.end.line + 1;
};

/**
 * Build replacement text for a property with optional empty line separator.
 * Adds blank line before property if it's in a different group than the
 * previous.
 * @param {object} config
 * @param {string} config.sortedDeclaration Full declaration text of the sorted property.
 * @param {number} config.index Index of the current property in the sorted array.
 * @param {CustomProperty[]} config.sorted Array of properties sorted by order and name.
 * @param {boolean} config.emptyLineBetweenGroups Whether to add empty line between groups.
 * @returns {string} Replacement text with optional leading newline and trailing newline.
 */
const buildReplacement = (config) => {
  let replacement = "";

  if (config.emptyLineBetweenGroups && config.index > 0) {
    const prevOrderIndex = config.sorted[config.index - 1].orderIndex;
    const currOrderIndex = config.sorted[config.index].orderIndex;

    if (prevOrderIndex !== currOrderIndex) {
      replacement = "\n";
    }
  }

  replacement += `${config.sortedDeclaration}\n`;
  return replacement;
};

/**
 * Create a single fix to replace a property with its sorted equivalent.
 * Extracts the sorted property declaration and replaces the current property's
 * full line range, including proper group spacing.
 * @param {object} options
 * @param {CustomProperty} options.prop Current property to be replaced.
 * @param {number} options.index Index of the current property in the sorted array.
 * @param {FixerConfig} options.config Fixer configuration with sorted properties and settings.
 * @param {import("eslint").Rule.RuleFixer} options.fixer ESLint fixer instance for creating text replacements.
 * @returns {import("eslint").Rule.Fix} Fix that replaces current property with sorted version.
 */
// oxlint-disable-next-line max-statements
const createSingleFix = (options) => {
  const { sorted, currentBlockProperties, emptyLineBetweenGroups, sourceCode } =
    options.config;

  const sortedNode = sorted[options.index].node;
  const propNode = options.prop.node;

  const sortedLoc = getNodeLoc(sortedNode);
  const propLoc = getNodeLoc(propNode);

  const sortedDeclaration = getFullDeclaration(sortedLoc, sourceCode);

  const currentLineStart = sourceCode.getIndexFromLoc({
    column: 1,
    line: propLoc.start.line,
  });

  const endLine = calculateEndLine(
    options.prop,
    currentBlockProperties[options.index + 1],
  );
  const currentLineEnd = sourceCode.getIndexFromLoc({
    column: 1,
    line: endLine,
  });

  const replacement = buildReplacement({
    emptyLineBetweenGroups,
    index: options.index,
    sorted,
    sortedDeclaration,
  });

  return options.fixer.replaceTextRange(
    [currentLineStart, currentLineEnd],
    replacement,
  );
};

/**
 * @callback FixerFunction
 * @param {import("eslint").Rule.RuleFixer} fixer ESLint rule fixer.
 * @returns {import("eslint").Rule.Fix[] | null} Array of fixes or null if unsafe.
 */

/**
 * Create a fixer function that reorders all properties in a block. Returns null
 * if any node is missing offset information, otherwise returns fixes for all
 * properties in the current block.
 * @param {FixerConfig} config - Fixer configuration with sorted properties.
 * @returns {FixerFunction} Fixer function that generates fixes or null if unsafe.
 */
const createFixer = (config) => (fixer) => {
  const { sorted, currentBlockProperties } = config;

  try {
    sorted.every((item) => getNodeLoc(item.node));
  } catch {
    return null;
  }

  const fixes = currentBlockProperties.map((prop, index) =>
    createSingleFix({ config, fixer, index, prop }),
  );

  return fixes;
};

/**
 * Check if empty lines are required between groups and if any are missing.
 * @param {boolean} emptyLineBetweenGroups
 * @param {CustomProperty[]} currentBlockProperties
 * @returns {boolean} `true` if empty lines are required between groups.
 */
const checkEmptyLinesIfRequired = (
  emptyLineBetweenGroups,
  currentBlockProperties,
) => {
  if (!emptyLineBetweenGroups) {
    return false;
  }

  return hasMissingGroupSpacing(currentBlockProperties);
};

/**
 * Process property block for violations and report if sorting or spacing issues
 * found. Checks sort order first, then group spacing if applicable, and reports with
 * autofix.
 * @param {CustomProperty[]} currentBlockProperties
 * @param {BlockHandlerConfig} config
 */
const processBlockViolations = (currentBlockProperties, config) => {
  const isSorted = checkIfSorted(currentBlockProperties);
  let needsEmptyLines = false;
  if (isSorted) {
    needsEmptyLines = checkEmptyLinesIfRequired(
      config.emptyLineBetweenGroups,
      currentBlockProperties,
    );
  }

  const messageId = getViolationMessageId(isSorted, needsEmptyLines);
  if (!messageId) {
    return;
  }

  const sorted = sortProperties(currentBlockProperties);
  const report = createReportDescriptor({
    currentBlockProperties,
    emptyLineBetweenGroups: config.emptyLineBetweenGroups,
    messageId,
    order: config.order,
    sorted,
    sourceCode: config.sourceCode,
  });

  config.context.report(report);
};

/**
 * Determine the appropriate violation message based on sorting and spacing
 * state.
 * @param {boolean} isSorted
 * @param {boolean} needsEmptyLines
 * @returns {MessageIds | undefined} Message ID for the violation.
 */
const getViolationMessageId = (isSorted, needsEmptyLines) => {
  if (isSorted && !needsEmptyLines) {
    return;
  }

  if (isSorted) {
    return MESSAGE_IDS.missingEmptyLineBetweenGroups;
  }

  return MESSAGE_IDS.unsortedCustomProperties;
};

/**
 * Create ESLint report descriptor with autofix for property ordering violations.
 * @param {object} config
 * @param {CustomProperty[]} config.currentBlockProperties Properties in the current block being processed.
 * @param {CustomProperty[]} config.sorted Properties sorted according to the defined order.
 * @param {boolean} config.emptyLineBetweenGroups Whether to add empty line between groups in the fix.
 * @param {import("eslint").SourceCode} config.sourceCode ESLint SourceCode instance for text extraction.
 * @param {MessageIds} config.messageId Message ID for the violation being reported.
 * @param {string[]} config.order Array of RegEx patterns defining the sort order, used for error message if unsorted.
 * @returns {import("eslint").Rule.ReportDescriptor} Report descriptor with fixer and message.
 */
const createReportDescriptor = (config) => ({
  fix: createFixer(config),
  messageId: config.messageId,
  node: config.currentBlockProperties[0].node,
  // oxlint-disable-next-line oxc/no-rest-spread-properties data is readonly
  ...(config.messageId === MESSAGE_IDS.unsortedCustomProperties && {
    data: {
      order: config.order.join(", "),
    },
  }),
});

/**
 * Create exit handler for property blocks. Pops block from stack and validates property ordering if block has sufficient
 * properties.
 * @param {BlockHandlerConfig} config - Block handler configuration.
 * @returns {() => void} Exit handler function for the AST node.
 */
const handleBlockExit = (config) => () => {
  const currentBlockProperties = config.blockStack.pop();

  const MIN_PROPERTIES_TO_CHECK = 2;
  if (
    typeof currentBlockProperties === "undefined" ||
    currentBlockProperties.length < MIN_PROPERTIES_TO_CHECK
  ) {
    return;
  }

  processBlockViolations(currentBlockProperties, config);
};

/**
 * @callback DeclarationCollector
 * @param {import("estree").Node} node AST node with property name.
 * @returns {void}
 */

/**
 * Create collector for CSS declaration nodes to track custom properties. Only
 * processes properties starting with '--' and adds them to the current block.
 * @param {CustomProperty[][]} blockStack - Stack of property blocks being processed.
 * @param {OrderIndexGetter} getMatchingOrderIndex - Function to get order index for a property name.
 * @returns {DeclarationCollector} Declaration collector function for AST nodes.
 */
const collectDeclaration = (blockStack, getMatchingOrderIndex) => (node) => {
  if (!("property" in node)) {
    return;
  }

  const property = String(node.property);
  if (!property.startsWith("--")) {
    return;
  }

  const orderIndex = getMatchingOrderIndex(property);
  const currentBlock = blockStack.at(-1);

  if (!currentBlock) {
    return;
  }

  currentBlock.push({
    node,
    orderIndex,
    property,
  });
};
