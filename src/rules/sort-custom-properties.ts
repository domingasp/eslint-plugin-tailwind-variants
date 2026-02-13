import { type TSESTree, ESLintUtils } from "@typescript-eslint/utils";
import type {
  ReportDescriptor,
  RuleContext,
  RuleFix,
  RuleFixer,
  SourceCode,
} from "@typescript-eslint/utils/ts-eslint";

interface CustomProperty {
  node: TSESTree.Node;
  orderIndex: number;
  property: string;
}

const createRule = ESLintUtils.RuleCreator((name) => name);

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
} as const;

export type MessageIds = (typeof MESSAGE_IDS)[keyof typeof MESSAGE_IDS];
export type Options = [
  {
    /**
     * Add empty line between different prefix groups
     * @default false
     */
    emptyLineBetweenGroups?: boolean;
    /**
     * Order of patterns (RegExp strings) for custom properties.
     * Properties matching the first pattern appear first.
     * @default [
     * 	"^--spacing-",
     * 	"^--size-",
     * 	"^--font-",
     * 	"^--weight-",
     * 	"^--leading-",
     * 	"^--tracking-",
     * 	"^--radius-",
     * 	"^--shadow-",
     * 	"^--animate-",
     * 	"^--transition-",
     * 	"^--color-",
     * ]
     */
    order?: string[];
  },
];

const MATCHES_NOTHING = /(?!)/;

export const rule = createRule<Options, MessageIds>({
  create: (context) => {
    const [options = {}] = context.options;
    const order = options.order ?? DEFAULT_ORDER;
    const emptyLineBetweenGroups = options.emptyLineBetweenGroups ?? false;
    const { sourceCode } = context;

    const compiledOrder = compileOrderPatterns(order, context);
    const getMatchingOrderIndex = createOrderIndexGetter(compiledOrder);
    const blockStack: CustomProperty[][] = [];

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
      [BLOCK_SELECTOR](): void {
        blockStack.push([]);
      },
    };
  },
  defaultOptions: [
    {
      emptyLineBetweenGroups: false,
      order: DEFAULT_ORDER,
    },
  ],
  meta: {
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
  name: "sort-custom-properties",
});

type NodeWithOffset = TSESTree.Node & {
  loc: TSESTree.SourceLocation & {
    end: TSESTree.Position & { offset: number };
    start: TSESTree.Position & { offset: number };
  };
};

interface FixerConfig {
  currentBlockProperties: CustomProperty[];
  sorted: CustomProperty[];
  emptyLineBetweenGroups: boolean;
  sourceCode: Readonly<SourceCode>;
}

/** Configuration object for block handling */
interface BlockHandlerConfig {
  blockStack: CustomProperty[][];
  emptyLineBetweenGroups: boolean;
  order: string[];
  sourceCode: Readonly<SourceCode>;
  context: RuleContext<MessageIds, Options>;
}

const isNodeWithOffset = (node: TSESTree.Node): node is NodeWithOffset =>
  node.loc !== null &&
  typeof (node.loc.start as NodeWithOffset["loc"]["start"]).offset ===
    "number" &&
  typeof (node.loc.end as NodeWithOffset["loc"]["end"]).offset === "number";

/**
 * Compile regular expression pattern with validation and error reporting.
 *
 * Reports errors for patterns that are too long or invalid, returning a
 * no-match fallback regex on failure.
 *
 * @param {string} pattern - Regular expression pattern to compile.
 * @param {RuleContext<MessageIds, Options>} context - ESLint rule context.
 *
 * @returns {RegExp} Compiled regex or fallback regex that matches nothing.
 */
