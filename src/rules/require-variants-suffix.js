export const MESSAGE_IDS = {
  renameAllOccurrences: "renameAllOccurrences",
  requireVariantsSuffix: "requireVariantsSuffix",
};

/** @typedef {typeof MESSAGE_IDS[keyof typeof MESSAGE_IDS]} MessageIds */

/**
 * @typedef {object} RuleOptions
 * @property {string} [suffix="Variants"] Suffix required for variables assigned from tv().
 */

/** @type {import("eslint").Rule.RuleModule} */
export const rule = {
  create: (context) => {
    const [options = {}] = /** @type {[RuleOptions]} */ (context.options);
    const suffix = options.suffix ?? "Variants";

    return {
      VariableDeclarator(node) {
        detectTvVariableNameViolation(node, context, suffix);
      },
    };
  },
  meta: {
    defaultOptions: [
      {
        suffix: "Variants",
      },
    ],
    docs: {
      description:
        "Require variables assigned from tv() to end with a given suffix.",
    },
    hasSuggestions: true,
    messages: {
      renameAllOccurrences: "Rename all occurrences to {{newName}}",
      requireVariantsSuffix:
        "Variable assigned from tv() must end with '{{suffix}}'.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          suffix: {
            default: "Variants",
            description: "Suffix required for variables assigned from tv().",
            type: "string",
          },
        },
        type: "object",
      },
    ],
    type: "suggestion",
  },
};

/**
 * Check if expression is a tv() call.
 * @param {import("estree").Expression} init
 * @returns {boolean} `true` if expression is a tv() call.
 */
const isTvCallExpression = (init) =>
  init.type === "CallExpression" &&
  init.callee.type === "Identifier" &&
  init.callee.name === "tv";

/**
 * Collect all references to a variable declaration, excluding the initial
 * declaration.
 * @param {object} options
 * @param {import("eslint").SourceCode} options.sourceCode ESLint SourceCode instance.
 * @param {import("estree").VariableDeclarator} options.declaratorNode VariableDeclarator node of the declaration.
 * @param {import("estree").Identifier} options.id Identifier node of the variable being declared.
 * @returns {import("estree").Identifier[]} Array of identifier nodes referencing the variable.
 */
const collectReferences = (options) => {
  const declaredVariables = options.sourceCode.getDeclaredVariables(
    options.declaratorNode,
  );

  /** @type {import("estree").Identifier[]} */
  const references = [];

  for (const variable of declaredVariables) {
    if (variable.name === options.id.name) {
      for (const reference of variable.references) {
        if (
          reference.identifier !== options.id &&
          reference.identifier.type === "Identifier"
        ) {
          references.push(reference.identifier);
        }
      }
      break;
    }
  }

  return references;
};

/**
 * Detect tv() variable naming violations and report with suggestion to rename all occurrences.
 * @param {import("estree").VariableDeclarator} node
 * @param {import("eslint").Rule.RuleContext} context
 * @param {string} suffix Required variable name suffix.
 */
const detectTvVariableNameViolation = (node, context, suffix) => {
  const { init, id } = node;

  if (!init || !isTvCallExpression(init)) {
    return;
  }

  if (id?.type !== "Identifier" || id.name.endsWith(suffix)) {
    return;
  }

  const newName = `${id.name}${suffix}`;
  const references = collectReferences({
    declaratorNode: node,
    id,
    sourceCode: context.sourceCode,
  });

  context.report({
    data: { suffix },
    messageId: MESSAGE_IDS.requireVariantsSuffix,
    node,
    suggest: [
      {
        data: { newName },
        fix: (fixer) => {
          const fixes = [fixer.replaceText(id, newName)];

          for (const reference of references) {
            fixes.push(fixer.replaceText(reference, newName));
          }

          return fixes;
        },
        messageId: MESSAGE_IDS.renameAllOccurrences,
      },
    ],
  });
};
