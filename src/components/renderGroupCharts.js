/**
 * renderGroupCharts.js
 * 
 * GROUP-CENTRIC RENDERING: One merged uPlot per group with all channel types
 * 
 * This is the "merged" approach where:
 * - For each groupId (G0, G1, ...):
 *   - Collect ALL channels (analog + digital + computed) assigned to that group
 *   - Create ONE uPlot instance with multiple Y-axes
 *   - Render analog as lines, digital as filled rectangles, computed as lines
 *   - Register ONE chart in metadata store (not per-type, but per-group)
 * 
 * Benefits over type-centric approach:
 * ✓ When user assigns digital channel to analog's group → they appear in SAME chart
 * ✓ Cleaner visual organization: one group = one canvas
 * ✓ Simpler state management: one chart per group, not per (type, group) pair
 * ✓ Better for cross-type analysis (compare analog with digital/computed together)
 */

import { createChartOptions } from "./chartComponent.js";
import { createDragBar } from "./createDragBar.js";
import { createCustomElement } from "../utils/helpers.js";
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
import { createDigitalFillPlugin } from "../plugins/digitalFillPlugin.js";
import { calculateAxisCountForGroup } from "../utils/axisCalculator.js";
import { getMaxYAxes } from "../utils/maxYAxesStore.js";
import { attachListenerWithCleanup } from "../utils/eventListenerManager.js";
import { addChart } from "../utils/chartMetadataStore.js";

/**
 * Main entry point for group-centric rendering.
 * 
 * @param {Object} cfg - COMTRADE config with analogChannels, digitalChannels, computedChannels
 * @param {Object} data - Parsed data with time, analogData, digitalData, computedData
 * @param {HTMLElement} chartsContainer - Container for all chart divs
 * @param {Array} charts - Array to populate with chart instances
 * @param {Array} verticalLinesX - Vertical line positions
 * @param {Object} channelState - {analog: {groups: []}, digital: {groups: []}, computed: {groups: []}}
 */
export function renderGroupCharts(
  cfg,
  data,
  chartsContainer,
  charts,
  verticalLinesX,
  channelState
) {
  const renderStartTime = performance.now();

  console.log("[renderGroupCharts] 🎯 Starting GROUP-CENTRIC rendering...");

  // Validate inputs
  if (!cfg || !data || !chartsContainer) {
    console.error("[renderGroupCharts] Missing required parameters");
    return;
  }

  // ============================================================================
  // STEP 1: Build maps of channels by group (cross-type)
  // ============================================================================

  const analogGroups = channelState?.analog?.groups || [];
  const digitalGroups = channelState?.digital?.groups || [];
  const computedGroups = channelState?.computed?.groups || [];

  // Map: groupId -> {analog: [indices], digital: [indices], computed: [indices]}
  const groupsMap = new Map();

  // Add analog channels
  if (cfg.analogChannels && cfg.analogChannels.length > 0) {
    cfg.analogChannels.forEach((ch, idx) => {
      const groupId = analogGroups[idx] || "G0";
      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, { analog: [], digital: [], computed: [] });
      }
      groupsMap.get(groupId).analog.push(idx);
    });
  }

  // Add digital channels
  if (cfg.digitalChannels && cfg.digitalChannels.length > 0) {
    cfg.digitalChannels.forEach((ch, idx) => {
      const groupId = digitalGroups[idx] || "G0";
      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, { analog: [], digital: [], computed: [] });
      }
      groupsMap.get(groupId).digital.push(idx);
    });
  }

  // Add computed channels
  if (data.computedData && data.computedData.length > 0) {
    data.computedData.forEach((ch, idx) => {
      const groupId = computedGroups[idx] || "G0";
      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, { analog: [], digital: [], computed: [] });
      }
      groupsMap.get(groupId).computed.push(idx);
    });
  }

  console.log(
    "[renderGroupCharts] 📋 Built groups map:",
    Array.from(groupsMap.entries()).map(([gid, types]) => ({
      groupId: gid,
      analog: types.analog.length,
      digital: types.digital.length,
      computed: types.computed.length,
    }))
  );

  // ============================================================================
  // STEP 2: For each group, create one merged chart
  // ============================================================================

  groupsMap.forEach((channelIndices, groupId) => {
    const { analog: analogIndices, digital: digitalIndices, computed: computedIndices } = channelIndices;

    // Skip empty groups
    if (
      analogIndices.length === 0 &&
      digitalIndices.length === 0 &&
      computedIndices.length === 0
    ) {
      console.log(`[renderGroupCharts] ⚠️ Skipping empty group: ${groupId}`);
      return;
    }

    console.log(
      `[renderGroupCharts] 🔨 Building group ${groupId}:`,
      `${analogIndices.length} analog, ${digitalIndices.length} digital, ${computedIndices.length} computed`
    );

    // Create the merged chart for this group
    createMergedGroupChart(
      groupId,
      {
        analog: analogIndices,
        digital: digitalIndices,
        computed: computedIndices,
      },
      cfg,
      data,
      chartsContainer,
      charts,
      verticalLinesX,
      channelState
    );
  });

  const renderEndTime = performance.now();
  const totalTime = renderEndTime - renderStartTime;

  console.log(
    `[renderGroupCharts] ✅ GROUP-CENTRIC rendering complete: ${charts.length} charts in ${totalTime.toFixed(1)}ms`
  );
}

