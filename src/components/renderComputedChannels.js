// src/components/renderComputedChannels.js
// Renders computed channels - one chart with all computed channels as series
// Stored in the main charts array alongside analog and digital charts

import { createChartOptions } from "./chartComponent.js";
import { createDragBar } from "./createDragBar.js";
import { getMaxYAxes } from "../utils/maxYAxesStore.js";
import { renderLatex } from "../utils/mathJaxLoader.js";
import {
  createTooltip,
  updateTooltip,
  hideTooltip,
} from "../components/Tooltip.js";
import {
  createChartContainer,
  initUPlotChart,
} from "../utils/chartDomUtils.js";
import verticalLinePlugin from "../plugins/verticalLinePlugin.js";
import { attachListenerWithCleanup } from "../utils/eventListenerManager.js";
import { addChart } from "../utils/chartMetadataStore.js";

/**
 * Format equation string for LaTeX display
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

  // Convert channel references to subscripts
  latex = latex.replace(/([ad])(\d+)/g, "$1_{$2}");

  // Replace constants
  latex = latex.replace(/\bpi\b/gi, "\\pi");

  return latex;
}

/**
 * Render computed channels - all in one group/chart with multiple series
 * Matches the pattern used for analog/digital channels
 * @param {Object} data - Parsed COMTRADE data with time array
 * @param {HTMLElement} chartsContainer - The container for charts
 * @param {Array} charts - Array to store chart instances
 * @param {Array} verticalLinesX - Array of vertical line X positions
 * @param {Object} channelState - Reactive state for channels
 */
