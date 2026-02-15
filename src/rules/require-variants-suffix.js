export const MESSAGE_IDS = {
  requireVariantsSuffix: "requireVariantsSuffix",
};

/** @typedef {typeof MESSAGE_IDS[keyof typeof MESSAGE_IDS]} MessageIds */

/**
 * @typedef {Object} RuleOptions
 * @property {string} [suffix="Variants"] Suffix required for variables assigned from tv().
 */

/** @type {import("eslint").Rule.RuleModule} */
export const rule = {
  create: (context) => {
    const [options = {}] = /** @type {[RuleOptions]} */ context.options;
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
        "Require variables assigned from tv() to end with {{suffix}}.",
    },
    fixable: "code",
    messages: {
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
 *
 * @param {import("estree").Expression} init Initializer node to check.
 * @returns {boolean} `true` if expression is a tv() call.
 */
const isTvCallExpression = (init) =>
  init.type === "CallExpression" &&
  init.callee.type === "Identifier" &&
  init.callee.name === "tv";

/**
 * Detect tv() variable naming violations and report with autofix.
 *
 * @param {import("estree").VariableDeclarator} node VariableDeclarator node to check.
 * @param {import("eslint").Rule.RuleContext} context Rule context.
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

  context.report({
    data: { suffix },
    fix: (fixer) => fixer.insertTextAfter(id, suffix),
    messageId: MESSAGE_IDS.requireVariantsSuffix,
    node,
  });
};
