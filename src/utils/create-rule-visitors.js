/**
 * Create and return rule visitors that work for both Vue single-file components
 * and regular script files.
 * @param {import("eslint").Rule.RuleContext} context
 * @param {import("eslint").Rule.RuleListener} templateVisitor
 * @param {import("eslint").Rule.RuleListener} scriptVisitor
 * @returns {import("eslint").Rule.RuleListener} Appropriate visitor based on the file type.
 */
export const createRuleVisitors = (context, templateVisitor, scriptVisitor) => {
  const fileName = context.filename;

  if (fileName.endsWith(".vue")) {
    const { sourceCode } = context;
    const { parserServices } = sourceCode;

    if (
      typeof parserServices !== "undefined" &&
      "defineTemplateBodyVisitor" in parserServices
    ) {
      return parserServices.defineTemplateBodyVisitor(
        templateVisitor,
        scriptVisitor,
      );
    }
  }

  return scriptVisitor;
};
