export const MESSAGE_IDS = {
  renameAllOccurrences: "renameAllOccurrences",
  requireVariantsCallStylesName: "requireVariantsCallStylesName",
};

/** @typedef {typeof MESSAGE_IDS[keyof typeof MESSAGE_IDS]} MessageIds */

/**
 * @typedef {Object} RuleOptions
 * @property {string} [name="styles"] Name required for variables assigned from tv().
 */

/** @type {import("eslint").Rule.RuleModule} */
export const rule = {
  create: (context) => {
    const [options = {}] = /** @type {[RuleOptions]} */ context.options;
    const requiredName = options.name ?? "styles";

    // Tracks by name, not scope—shadowed identifiers may cause false positives
    /** @type {Set<string>} */
    const variantFunctions = new Set();

    /**
     * Check if expression is a tv() call and track the variable name if so.
     * @param {import("estree").CallExpression} init
     * @param {import("estree").Identifier} id
     * @returns {boolean} `true` if expression is a tv() call and variable name is tracked.
     */
    const trackVariantFunction = (init, id) => {
      if (init.callee.type === "Identifier" && init.callee.name === "tv") {
        variantFunctions.add(id.name);
        return true;
      }
      return false;
    };

    return {
      VariableDeclarator(node) {
        const { id, init } = node;

        if (
          !init ||
          init.type !== "CallExpression" ||
          init.callee.type !== "Identifier" ||
          id.type !== "Identifier"
        ) {
          return;
        }

        if (trackVariantFunction(init, id)) {
          return;
        }

        if (variantFunctions.has(init.callee.name)) {
          detectVariantVariableNameViolation({
            context,
            declaratorNode: node,
            id,
            requiredName,
          });
        }
      },
    };
  },

  meta: {
    defaultOptions: [
      {
        name: "styles",
      },
    ],
    docs: {
      description:
        "Require variables assigned from calling a function returned by tv() to be named {{name}}.",
    },
    hasSuggestions: true,
    messages: {
      renameAllOccurrences: "Rename all occurrences to {{name}}",
      requireVariantsCallStylesName:
        "Require variables assigned from calling a function returned by tv() to be named {{name}}.",
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          name: {
            default: "styles",
            description: "Name required for variables assigned from tv().",
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
 * Report incorrect variable name with autofix suggestion to rename all
 * occurrences.
 * @param {object} options
 * @param {import("eslint").Rule.RuleContext} options.context
 * @param {import("estree").Identifier} options.id Identifier node of the variable declaration.
 * @param {import("estree").VariableDeclarator} options.declaratorNode
 * @param {string} options.requiredName Required variable name.
 */
const reportIncorrectName = (options) => {
  const { sourceCode } = options.context;
  const references = collectReferences({
    declaratorNode: options.declaratorNode,
    id: options.id,
    sourceCode,
  });

  options.context.report({
    data: {
      name: options.requiredName,
    },
    messageId: MESSAGE_IDS.requireVariantsCallStylesName,
    node: options.id,
    suggest: [
      {
        data: {
          name: options.requiredName,
        },
        fix: (fixer) => {
          const fixes = [fixer.replaceText(options.id, options.requiredName)];

          for (const reference of references) {
            fixes.push(fixer.replaceText(reference, options.requiredName));
          }

          return fixes;
        },
        messageId: MESSAGE_IDS.renameAllOccurrences,
      },
    ],
  });
};

/**
 * Detect variant variable name violations and report if found.
 * @param {object} options
 * @param {import("eslint").Rule.RuleContext} options.context
 * @param {import("estree").Identifier} options.id Identifier node of the variable declaration.
 * @param {import("estree").VariableDeclarator} options.declaratorNode
 * @param {string} options.requiredName Required variable name.
 */
const detectVariantVariableNameViolation = (options) => {
  const variableName = options.id.name;

  if (variableName !== options.requiredName) {
    reportIncorrectName({
      context: options.context,
      declaratorNode: options.declaratorNode,
      id: options.id,
      requiredName: options.requiredName,
    });
  }
};