export function renderComputedChannels(
  data,
  chartsContainer,
  charts,
  verticalLinesX,
  channelState
) {
  const renderStartTime = performance.now();
  console.log(
    `[renderComputedChannels] 🟪 Starting computed channels rendering...`
  );

  const computedChannels =
    data?.computedData && Array.isArray(data.computedData)
      ? data.computedData
      : [];

  if (computedChannels.length === 0) {
    console.log("[renderComputedChannels] ℹ️ No computed channels to render");
    return;
  }

  console.log(
    `[renderComputedChannels] 📊 Creating single group chart for ${computedChannels.length} computed channels...`
  );

  // Get time array
  let timeArray = data.time;
  if (!Array.isArray(data.time) || data.time.length === 0) {
    if (
      data.time?.data &&
      Array.isArray(data.time.data) &&
      data.time.data.length > 0
    ) {
      timeArray = data.time.data;
    } else if (
      data.timeArray &&
      Array.isArray(data.timeArray) &&
      data.timeArray.length > 0
    ) {
      timeArray = data.timeArray;
    } else {
      // Generate synthetic time array
      const firstChannelData = computedChannels[0]?.data || [];
      const sampleCount = firstChannelData.length || 62464;
      console.log(
        `[renderComputedChannels] ✅ Generating synthetic time array (${sampleCount} samples)`
      );
      timeArray = Array.from({ length: sampleCount }, (_, i) => i * 0.01);
    }
  }

  // Get global axis alignment
  const maxYAxes = getMaxYAxes() || 1;

  // All computed channels in one group
  const groupYLabels = computedChannels.map((ch) => ch.id || "Computed");
  const groupLineColors = computedChannels.map((ch) =>
    ch.color && typeof ch.color === "string" ? ch.color.trim() : ""
  );
  const groupYUnits = computedChannels.map((ch) => ch.unit || "");

  console.log(
    "[renderComputedChannels] 🎨 DEBUG - computedChannels:",
    computedChannels
  );
  console.log(
    "[renderComputedChannels] 🎨 DEBUG - groupLineColors:",
    groupLineColors
  );

  const candidateGroups = computedChannels
    .map((ch) => (ch && typeof ch.group === "string" ? ch.group.trim() : ""))
    .filter((g) => g !== "");
  if (
    (!candidateGroups || candidateGroups.length === 0) &&
    Array.isArray(channelState?.computed?.groups)
  ) {
    channelState.computed.groups.forEach((value) => {
      if (typeof value === "string" && value.trim()) {
        candidateGroups.push(value.trim());
      }
    });
  }
  const computedGroupId =
    candidateGroups.length > 0
      ? candidateGroups[candidateGroups.length - 1]
      : null;

  const metadata = addChart({
    chartType: "computed",
    name: "Computed Channels",
    expression: computedChannels
      .map((ch) => ch.expression || ch.mathJsExpression || ch.name)
      .filter(Boolean)
      .join(" | "),
    channels: computedChannels.map((ch) => ch.id),
    colors: groupLineColors.slice(),
    userGroupId: computedGroupId,
    sourceGroupId: computedGroupId,
  });

  console.log(
    `[renderComputedChannels] Creating ${metadata.userGroupId} → ${metadata.uPlotInstance}:`,
    metadata.expression
  );

  // Create single-group data array [timeArray, ch1Data, ch2Data, ...]
  const channelDataArrays = computedChannels.map((ch) => ch.data || []);
  const chartData = [timeArray, ...channelDataArrays];

  // Create drag bar for computed channels group
  const dragBar = createDragBar(
    {
      indices: Array.from({ length: computedChannels.length }, (_, i) => i),
      name: "Computed Channels",
    },
    {},
    channelState
  );

  // Create single chart container for all computed channels
  const { parentDiv, chartDiv } = createChartContainer(
    dragBar,
    "chart-container",
    groupYLabels,
    groupLineColors,
    "Computed Channels",
    metadata.userGroupId,
    "computed" // type
  );
  parentDiv.dataset.userGroupId = metadata.userGroupId;
  parentDiv.dataset.uPlotInstance = metadata.uPlotInstance;
  parentDiv.dataset.chartType = "computed";
  chartsContainer.appendChild(parentDiv);

  console.log(`[renderComputedChannels] 🏗️ Chart container created`);

  // Create chart options for all channels
  const opts = createChartOptions({
    title: "Computed Channels",
    yLabels: groupYLabels,
    lineColors: groupLineColors,
    verticalLinesX,
    xLabel: data.xLabel || "Time",
    xUnit: data.xUnit || "s",
    getCharts: () => charts,
    yUnits: groupYUnits,
    axesScales: [1, ...computedChannels.map(() => 1)],
    singleYAxis: false,
    maxYAxes: maxYAxes,
  });

  // Add vertical line plugin
  opts.plugins = opts.plugins || [];
  opts.plugins = opts.plugins.filter(
    (p) => !(p && p.id === "verticalLinePlugin")
  );
  opts.plugins.push(verticalLinePlugin(verticalLinesX, () => charts));

  // Create uPlot chart instance (will be pushed to charts array)
  const chartStartTime = performance.now();
  const chart = initUPlotChart(opts, chartData, chartDiv, charts);
  const chartTime = performance.now() - chartStartTime;

  console.log(
    `[renderComputedChannels] ⏱️ uPlot chart creation: ${chartTime.toFixed(
      2
    )}ms`
  );

  // Tag chart with metadata (matching analog/digital pattern)
  chart._computed = true;
  chart._computedIds = computedChannels.map((ch) => ch.id);
  chart._type = "computed";
  chart._metadata = metadata;
  chart._userGroupId = metadata.userGroupId;
  chart._uPlotInstance = metadata.uPlotInstance;
  chart._chartType = "computed";

  // Attach metadata for delta calculation scaling
  chart._axesScales = [1, ...computedChannels.map(() => 1)];
  chart._yUnits = groupYUnits || [];
  chart._seriesColors = groupLineColors || [];

  console.log(
    `[renderComputedChannels] ✅ Chart created with ${computedChannels.length} series`
  );

  // Create tooltip
  const tooltip = createTooltip();

  // Mouse move handler
  const mousemoveHandler = (e) => {
    const idx = chart.posToIdx(e.offsetX);
    if (idx >= 0 && idx < chart.data[0].length) {
      const time = chart.data[0][idx];
      const values = chart.data
        .slice(1)
        .map((series, i) => {
          const label = groupYLabels[i] || `Computed${i + 1}`;
          const stroke = groupLineColors[i];
          const val =
            series[idx] != null && series[idx].toFixed
              ? series[idx].toFixed(2)
              : String(series[idx]);
          return `<span style="color:${stroke}">${label}</span>: ${val}`;
        })
        .join("<br>");
      updateTooltip(
        e.pageX,
        e.pageY,
        `<b>t:</b> ${time.toFixed(2)}<br>${values}`
      );
    }
  };

  // Attach listeners with cleanup
  attachListenerWithCleanup(chart.over, "mousemove", mousemoveHandler, chart);
  attachListenerWithCleanup(chart.over, "mouseleave", hideTooltip, chart);

  // Click handler for vertical lines
  const clickHandler = (e) => {
    if (!chart.scales || !chart.scales.x) return;

    const xVal = chart.posToVal(e.offsetX, "x");
    const currentLines =
      verticalLinesX.asArray?.() || verticalLinesX.value || [];

    // Check if clicking near existing line
    const xRange = chart.scales.x.max - chart.scales.x.min;
    const tolerance = xRange * 0.02;
    const existingIdx = currentLines.findIndex(
      (line) => Math.abs(line - xVal) < tolerance
    );

    if (existingIdx >= 0) {
      // Remove line
      verticalLinesX.value = currentLines.filter((_, i) => i !== existingIdx);
    } else {
      // Add new line
      verticalLinesX.value = [...currentLines, xVal];

      // Auto-trigger delta calculation
      setTimeout(async () => {
        try {
          const { getPolarChart, getCfg, getData, deltaWindow } = await import(
            "../main.js"
          );
          const polarChart = getPolarChart();
          const cfgData = getCfg();
          const dataObj = getData();

          if (polarChart && cfgData && dataObj) {
            const timeIndex = dataObj.time
              ? dataObj.time.findIndex((t) => t >= xVal)
              : 0;
            polarChart.updatePhasorAtTimeIndex(
              cfgData,
              dataObj,
              Math.max(0, timeIndex)
            );
          }

          if (deltaWindow && verticalLinesX.value.length > 1) {
            deltaWindow.show();
          }
        } catch (e) {
          console.error(
            "[renderComputedChannels] Cannot update polar chart:",
            e.message
          );
        }

        // Redraw all charts
        charts.forEach((c) => {
          if (c && c.redraw) c.redraw();
        });
      }, 0);
    }
  };

  attachListenerWithCleanup(chart.over, "click", clickHandler, chart);

  // Add equation labels
  const labelDiv = parentDiv.querySelector(".chart-label");
  if (labelDiv) {
    labelDiv.innerHTML = ""; // Clear default labels

    // Add type label
    const typeSpan = document.createElement("span");
    typeSpan.textContent = "Computed Channels";
    typeSpan.style.cssText = `
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--accent-cyan);
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--border-color);
      width: 100%;
    `;
    labelDiv.appendChild(typeSpan);

    // Add channel labels with equations
    computedChannels.forEach((channel, idx) => {
      const channelContainer = document.createElement("div");
      channelContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        width: 100%;
        padding: 6px 4px;
        border: 1px solid #e0e0e0;
        border-radius: 3px;
        background: #f9f9f9;
      `;

      // Color dot + name
      const nameContainer = document.createElement("div");
      nameContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        width: 100%;
      `;

      const colorDot = document.createElement("span");
      colorDot.style.cssText = `
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: ${groupLineColors[idx % groupLineColors.length]};
        border: 1px solid var(--border-color);
      `;
      nameContainer.appendChild(colorDot);

      const nameSpan = document.createElement("span");
      nameSpan.textContent = channel.id;
      nameSpan.style.cssText = `
        font-size: 0.7rem;
        font-weight: 500;
        color: var(--text-secondary);
        text-align: center;
        word-break: break-word;
        line-height: 1.1;
      `;
      nameContainer.appendChild(nameSpan);
      channelContainer.appendChild(nameContainer);

      // LaTeX equation
      if (channel.equation) {
        const formulaMatch = channel.equation.match(/=\s*(.+)$/);
        const formulaOnly = formulaMatch
          ? formulaMatch[1].trim()
          : channel.equation;

        const eqDiv = document.createElement("div");
        eqDiv.style.cssText = `
          width: 100%;
          font-size: 10px;
          text-align: center;
          padding: 4px 2px;
          background: white;
          border-radius: 2px;
          border: 1px solid #ddd;
          overflow-x: auto;
          max-width: 280px;
        `;

        const latexEquation = formatEquationForLatex(formulaOnly);
        eqDiv.innerHTML = `$$${latexEquation}$$`;
        channelContainer.appendChild(eqDiv);
      }

      labelDiv.appendChild(channelContainer);
    });

    // Render LaTeX
    setTimeout(() => {
      renderLatex(labelDiv).catch((err) => {
        console.warn("[renderComputedChannels] ⚠️ MathJax render failed:", err);
      });
    }, 200);
  }

  const renderEndTime = performance.now();
  const totalTime = renderEndTime - renderStartTime;
  console.log(
    `[renderComputedChannels] ✅ Render complete: Single chart with ${
      computedChannels.length
    } series created in ${totalTime.toFixed(1)}ms`
  );
}
