/**
 * ComputedChannelsLabel.js
 * Display computed channels with LaTeX equations as Y-axis labels overlay
 * Shows vertically inside the chart container, not as a separate sidebar
 */

/**
 * Create a vertical labels overlay for computed channels
 * Shows channel names and equations stacked vertically
 * @param {Object} data - COMTRADE data object containing computedData
 * @returns {HTMLElement} The labels overlay element
 */
export function createComputedChannelsLabels(data) {
  const computedChannels =
    data?.computedData && Array.isArray(data.computedData)
      ? data.computedData
      : [];

  if (computedChannels.length === 0) {
    return null;
  }

  // Create container
  const container = document.createElement("div");
  container.id = "computed-channels-labels";
  container.style.cssText = `
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    background: transparent;
    pointer-events: none;
  `;

  // Create label for each channel
  computedChannels.forEach((channel) => {
    const label = document.createElement("div");
    label.style.cssText = `
      background: white;
      border-left: 4px solid ${channel.color || "#999"};
      border-radius: 3px;
      padding: 6px 8px;
      font-size: 11px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      pointer-events: auto;
    `;

    // Channel name
    const nameDiv = document.createElement("div");
    nameDiv.style.cssText = `
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    `;

    const colorDot = document.createElement("span");
    colorDot.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${channel.color || "#999"};
      flex-shrink: 0;
    `;
    nameDiv.appendChild(colorDot);

    const nameSpan = document.createElement("span");
    nameSpan.textContent = channel.name || channel.id;
    nameDiv.appendChild(nameSpan);

    label.appendChild(nameDiv);

    // Equation in LaTeX form
    if (channel.equation) {
      const eqDiv = document.createElement("div");
      eqDiv.style.cssText = `
        background: #f9f9f9;
        border-radius: 2px;
        padding: 4px 6px;
        border: 1px solid #e0e0e0;
        font-size: 10px;
        overflow-x: auto;
        max-width: 280px;
        text-align: center;
      `;

      // Extract just the formula part (after the '=' sign) using regex for cleaner display
      const formulaMatch = channel.equation.match(/=\s*(.+)$/);
      const formulaOnly = formulaMatch
        ? formulaMatch[1].trim()
        : channel.equation;

      // Format equation for LaTeX display
      const latexEquation = formatEquationForLatex(formulaOnly);
      eqDiv.innerHTML = `$$${latexEquation}$$`;

      label.appendChild(eqDiv);
    }

    container.appendChild(label);
  });

  // Trigger MathJax rendering
  setTimeout(() => {
    if (window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([container]).catch(() => {});
    }
  }, 100);

  return container;
}

/**
 * Format equation string for LaTeX display
 * Converts math.js notation to LaTeX notation
 * @param {string} equation - Math.js format equation
 * @returns {string} LaTeX formatted equation
 */
function formatEquationForLatex(equation) {
  if (!equation) return "";

  let latex = equation;

  // Handle sqrt(expr) -> \sqrt{expr}
  while (latex.includes("sqrt(")) {
    let startIdx = latex.indexOf("sqrt(");
    let openCount = 1;
    let endIdx = startIdx + 5;

    while (endIdx < latex.length && openCount > 0) {
      if (latex[endIdx] === "(") openCount++;
      else if (latex[endIdx] === ")") openCount--;
      endIdx++;
    }

    const inner = latex.substring(startIdx + 5, endIdx - 1);
    latex =
      latex.substring(0, startIdx) +
      "\\sqrt{" +
      inner +
      "}" +
      latex.substring(endIdx);
  }

  // Replace other functions
  latex = latex.replace(/\babs\(/g, "\\left|");
  latex = latex.replace(/\bsin\(/g, "\\sin(");
  latex = latex.replace(/\bcos\(/g, "\\cos(");
  latex = latex.replace(/\btan\(/g, "\\tan(");
  latex = latex.replace(/\blog\(/g, "\\log(");
  latex = latex.replace(/\bln\(/g, "\\ln(");
  latex = latex.replace(/\blog10\(/g, "\\log_{10}(");

  // Convert channel references to subscripts
  latex = latex.replace(/([ad])(\d+)/g, "$1_{$2}");

  // Replace constants
  latex = latex.replace(/\bpi\b/gi, "\\pi");

  // Normalize operators
  latex = latex.replace(/\s\*\s/g, " \\times ");
  latex = latex.replace(/\s\/\s/g, " \\div ");

  return latex;
}
