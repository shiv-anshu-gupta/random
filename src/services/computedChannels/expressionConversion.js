// File: src/services/computedChannels/expressionConversion.js
// Handles LaTeX to math.js expression conversion

/**
 * Convert LaTeX expression to math.js compatible format
 * Example: \sqrt{I_{A}^2+I_{B}^2+I_{C}^2} → sqrt(IA^2+IB^2+IC^2)
 * @param {string} latex - LaTeX expression from MathLive editor
 * @returns {string} math.js compatible expression
 */
export function convertLatexToMathJs(latex) {
  if (!latex) return "";

  let expr = latex.trim();

  // Convert subscripts: I_{A} → IA, I_{B} → IB, etc.
  expr = expr.replace(/([A-Za-z])_\{([A-Za-z0-9]+)\}/g, "$1$2");

  // Convert sqrt: \sqrt{x} → sqrt(x)
  expr = expr.replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)");

  // Convert fractions: \frac{a}{b} → (a)/(b)
  expr = expr.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");

  // Convert functions: \operatorname{func} → func
  expr = expr.replace(
    /\\operatorname\{RMS\}\s*\\left\(\s*([^)]+)\s*\\right\)/gi,
    "sqrt(mean(($1)^2))"
  );
  expr = expr.replace(
    /\\operatorname\{AVG\}\s*\\left\(\s*([^)]+)\s*\\right\)/gi,
    "mean($1)"
  );
  expr = expr.replace(/\\operatorname\{([^}]+)\}/g, "$1");

  // Convert operators
  expr = expr.replace(/\\cdot/g, "*");
  expr = expr.replace(/\\times/g, "*");

  // Convert absolute value: \left\lvert a \right\rvert → abs(a)
  expr = expr.replace(/\\left\\lvert\s*([^\\]*)\s*\\right\\rvert/g, "abs($1)");

  // Convert parentheses
  expr = expr.replace(/\\left\(/g, "(");
  expr = expr.replace(/\\right\)/g, ")");

  // Convert power: ^{n} → ^(n) for math.js compatibility
  expr = expr.replace(/\^\{([^}]+)\}/g, "^($1)");

  // Remove remaining LaTeX artifacts
  expr = expr.replace(/\\[a-zA-Z]+/g, ""); // Remove remaining commands
  expr = expr.replace(/[\{\}]/g, ""); // Remove braces

  return expr.trim();
}
