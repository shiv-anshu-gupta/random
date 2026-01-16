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

  // ✅ FIX: Check if a computed chart already exists and remove the old one
  // This prevents multiple computed charts from being created when new channels are added at runtime
  let existingComputedChartIndex = -1;
  for (let i = 0; i < charts.length; i++) {
    if (charts[i] && (charts[i]._type === "computed" || charts[i]._computed === true)) {
      existingComputedChartIndex = i;
      console.log(`[renderComputedChannels] 🔄 Found existing computed chart at index ${i}, will replace it`);
      break;
    }
  }

  // Remove the old computed chart container from DOM if it exists
  if (existingComputedChartIndex >= 0) {
    const oldChart = charts[existingComputedChartIndex];
    if (oldChart && typeof oldChart.destroy === "function") {
      try {
        oldChart.destroy();
        console.log(`[renderComputedChannels] ✅ Destroyed old computed chart`);
      } catch (e) {
        console.warn(`[renderComputedChannels] ⚠️ Error destroying old chart:`, e);
      }
    }

    // Remove from charts array
    charts.splice(existingComputedChartIndex, 1);
    console.log(`[renderComputedChannels] ✅ Removed old computed chart from charts array`);

    // Remove the old DOM container
    const oldContainers = chartsContainer.querySelectorAll('[data-chartType="computed"]');
    oldContainers.forEach((container) => {
      try {
        container.remove();
        console.log(`[renderComputedChannels] ✅ Removed old computed chart container from DOM`);
      } catch (e) {
        console.warn(`[renderComputedChannels] ⚠️ Error removing DOM container:`, e);
      }
    });
  }

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

  // ✅ CRITICAL CHANGE: Group computed channels by their assigned group ID
  const computedGroups = Array.isArray(channelState?.computed?.groups) && channelState.computed.groups.length === computedChannels.length
    ? channelState.computed.groups
    : computedChannels.map((ch) => ch.group || 'G0');
  
  const computedGroupsMap = new Map();
  
  // Build group -> indices mapping
  computedChannels.forEach((ch, idx) => {
    const groupIdRaw = computedGroups[idx];
    const groupId = typeof groupIdRaw === 'string' && /^G\d+$/.test(groupIdRaw.trim())
      ? groupIdRaw.trim()
      : 'G0';
    
    if (!computedGroupsMap.has(groupId)) {
      computedGroupsMap.set(groupId, []);
    }
    computedGroupsMap.get(groupId).push(idx);
  });
  
  console.log(`[renderComputedChannels] 🧩 Grouped computed channels:`, Array.from(computedGroupsMap.entries()));
  
  // Get global axis alignment
  const maxYAxes = getMaxYAxes() || 1;
  
  // ✅ FOR EACH GROUP: Create a separate chart
  computedGroupsMap.forEach((groupIndices, groupId) => {
    console.log(`[renderComputedChannels] 🎯 Rendering computed group ${groupId} with indices:`, groupIndices);
    
    const groupComputedChannels = groupIndices.map((i) => computedChannels[i]);
    const groupComputedData = groupIndices.map((i) => computedChannels[i].data || []);
    const groupYLabels = groupComputedChannels.map((ch) => ch.id || 'Computed');
    const groupLineColors = groupComputedChannels.map((ch) =>
      ch.color && typeof ch.color === 'string' ? ch.color.trim() : ''
    );
    const groupYUnits = groupComputedChannels.map((ch) => ch.unit || '');
    
    const dragBar = createDragBar(
      {
        indices: Array.from({ length: groupComputedChannels.length }, (_, i) => i),
        name: `Computed ${groupId}`,
      },
      {},
      channelState
    );
    
    const metadata = addChart({
      chartType: 'computed',
      name: `Computed ${groupId}`,
      expression: groupComputedChannels
        .map((ch) => ch.expression || ch.mathJsExpression || ch.name)
        .filter(Boolean)
        .join(' | '),
      channels: groupComputedChannels.map((ch) => ch.id),
      colors: groupLineColors.slice(),
      userGroupId: groupId,
      sourceGroupId: groupId,
    });
    
    // Create single-group data array [timeArray, ch1Data, ch2Data, ...]
    const channelDataArrays = groupComputedData;
    const chartData = [timeArray, ...channelDataArrays];
    
    const { parentDiv, chartDiv } = createChartContainer(
      dragBar,
      'chart-container',
      groupYLabels,
      groupLineColors,
      `Computed ${groupId}`,
      metadata.userGroupId,
      'computed'
    );
    parentDiv.dataset.userGroupId = metadata.userGroupId;
    parentDiv.dataset.uPlotInstance = metadata.uPlotInstance;
    parentDiv.dataset.chartType = 'computed';
    chartsContainer.appendChild(parentDiv);
    
    const opts = createChartOptions({
      title: `Computed ${groupId}`,
      yLabels: groupYLabels,
      lineColors: groupLineColors,
      verticalLinesX,
      xLabel: data.xLabel || 'Time',
      xUnit: data.xUnit || 's',
      getCharts: () => charts,
      yUnits: groupYUnits,
      axesScales: [1, ...groupComputedChannels.map(() => 1)],
      singleYAxis: false,
      maxYAxes: maxYAxes,
    });
    
    opts.plugins = opts.plugins || [];
    opts.plugins = opts.plugins.filter((p) => !(p && p.id === 'verticalLinePlugin'));
    opts.plugins.push(verticalLinePlugin(verticalLinesX, () => charts));
    
    const chart = initUPlotChart(opts, chartData, chartDiv, charts);
    
    chart._computed = true;
    chart._computedIds = groupComputedChannels.map((ch) => ch.id);
    chart._type = 'computed';
    chart._metadata = metadata;
    chart._userGroupId = groupId;
    chart._uPlotInstance = metadata.uPlotInstance;
    chart._chartType = 'computed';
    chart._axesScales = [1, ...groupComputedChannels.map(() => 1)];
    chart._yUnits = groupYUnits || [];
    
    charts.push(chart);
    
    console.log(`[renderComputedChannels] ✅ Created computed chart for groupId: ${groupId}, metadata:`, metadata);
  });
  
  console.log(`[renderComputedChannels] ⏱️ All computed groups rendered`);
  
  const totalTime = performance.now() - renderStartTime;
  console.log(
    `[renderComputedChannels] ⏱️ Total computed rendering time: ${totalTime.toFixed(2)}ms`
  );
}
