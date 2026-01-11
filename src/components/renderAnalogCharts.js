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
import { calculateAxisCountForGroup } from "../utils/axisCalculator.js";
import { getGlobalAxisAlignment } from "../utils/chartAxisAlignment.js";
import { getMaxYAxes } from "../utils/maxYAxesStore.js";
import { attachListenerWithCleanup } from "../utils/eventListenerManager.js";
import { addChart } from "../utils/chartMetadataStore.js";
// import { deltaBoxPlugin } from "../plugins/deltaBoxPlugin.js"; // DISABLED: Using DeltaWindow popup instead

export function renderAnalogCharts(
  cfg,
  data,
  chartsContainer,
  charts,
  verticalLinesX,
  channelState,
  autoGroupChannels
) {
  let groups;

  const optimizationStartTime = performance.now();
  const userGroups = channelState?.analog?.groups || [];

  // LOG: Debug group population
  console.log("[renderAnalogCharts] 📊 userGroups from state:", userGroups);
  console.log(
    "[renderAnalogCharts] Total analog channels:",
    cfg.analogChannels?.length
  );

  // Build groups using stable channelIDs when available.
  // Each group object will have: { name, ids: [channelID,...], indices: [globalIndex,...] }
  const totalAnalog = Array.isArray(cfg.analogChannels)
    ? cfg.analogChannels
    : [];
  const channelIDs = channelState?.analog?.channelIDs || [];
  
  console.log(
    "[renderAnalogCharts] channelIDs from state:",
    channelIDs
  );

  if (
    Array.isArray(userGroups) &&
    userGroups.length > 0 &&
    userGroups.some((g) => g !== undefined && g !== null && g !== "")
  ) {
    // ⚡ OPTIMIZATION: User has assigned groups - use them directly without autoGroupChannels
    console.log(
      `[renderAnalogCharts] ⚡ Using user-assigned groups (${userGroups.length} channels)`
    );

    // collect explicit groups by name using channelIDs; keep unassigned indices for auto grouping
    const explicit = {};
    const autoIndices = [];
    for (let i = 0; i < totalAnalog.length; i++) {
      const g = userGroups[i];
      if (g === undefined || g === null || g === "") {
        autoIndices.push(i);
      } else {
        if (!explicit[g]) explicit[g] = [];
        explicit[g].push(i);
      }
    }

    groups = Object.entries(explicit).map(([name, idxs]) => ({
      name,
      indices: idxs.slice(),
      ids: idxs.map((j) => channelIDs[j]),
      axisCount: calculateAxisCountForGroup(
        idxs.map((idx) => totalAnalog[idx])
      ),
    }));

    // Auto-group any remaining channels and remap to global indices/ids
    if (autoIndices.length > 0) {
      console.log(
        `[renderAnalogCharts] ⚡ Auto-grouping ${autoIndices.length} unassigned channels`
      );
      const autoStartTime = performance.now();

      const remainingChannels = autoIndices.map((i) => totalAnalog[i]);
      const autoGroups = autoGroupChannels(remainingChannels || []);

      const autoEndTime = performance.now();
      console.log(
        `[renderAnalogCharts] ✓ Auto-grouping took ${(
          autoEndTime - autoStartTime
        ).toFixed(2)}ms`
      );

      autoGroups.forEach((ag) => {
        const globalIndices = ag.indices.map(
          (localIdx) => autoIndices[localIdx]
        );
        groups.push({
          name: ag.name,
          indices: globalIndices,
          ids: globalIndices.map((gi) => channelIDs[gi]),
          colors: ag.colors,
          axisCount: calculateAxisCountForGroup(
            globalIndices.map((idx) => totalAnalog[idx])
          ),
        });
      });
    }
  } else {
    // full auto grouping -> convert local indices to global indices and ids
    console.log(
      `[renderAnalogCharts] 🔄 Running full autoGroupChannels on ${totalAnalog.length} channels...`
    );
    const autoStartTime = performance.now();

    // ✅ FIX: Build current channel objects from state instead of using stale cfg.analogChannels
    // This ensures indices are correct after deletions
    const currentChannels = channelIDs.map((id, idx) => ({
      id: id || `analog-${idx}`,
      channelID: id,
      unit: channelState.analog.yUnits?.[idx] || "",
      name: channelState.analog.yLabels?.[idx] || `Ch ${idx}`,
      index: idx,
    }));

    const autoGroups = autoGroupChannels(currentChannels || []);

    const autoEndTime = performance.now();
    console.log(
      `[renderAnalogCharts] ✓ Full autoGroupChannels took ${(
        autoEndTime - autoStartTime
      ).toFixed(2)}ms`
    );

    groups = autoGroups.map((g) => ({
      name: g.name,
      indices: (g.indices || []).slice(),
      ids: (g.indices || []).map((idx) => channelIDs[idx]),
      colors: g.colors,
      axisCount: calculateAxisCountForGroup(
        (g.indices || []).map((idx) => currentChannels[idx])
      ),
    }));
  }

  // ✅ Get global axis alignment from global store
  // The store gets updated when group changes in chartManager
  const globalMaxYAxes = getMaxYAxes();

  // ⏱️ TIMING: Start chart creation
  const chartsStartTime = performance.now();
  console.log(
    `[renderAnalogCharts] 🔧 Starting chart creation for ${groups.length} groups... maxYAxes=${globalMaxYAxes}`
  );
  
  // Log groups structure for debugging
  console.log(
    "[renderAnalogCharts] 📦 Groups structure:",
    groups.map((g) => ({
      name: g.name,
      ids: g.ids,
      indices: g.indices,
    }))
  );

  // ✅ FIX: Filter groups to only those with actual channels (prevent phantom empty containers)
  const groupsWithChannels = groups.filter(group => {
    const hasChannels = (group.ids && group.ids.length > 0) || 
                        (group.indices && group.indices.filter(i => i >= 0).length > 0);
    if (!hasChannels) {
      console.log(
        `[renderAnalogCharts] ⏭️ Skipping group "${group.name}" - no channels assigned`
      );
    }
    return hasChannels;
  });

  console.log(
    `[renderAnalogCharts] ✅ Filtered ${groups.length} → ${groupsWithChannels.length} groups with channels`
  );

  // Render each group as a chart (only groups with actual channels)
  groupsWithChannels.forEach((group) => {
    const groupStartTime = performance.now();
    // resolve any missing ids -> indices mapping defensively
    const resolvedIndicesRaw = (group.ids || []).map((id, i) => {
      if (id == null) return group.indices ? group.indices[i] : -1;
      const idx = channelIDs.indexOf(id);
      return idx >= 0 ? idx : group.indices ? group.indices[i] : -1;
    });
    
    console.log(
      `[renderAnalogCharts] 🔍 Group "${group.name}": ids=[${(group.ids || []).join(", ")}], resolvedIndicesRaw=[${resolvedIndicesRaw.join(", ")}]`
    );
    
    // filter out unresolved indices
    const resolvedIndices = resolvedIndicesRaw.filter(
      (idx) => Number.isFinite(idx) && idx >= 0
    );

    // skip empty groups
    if (!resolvedIndices || resolvedIndices.length === 0) return;

    const dragBar = createDragBar(
      { indices: resolvedIndices, name: group.name },
      cfg,
      channelState
    );

    // ✅ FIX: Defensive checks for undefined properties
    const yLabels = channelState?.analog?.yLabels || [];
    const lineColors = channelState?.analog?.lineColors || [];
    const yUnits = channelState?.analog?.yUnits || [];
    const axesScales = channelState?.analog?.axesScales || [];
    const xLabel = channelState?.analog?.xLabel || "";
    const xUnit = channelState?.analog?.xUnit || "";

    // Filter out indices that are out of bounds (after deletion)
    const validIndices = resolvedIndices.filter(
      (idx) => idx >= 0 && idx < (yLabels?.length || 0)
    );

    // Skip this group if all indices are invalid
    if (validIndices.length === 0) {
      console.log(
        `[renderAnalogCharts] ⏭️ Group "${group.name}" has no valid channel indices, skipping`
      );
      return;
    }

    const groupYLabels = validIndices.map((idx) => yLabels[idx]);
    const groupLineColors = validIndices.map((idx) => lineColors[idx]);
    const groupYUnits = validIndices.map((idx) => yUnits[idx]);
    
    console.log(
      `[renderAnalogCharts] 📋 Group "${group.name}": yLabels=[${groupYLabels.join(", ")}]`
    );
    
    const groupAxesScales = [
      axesScales[0],
      ...validIndices.map((idx) => axesScales[idx + 1]),
    ];

    // Extract group ID from first channel in this group
    // All channels in the same group share the same groupId, so just take the first one
    const groupId =
      validIndices.length > 0 ? userGroups[validIndices[0]] : "";

    // LOG: Debug group extraction
    console.log(
      `[renderAnalogCharts] 🏷️ Group "${
        group.name
      }": valid indices = [${validIndices.join(
        ","
      )}], extracted groupId = "${groupId}"`
    );

    // Create chart container with individual channel names, colors, type label, and single group ID
    const metadata = addChart({
      chartType: "analog",
      name: group.name,
      groupName: group.name,
      userGroupId: groupId,
      channels: validIndices.map((idx) => {
        const ch = cfg.analogChannels?.[idx];
        return (
          ch?.id ||
          ch?.channelID ||
          ch?.name ||
          (typeof ch?.channelIdx === "number"
            ? `analog-${ch.channelIdx}`
            : `analog-${idx}`)
        );
      }),
      colors: group.colors || groupLineColors,
      indices: validIndices.slice(),
      sourceGroupId: groupId,
    });

    console.log(
      `[renderAnalogCharts] Creating ${metadata.userGroupId} → ${metadata.uPlotInstance}`,
      metadata.name
    );

    const { parentDiv, chartDiv } = createChartContainer(
      dragBar,
      "chart-container",
      groupYLabels,
      groupLineColors,
      "Analog Channels",
      metadata.userGroupId,
      "analog"
    );
    parentDiv.dataset.userGroupId = metadata.userGroupId;
    parentDiv.dataset.uPlotInstance = metadata.uPlotInstance;
    parentDiv.dataset.chartType = "analog";
    chartsContainer.appendChild(parentDiv);

    const chartData = [
      data.time,
      ...validIndices.map((idx) => data.analogData[idx]),
    ];
    
    console.log(
      `[renderAnalogCharts] 📊 Group "${group.name}": validIndices=[${validIndices.join(", ")}], analogData.length=${data.analogData?.length || 0}, chartData series count=${chartData.length}`
    );

    const opts = createChartOptions({
      title: group.name || "",
      yLabels: groupYLabels,
      lineColors: groupLineColors,
      verticalLinesX: verticalLinesX,
      xLabel,
      xUnit,
      getCharts: () => charts,
      yUnits: groupYUnits,
      axesScales: groupAxesScales,
      singleYAxis: false,
      maxYAxes: globalMaxYAxes, // ✅ Use global axis alignment for all charts!
    });

    console.log(
      `[renderAnalogCharts] ✅ Chart config: group="${
        group.name
      }", globalMaxYAxes=${globalMaxYAxes}, channels=${
        groupYLabels.length
      }, yUnits=[${groupYUnits.join(", ")}]`
    );

    opts.plugins = opts.plugins || [];
    opts.plugins = opts.plugins.filter(
      (p) => !(p && p.id === "verticalLinePlugin")
    );
    opts.plugins.push(verticalLinePlugin(verticalLinesX, () => charts));
    // opts.plugins.push(deltaBoxPlugin()); // DISABLED: Using DeltaWindow popup instead

    const chart = initUPlotChart(opts, chartData, chartDiv, charts);
    chart._metadata = metadata;
    chart._userGroupId = metadata.userGroupId;
    chart._uPlotInstance = metadata.uPlotInstance;
    chart._chartType = "analog";

    // Attach metadata for delta calculation scaling
    chart._axesScales = groupAxesScales || [];
    chart._yUnits = groupYUnits || [];
    chart._seriesColors = groupLineColors || [];

    // store mapping from chart series -> global channel indices so chartManager can map updates
    try {
      chart._channelIndices = validIndices.slice();
      chart._type = "analog";
    } catch (e) {}

    // tooltip
    const tooltip = createTooltip();

    // ✅ Create handlers and store for cleanup
    const mousemoveHandler = (e) => {
      const idx = chart.posToIdx(e.offsetX);
      if (idx >= 0 && idx < chart.data[0].length) {
        const time = chart.data[0][idx];
        const values = chart.data
          .slice(1)
          .map((series, i) => {
            const liveSeries =
              chart.series && chart.series[i + 1] ? chart.series[i + 1] : null;
            const label =
              (liveSeries && liveSeries.label) ||
              opts.series[i + 1]?.label ||
              `Ch${i + 1}`;
            const stroke =
              (liveSeries && liveSeries.stroke) ||
              opts.series[i + 1]?.stroke ||
              (chart._seriesColors && chart._seriesColors[i]);
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

    // ✅ Attach and track listeners
    attachListenerWithCleanup(chart.over, "mousemove", mousemoveHandler, chart);
    attachListenerWithCleanup(chart.over, "mouseleave", hideTooltip, chart);

    // Click handler to add/remove vertical lines
    const clickHandler = (e) => {
      if (!chart.scales || !chart.scales.x) return;

      const xVal = chart.posToVal(e.offsetX, "x");
      const currentLines = verticalLinesX.asArray();

      // Check if clicking near an existing line (within 2% of x-range)
      const xRange = chart.scales.x.max - chart.scales.x.min;
      const tolerance = xRange * 0.02;
      const existingIdx = currentLines.findIndex(
        (line) => Math.abs(line - xVal) < tolerance
      );

      if (existingIdx >= 0) {
        // Remove line if clicking near existing line
        verticalLinesX.value = currentLines.filter((_, i) => i !== existingIdx);
      } else {
        // Add new line
        verticalLinesX.value = [...currentLines, xVal];
        // Auto-trigger delta calculation and open delta window (only if 2+ lines)
        setTimeout(async () => {
          try {
            // Update polar chart with new vertical line position
            const { getPolarChart, getCfg, getData } = await import(
              "../main.js"
            );
            const polarChart = getPolarChart();
            const cfgData = getCfg();
            const dataObj = getData();

            if (polarChart && cfgData && dataObj) {
              console.log(
                "[renderAnalogCharts] Updating polar chart for new vertical line at:",
                xVal
              );
              // Find nearest time index for this vertical line position
              const timeIndex = dataObj.time
                ? dataObj.time.findIndex((t) => t >= xVal)
                : 0;
              console.log(
                "[renderAnalogCharts] Calculated timeIndex:",
                timeIndex
              );
              polarChart.updatePhasorAtTimeIndex(
                cfgData,
                dataObj,
                Math.max(0, timeIndex)
              );
            } else {
              console.warn(
                "[renderAnalogCharts] Missing polarChart, cfg, or data:",
                {
                  polarChart: !!polarChart,
                  cfgData: !!cfgData,
                  dataObj: !!dataObj,
                }
              );
            }

            const { deltaWindow } = await import("../main.js");
            // Only show delta window if there are 2 or more vertical lines
            if (deltaWindow && verticalLinesX.value.length > 1) {
              deltaWindow.show();
            }
          } catch (e) {
            console.error(
              "[renderAnalogCharts] Cannot update polar chart or deltaWindow:",
              e.message
            );
            console.error(e);
          }
          charts.forEach((c) => c.redraw());
        }, 0);
      }
    };

    // ✅ Attach click handler with cleanup tracking
    attachListenerWithCleanup(chart.over, "click", clickHandler, chart);

    // ⏱️ Log time for this group
    const groupEndTime = performance.now();
    const groupTime = groupEndTime - groupStartTime;
    if (groupTime > 1000) {
      console.warn(
        `[renderAnalogCharts] ⚠️ SLOW GROUP: "${
          group.name
        }" took ${groupTime.toFixed(0)}ms`
      );
    } else {
      console.log(
        `[renderAnalogCharts] ✓ Group "${
          group.name
        }" created in ${groupTime.toFixed(0)}ms`
      );
    }
  });

  // ⏱️ Log chart creation time
  const chartsEndTime = performance.now();
  const chartsTime = chartsEndTime - chartsStartTime;
  console.log(
    `[renderAnalogCharts] ✓ All ${
      groups.length
    } charts created in ${chartsTime.toFixed(0)}ms`
  );

  // ⏱️ Log total render time
  const optimizationEndTime = performance.now();
  const totalTime = optimizationEndTime - optimizationStartTime;
  if (totalTime > 1000) {
    console.warn(
      `[renderAnalogCharts] ⚠️ SLOW RENDER: ${totalTime.toFixed(0)}ms for ${
        groups.length
      } groups`
    );
  } else {
    console.log(
      `[renderAnalogCharts] ✅ Render complete in ${totalTime.toFixed(0)}ms`
    );
  }
}