const compilePattern = (
  pattern: string,
  context: RuleContext<MessageIds, Options>,
): RegExp => {
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

const compileOrderPatterns = (
  order: string[],
  context: RuleContext<MessageIds, Options>,
): RegExp[] => order.map((pattern) => compilePattern(pattern, context));

/**
 * Create a function that returns the order index of a property name based on
 * compiled regex patterns. Returns pattern array length if no match found.
 *
 * @param {RegExp[]} compiledOrder - Compiled regex patterns in priority order.
 *
 * @returns {function} Function that takes a property name and returns its order index.
 */
const createOrderIndexGetter =
  (compiledOrder: RegExp[]): ((propName: string) => number) =>
  (propName: string): number => {
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
 *
 * @param {CustomProperty[]} properties - Properties to check.
 *
 * @returns {boolean} True if properties are sorted.
 */
const checkIfSorted = (properties: CustomProperty[]): boolean => {
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
 *
 * @param {CustomProperty[]} properties - Properties to check.
 *
 * @returns {boolean} True if empty lines are missing between groups.
 */
const hasMissingGroupSpacing = (properties: CustomProperty[]): boolean => {
  // Minimum lines between groups to be considered as having empty lines
  const SPACING_THRESHOLD = 2;
  for (let i = 1; i < properties.length; i += 1) {
    const prev = properties[i - 1];
    const curr = properties[i];

    if (prev.orderIndex !== curr.orderIndex) {
      const linesBetween = curr.node.loc.start.line - prev.node.loc.end.line;
      if (linesBetween < SPACING_THRESHOLD) {
        // Needs empty lines
        return true;
      }
    }
  }
  return false;
};

const sortProperties = (properties: CustomProperty[]): CustomProperty[] =>
  [...properties].sort((a, b) => {
    if (a.orderIndex !== b.orderIndex) {
      return a.orderIndex - b.orderIndex;
    }

    return a.property.localeCompare(b.property);
  });

/**
 * Get full declaration text including leading whitespace and trailing semicolon.
 *
 * Extracts from start of line to end of node, appending semicolon if present.
 *
 * @param {NodeWithOffset} node - AST node to extract.
 * @param {SourceCode} sourceCode - ESLint source code object.
 *
 * @returns {string} Full declaration text with indentation and semicolon.
 */
const getFullDeclaration = (
  node: NodeWithOffset,
  sourceCode: Readonly<SourceCode>,
): string => {
  const lineStartIndex = sourceCode.getIndexFromLoc({
    column: 1,
    line: node.loc.start.line,
  });

  let endIndex = node.loc.end.offset;
  if (sourceCode.text[endIndex] === ";") {
    endIndex += 1;
  }

  return sourceCode.text.slice(lineStartIndex, endIndex);
};

/**
 * Calculate the end for a property declaration.
 *
 * Returns the start line of the next property if it exists, otherwise one line
 * past current property.
 *
 * @param {CustomProperty} prop - Current property.
 * @param {CustomProperty | undefined} nextProp - Next property, if exists.
 *
 * @returns {number} End line number for the property range.
 */
const calculateEndLine = (
  prop: CustomProperty,
  nextProp: CustomProperty | undefined,
): number => {
  if (typeof nextProp !== "undefined") {
    return nextProp.node.loc.start.line;
  }

  return prop.node.loc.end.line + 1;
};

/**
 * Build replacement text for a property with optional empty line separator.
 *
 * Adds blank line before property if it's in a different group than the
 * previous.
 *
 * @param {object} config - Replacement configuration.
 *
 * @returns {string} Replacement text with optional leading newline and trailing newline.
 */
const buildReplacement = (config: {
  sortedDeclaration: string;
  index: number;
  sorted: CustomProperty[];
  emptyLineBetweenGroups: boolean;
}): string => {
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
 *
 * Extracts the sorted property declaration and replaces the current property's
 * full line range, including proper group spacing.
 *
 * @param {object} options - Fix creation parameters.
 *
 * @returns {RuleFix} Fix that replaces current property with sorted version.
 */
const createSingleFix = (options: {
  prop: CustomProperty;
  index: number;
  config: FixerConfig;
  fixer: RuleFixer;
}): RuleFix => {
  const { sorted, currentBlockProperties, emptyLineBetweenGroups, sourceCode } =
    options.config;

  const sortedNode = sorted[options.index].node;
  if (!isNodeWithOffset(sortedNode)) {
    throw new Error("Node missing offset information");
  }

  const sortedDeclaration = getFullDeclaration(sortedNode, sourceCode);

  const currentLineStart = sourceCode.getIndexFromLoc({
    column: 1,
    line: options.prop.node.loc.start.line,
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
 * Create a fixer function that reorders all properties in a block.
 *
 * Returns null if any node is missing offset information, otherwise returns
 * fixes for all properties in the current block.
 *
 * @param {FixerConfig} config - Fixer configuration with sorted properties.
 *
 * @returns {function} Fixer function that generates fixes or null if unsafe.
 */
const createFixer =
  (config: FixerConfig): ((fixer: RuleFixer) => RuleFix[] | null) =>
  (fixer: RuleFixer): RuleFix[] | null => {
    const { sorted, currentBlockProperties } = config;

    const allNodesHaveOffsets = sorted.every((item) =>
      isNodeWithOffset(item.node),
    );
    if (!allNodesHaveOffsets) {
      // oxlint-disable-next-line unicorn/no-null
      return null;
    }

    const fixes = currentBlockProperties.map(
      (prop, index): RuleFix => createSingleFix({ config, fixer, index, prop }),
    );

    return fixes;
  };

/**
 * Check if block has enough properties to warrant sorting validation.
 *
 * Type guard that narrows undefined to CustomProperty array.
 *
 * @param {CustomProperty[] | undefined} currentBlockProperties - Properties to check.
 *
 * @returns {boolean} True if block has at least 2 properties to check.
 */
const shouldProcessBlock = (
  currentBlockProperties: CustomProperty[] | undefined,
): currentBlockProperties is CustomProperty[] => {
  const MIN_PROPERTIES_TO_CHECK = 2;
  return (
    typeof currentBlockProperties !== "undefined" &&
    currentBlockProperties.length >= MIN_PROPERTIES_TO_CHECK
  );
};

const checkEmptyLinesIfRequired = (
  emptyLineBetweenGroups: boolean,
  currentBlockProperties: CustomProperty[],
): boolean => {
  if (!emptyLineBetweenGroups) {
    return false;
  }

  return hasMissingGroupSpacing(currentBlockProperties);
};

/**
 * Process property block for violations and report if sorting or spacing issues
 * found.
 *
 * Checks sort order first, then group spacing if applicable, and reports with
 * autofix.
 *
 * @param {CustomProperty[]} currentBlockProperties - Properties in current block.
 * @param {BlockHandlerConfig} config - Block handler configuration.
 */
const processBlockViolations = (
  currentBlockProperties: CustomProperty[],
  config: BlockHandlerConfig,
): void => {
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
 *
 * @param {boolean} isSorted - Whether properties are correctly sorted.
 * @param {boolean} needsEmptyLines - Whether empty lines need to be added between groups.
 *
 * @returns {MessageIds | undefined} Message ID for the violation.
 */
const getViolationMessageId = (
  isSorted: boolean,
  needsEmptyLines: boolean,
): MessageIds | undefined => {
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
 *
 * @param {object} config - Report configuration.
 *
 * @returns {ReportDescriptor<MessageIds>} Report descriptor with fixer and message.
 */
const createReportDescriptor = (config: {
  currentBlockProperties: CustomProperty[];
  sorted: CustomProperty[];
  emptyLineBetweenGroups: boolean;
  sourceCode: Readonly<SourceCode>;
  messageId: MessageIds;
  order: string[];
}): ReportDescriptor<MessageIds> => ({
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
 * Create exit handler for property blocks.
 *
 * Pops block from stack and validates property ordering if block has sufficient
 * properties.
 *
 * @param {BlockHandlerConfig} config - Block handler configuration.
 *
 * @returns {function} Exit handler function for the AST node.
 */
const handleBlockExit = (config: BlockHandlerConfig) => (): void => {
  const currentBlockProperties = config.blockStack.pop();

  if (!shouldProcessBlock(currentBlockProperties)) {
    return;
  }

  processBlockViolations(currentBlockProperties, config);
};

/**
 * Create collector for CSS declaration nodes to track custom properties.
 *
 * Only processes properties starting with '--' and adds them to the current
 * block.
 *
 * @param {CustomProperty[][]} blockStack - Stack of property blocks being processed.
 * @param {function} getMatchingOrderIndex - Function to get order index for a property name.
 *
 * @returns {function} Declaration collector function for AST nodes.
 */
const collectDeclaration =
  (
    blockStack: CustomProperty[][],
    getMatchingOrderIndex: (propName: string) => number,
  ) =>
  (node: TSESTree.Node & { property: string }): void => {
    if (!node.property.startsWith("--")) {
      return;
    }

    const orderIndex = getMatchingOrderIndex(node.property);
    const currentBlock = blockStack.at(-1);

    if (!currentBlock) {
      return;
    }

    currentBlock.push({
      node,
      orderIndex,
      property: node.property,
    });
  };