/**
 * Create a single merged chart for a group containing all its channels.
 * 
 * @param {string} groupId - Group identifier (e.g., "G0", "G1")
 * @param {Object} channelIndices - {analog: [], digital: [], computed: []}
 * @param {Object} cfg - COMTRADE config
 * @param {Object} data - Parsed data
 * @param {HTMLElement} chartsContainer - Container element
 * @param {Array} charts - Chart instances array
 * @param {Array} verticalLinesX - Vertical line positions
 * @param {Object} channelState - Channel state for groups
 */
function createMergedGroupChart(
  groupId,
  channelIndices,
  cfg,
  data,
  chartsContainer,
  charts,
  verticalLinesX,
  channelState
) {
  try {
    // ========================================================================
    // Step 2a: Collect channel information
    // ========================================================================

    const analogChannels = channelIndices.analog.map((idx) => ({
      ...cfg.analogChannels[idx],
      globalIndex: idx,
      type: "analog",
    }));

    const digitalChannels = channelIndices.digital.map((idx) => ({
      ...cfg.digitalChannels[idx],
      globalIndex: idx,
      type: "digital",
    }));

    const computedChannels = channelIndices.computed.map((idx) => ({
      ...data.computedData[idx],
      globalIndex: idx,
      type: "computed",
    }));

    // ========================================================================
    // Step 2b: Prepare Y-axis labels and colors
    // ========================================================================

    // Build arrays in order: analog (if any) -> digital (if any) -> computed (if any)
    const allLabels = [];
    const allColors = [];
    const typeMap = []; // Track which type each series belongs to

    // Analog
    if (analogChannels.length > 0) {
      analogChannels.forEach((ch) => {
        allLabels.push(ch.name || `Analog ${ch.globalIndex}`);
        allColors.push(ch.displayedColor || "#000000");
        typeMap.push("analog");
      });
    }

    // Digital
    if (digitalChannels.length > 0) {
      digitalChannels.forEach((ch) => {
        allLabels.push(ch.name || `Digital ${ch.globalIndex}`);
        allColors.push(ch.displayedColor || "#888888");
        typeMap.push("digital");
      });
    }

    // Computed
    if (computedChannels.length > 0) {
      computedChannels.forEach((ch) => {
        allLabels.push(ch.name || ch.id || `Computed ${ch.globalIndex}`);
        allColors.push(ch.displayedColor || "#0066FF");
        typeMap.push("computed");
      });
    }

    console.log(
      `[renderGroupCharts] 📐 Group ${groupId} series setup:`,
      { labels: allLabels.length, colors: allColors.length, types: typeMap.length }
    );

    // ========================================================================
    // Step 2c: Prepare data arrays (time + all series)
    // ========================================================================

    const chartData = [data.time]; // Index 0: time axis

    // Add analog data
    analogChannels.forEach((ch) => {
      chartData.push(data.analogData[ch.globalIndex]);
    });

    // Add digital data
    digitalChannels.forEach((ch) => {
      chartData.push(data.digitalData[ch.globalIndex]);
    });

    // Add computed data
    computedChannels.forEach((ch) => {
      chartData.push(data.computedData[ch.globalIndex]);
    });

    console.log(
      `[renderGroupCharts] 📊 Group ${groupId} data arrays:`,
      { total: chartData.length, expected: 1 + allLabels.length }
    );

    // ========================================================================
    // Step 2d: Build units and scales arrays
    // ========================================================================

    const groupYUnits = [];
    const groupAxesScales = [data?.xScale || 1]; // Index 0: x-axis scale

    // Collect units and scales from all channel types
    analogChannels.forEach((ch) => {
      groupYUnits.push(ch.unit || "");
      groupAxesScales.push(ch.scale || 1);
    });

    digitalChannels.forEach((ch) => {
      groupYUnits.push(ch.unit || "");
      groupAxesScales.push(1); // Digital channels typically have unit scale
    });

    computedChannels.forEach((ch) => {
      groupYUnits.push(ch.unit || "");
      groupAxesScales.push(ch.scale || 1);
    });

    console.log(
      `[renderGroupCharts] 📏 Group ${groupId} units/scales:`,
      { yUnits: groupYUnits.length, axesScales: groupAxesScales.length }
    );

    // ========================================================================
    // Step 2e: Create chart container and UI elements
    // ========================================================================

    const dragBar = createDragBar(
      { indices: [], name: groupId }, // Group identifier for drag bar
      cfg,                             // COMTRADE config
      channelState                     // Channel state
    );

    const groupLabel = `Group ${groupId} (${analogChannels.length} analog, ${digitalChannels.length} digital, ${computedChannels.length} computed)`;

    const { parentDiv, chartDiv } = createChartContainer(
      dragBar,
      "chart-container",
      allLabels,
      allColors,
      groupLabel,
      groupId,
      "mixed"
    );

    parentDiv.dataset.userGroupId = groupId;
    parentDiv.dataset.chartType = "mixed";
    chartsContainer.appendChild(parentDiv);

    // ========================================================================
    // Step 2f: Build uPlot options (chart configuration)
    // ========================================================================

    // For mixed charts, we need to determine axis scales intelligently:
    // - Analog channels get one Y-axis with appropriate scale
    // - Digital channels might get their own Y-axis (0-1 or custom)
    // - Computed channels get another Y-axis

    const opts = createChartOptions({
      title: `Group ${groupId} (${analogChannels.length} analog, ${digitalChannels.length} digital, ${computedChannels.length} computed)`,
      yLabels: allLabels,
      lineColors: allColors,
      verticalLinesX: verticalLinesX,
      xLabel: data?.xLabel || "Time",
      xUnit: data?.xUnit || "s",
      getCharts: () => charts,
      yUnits: groupYUnits,
      axesScales: groupAxesScales,
      singleYAxis: false,
      maxYAxes: globalMaxYAxes,
      autoScaleUnit: { x: true, y: true },
    });

    // ========================================================================
    // Step 2g: Create digital fill plugin (if digital channels exist)
    // ========================================================================

    let digitalPlugin = null;
    if (digitalChannels.length > 0) {
      // Digital fill signals reference the data array indices for digital series
      const digitalDataIndices = analogChannels.length + 1; // Series start index in data array
      const digitalFillSignals = digitalChannels.map((ch, i) => ({
        signalIndex: digitalDataIndices + i, // 1-based index in uPlot data
        offset: (digitalChannels.length - 1 - i) * 20, // Vertical stacking offset
        color: ch.displayedColor || "#888888",
        targetVal: 1, // Binary: "1" is considered "high"
        originalIndex: ch.globalIndex,
      }));

      digitalPlugin = createDigitalFillPlugin(
        chartData.slice(digitalDataIndices) // Pass only digital data arrays
      );

      console.log(
        `[renderGroupCharts] 🔌 Digital fill plugin configured for group ${groupId}:`,
        {
          signals: digitalFillSignals.length,
          dataArrays: chartData.length - digitalDataIndices,
        }
      );

      // Add plugin to options
      opts.plugins = opts.plugins || [];
      opts.plugins.push(digitalPlugin);
    }

    // Add vertical line plugin
    opts.plugins = opts.plugins || [];
    opts.plugins.push(verticalLinePlugin(verticalLinesX, () => charts));

    // ========================================================================
    // Step 2g: Initialize uPlot chart instance
    // ========================================================================

    const uPlotInstance = initUPlotChart(opts, chartDiv, {
      xData: data.time,
      yData: chartData.slice(1), // All Y data (skip time axis)
    });

    console.log(
      `[renderGroupCharts] ✨ Chart instance created for group ${groupId}`
    );

    // ========================================================================
    // Step 2h: Register chart in metadata store
    // ========================================================================

    const metadata = addChart({
      chartType: "mixed",
      userGroupId: groupId,
      name: groupLabel,
      channels: [
        ...analogChannels.map((ch, localIdx) => ({
          globalIndex: ch.globalIndex,
          name: ch.name,
          type: "analog",
          localIndex: localIdx,
        })),
        ...digitalChannels.map((ch, localIdx) => ({
          globalIndex: ch.globalIndex,
          name: ch.name,
          type: "digital",
          localIndex: analogChannels.length + localIdx,
        })),
        ...computedChannels.map((ch, localIdx) => ({
          globalIndex: ch.globalIndex,
          name: ch.name,
          type: "computed",
          localIndex: analogChannels.length + digitalChannels.length + localIdx,
        })),
      ],
      groupId,
    });

    console.log(
      `[renderGroupCharts] 📝 Metadata registered for group ${groupId}:`,
      metadata
    );

    // ========================================================================
    // Step 2i: Tag chart instance with metadata
    // ========================================================================

    const chartObj = {
      ...uPlotInstance,
      _userGroupId: groupId,
      _chartType: "mixed",
      _metadata: metadata,
      _analogCount: analogChannels.length,
      _digitalCount: digitalChannels.length,
      _computedCount: computedChannels.length,
    };

    charts.push(chartObj);

    console.log(
      `[renderGroupCharts] ✅ Group ${groupId} chart created and registered`
    );
  } catch (error) {
    console.error(`[renderGroupCharts] ❌ Error creating chart for group ${groupId}:`, error);
  }
}
