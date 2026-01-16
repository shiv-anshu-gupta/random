import { createChartOptions } from "./chartComponent.js";
import { createDragBar } from "./createDragBar.js";
import { createDigitalFillPlugin } from "../plugins/digitalFillPlugin.js";
import { findChangedDigitalChannelIndices } from "../utils/digitalChannelUtils.js";
import { createCustomElement } from "../utils/helpers.js";
import { createChartContainer, initUPlotChart } from "../utils/chartDomUtils.js";
import verticalLinePlugin from "../plugins/verticalLinePlugin.js";
import { getMaxYAxes } from "../utils/maxYAxesStore.js";
import { attachListenerWithCleanup } from "../utils/eventListenerManager.js";
import { addChart } from "../utils/chartMetadataStore.js";

export function renderDigitalCharts(
  cfg,
  data,
  chartsContainer,
  charts,
  verticalLinesX,
  channelState
  // ✅ REMOVED: globalMaxYAxes parameter - now reading from global store
) {
  const renderStartTime = performance.now();
  console.log("[renderDigitalCharts] 🟦 Starting digital chart rendering...");

  const DigChannelOffset = 3;

  const changedIndices = findChangedDigitalChannelIndices(data.digitalData);
  console.log(
    `[renderDigitalCharts] 📊 Found ${changedIndices.length} changed digital channels:`,
    changedIndices
  );

  // ✅ FIX: Skip rendering if no digital channels exist (prevent phantom containers)
  if (changedIndices.length === 0) {
    console.log(
      `[renderDigitalCharts] ⏭️ No digital channels to render, skipping container creation`
    );
    return;
  }

  const digitalIndicesToShow = changedIndices;
  // Keep originalIndex on displayed channel objects so mapping is stable
  const digitalChannelsToShow = digitalIndicesToShow.map((i) => ({
    ...cfg.digitalChannels[i],
    originalIndex: i,
  }));
  const digitalDataToShow = digitalIndicesToShow.map(
    (i) => data.digitalData[i]
  );
  
  // ✅ CRITICAL FIX: Use FILTERED labels that match digitalChannelsToShow
  const fullYLabels = channelState.digital.yLabels || [];
  const fullLineColors = channelState.digital.lineColors || [];
  const fullYUnits = channelState.digital.yUnits || [];
  const fullAxesScales = channelState.digital.axesScales || [];
  
  // Build yLabels with fallback to channel config if state labels are missing
  const yLabels = digitalIndicesToShow.map((i) => {
    // Try state label first
    if (fullYLabels[i]) {
      return fullYLabels[i];
    }
    // Fallback to channel config
    const ch = cfg.digitalChannels[i];
    return ch?.id || ch?.channelID || ch?.name || `Digital-${i}`;
  });
  
  const lineColors = fullLineColors;
  const yUnits = fullYUnits;
  const axesScales = fullAxesScales;
  const xLabel = channelState.digital.xLabel || "";
  const xUnit = channelState.digital.xUnit || "";
  // Colors corresponding to the displayed channels (map from full channelState)
  const displayedColors = digitalIndicesToShow.map((i) => lineColors[i] || "#888");

  // Get digital channel names for display on left side
  const digitalYLabels = yLabels; // Already filtered to displayed channels

  console.log(
    `[renderDigitalCharts] 📋 Channel labels: ${digitalYLabels.join(", ")}`
  );
  console.log(
    `[renderDigitalCharts] 🎨 Line colors: [${displayedColors.join(", ")}]`
  );
  
  // ✅ DEBUG: Verify arrays match
  console.log(`[renderDigitalCharts] 📊 Array lengths:`, {
    digitalYLabels: digitalYLabels?.length || 0,
    displayedColors: displayedColors?.length || 0,
    digitalChannelsToShow: digitalChannelsToShow?.length || 0,
    digitalDataToShow: digitalDataToShow?.length || 0,
    fullYLabels: fullYLabels?.length || 0,
  });

  // Create a pseudo-group for alignment calculation
  const digitalGroup = {
    indices: digitalIndicesToShow,
    name: "Digital Channels",
  };

  // ✅ FIX: Extract digital group ID (like analog charts do)
  // ✅ CRITICAL CHANGE: Group digital channels by their assigned group ID
  const userGroups = channelState.digital?.groups || [];
  const digitalGroupsMap = new Map();
  
  // Build group -> indices mapping
  digitalIndicesToShow.forEach((globalIdx) => {
    const groupId = typeof userGroups[globalIdx] === 'string' && /^G\d+$/.test(userGroups[globalIdx].trim())
      ? userGroups[globalIdx].trim()
      : 'G0';
    
    if (!digitalGroupsMap.has(groupId)) {
      digitalGroupsMap.set(groupId, []);
    }
    digitalGroupsMap.get(groupId).push(globalIdx);
  });
  
  console.log(`[renderDigitalCharts] 🧩 Grouped digital channels:`, Array.from(digitalGroupsMap.entries()));
  
  // ✅ FOR EACH GROUP: Create a separate chart
  digitalGroupsMap.forEach((groupIndices, groupId) => {
    console.log(`[renderDigitalCharts] 🎯 Rendering digital group ${groupId} with indices:`, groupIndices);
    
    // Filter data for this group
    const groupDigitalChannels = groupIndices.map((i) => ({...cfg.digitalChannels[i], originalIndex: i}));
    const groupDigitalData = groupIndices.map((i) => data.digitalData[i]);
    const groupDisplayedColors = groupIndices.map((i) => displayedColors[i] || '#888');
    const groupYLabels = groupIndices.map((i) => yLabels[i]);
    
    const dragBar = createDragBar(
      {
        indices: groupDigitalChannels.map((_, i) => i),
        colors: groupDisplayedColors,
      },
      { analogChannels: groupDigitalChannels },
      channelState
    );
    
    const metadata = addChart({
      chartType: 'digital',
      name: `Digital ${groupId}`,
      userGroupId: groupId,
      channels: groupDigitalChannels.map((ch, idx) => ch?.id || ch?.channelID || ch?.name || `digital-${ch?.originalIndex}`),
      colors: groupDisplayedColors.slice(),
      indices: groupIndices.slice(),
      sourceGroupId: groupId,
    });
    
    const { parentDiv, chartDiv } = createChartContainer(
      dragBar,
      'chart-container',
      groupYLabels,
      groupDisplayedColors,
      `Digital ${groupId}`,
      metadata.userGroupId,
      'digital'
    );
    
    parentDiv.dataset.userGroupId = metadata.userGroupId;
    parentDiv.dataset.uPlotInstance = metadata.uPlotInstance;
    parentDiv.dataset.chartType = 'digital';
    chartsContainer.appendChild(parentDiv);
    console.log(`[renderDigitalCharts] 🏗️ Chart container created and appended`);

    //const verticalLinesXState = verticalLinesX;
    const groupDigitalDataZeroOne = groupDigitalData.map((arr) =>
      arr.map((v) => (v ? 1 : 0))
    );
    const groupChartData = [data.time, ...groupDigitalDataZeroOne];
    
    // ✅ CRITICAL FIX: Ensure fill signals have proper fill colors with opacity
    const groupDigitalFillSignals = groupDigitalChannels.map((ch, i) => {
      const baseColor = groupDisplayedColors[i] || '#888888';
      // Create fill color with opacity (0.3 for semi-transparent fill)
      const fillColor = baseColor.includes('rgba')
        ? baseColor // Already has opacity
        : baseColor.includes('rgb')
        ? baseColor.replace(')', ', 0.3)') // Convert rgb to rgba with 0.3 opacity
        : `rgba(0, 150, 255, 0.3)`; // Fallback if color is problematic
      
      return {
        signalIndex: i + 1,
        offset: (groupDigitalChannels.length - 1 - i) * DigChannelOffset,
        color: fillColor,
        targetVal: 1,
        originalIndex: ch.originalIndex,
      };
    });
    
    console.log(`[renderDigitalCharts] 🎨 Group ${groupId} fill signals:`, {
      count: groupDigitalFillSignals.length,
      signals: groupDigitalFillSignals.map((s, i) => ({
        index: i,
        signalIndex: s.signalIndex,
        color: s.color,
        offset: s.offset,
      })),
    });
    const groupYMin = -0.5;
    const groupYMax = (groupDigitalChannels.length - 1) * DigChannelOffset + 2;

    const maxYAxes = getMaxYAxes() || 1;

    const groupChartOptionsParams = {
      title: `Digital ${groupId}`,
      yLabels: groupYLabels,
      lineColors: yUnits,
      verticalLinesX: verticalLinesX,
      xLabel,
      xUnit,
      getCharts: () => charts,
      yUnits: yUnits,
      axesScales,
      singleYAxis: true,
      autoScaleUnit: { x: true, y: false },
      scales: {
        x: { time: false, auto: true },
        y: { min: groupYMin, max: groupYMax, auto: false },
      },
    };

    const groupOpts = createChartOptions(groupChartOptionsParams);

    if (groupOpts.axes && Array.isArray(groupOpts.axes) && groupOpts.axes[1]) {
      const firstAxis = groupOpts.axes[1];
      firstAxis.show = true;
      const channelCount = groupDigitalChannels.length;
      const offset = DigChannelOffset;
      const splits = [];
      for (let i = 0; i < channelCount; ++i) {
        splits.push(i * offset);
        splits.push(i * offset + 1);
      }
      firstAxis.splits = () => splits;
      firstAxis.values = (u, vals) => {
        return vals.map((v) => {
          for (let i = 0; i < channelCount; ++i) {
            if (Math.abs(v - i * offset) < 0.1) return '0';
            if (Math.abs(v - (i * offset + 1)) < 0.1) return '1';
          }
          return '';
        });
      };
      firstAxis.label = 'Digital States';
      firstAxis.show = true;
    }

    groupOpts.series = groupOpts.series.map((originalSeries, idx) => {
      if (idx === 0) return originalSeries; // index 0 is time axis

      const channelIdx = idx - 1;
      const label = groupYLabels[channelIdx] || `Digital-${channelIdx}`;
      const strokeColor =
        groupDisplayedColors[channelIdx] ||
        originalSeries.stroke ||
        '#888';

      return {
        ...originalSeries,
        label,
        stroke: strokeColor, // use a real color, not 'transparent'
        scale: 'y',
      };
    });

    groupOpts.plugins = groupOpts.plugins || [];
    groupOpts.plugins = groupOpts.plugins.filter((p) => !(p && p.id === 'verticalLinePlugin'));

    const groupDigitalPlugin = createDigitalFillPlugin(groupDigitalFillSignals);
    
    // ✅ CRITICAL DEBUG: Verify plugin setup before attaching
    console.log(`[renderDigitalCharts] 📊 Plugin setup validation for group ${groupId}:`, {
      fillSignalsCount: groupDigitalFillSignals.length,
      chartDataArrays: groupChartData.length,
      chartDataLengths: groupChartData.map((arr, i) => ({ index: i, length: arr?.length || 0 })),
      groupDigitalChannelsCount: groupDigitalChannels.length,
      groupDisplayedColorsCount: groupDisplayedColors.length,
      groupYLabelsCount: groupYLabels.length,
      allMatch: groupDigitalFillSignals.length === groupDisplayedColors.length && 
                groupDisplayedColors.length === groupYLabels.length &&
                groupChartData.length === groupDigitalFillSignals.length + 1,
    });
    
    groupOpts.plugins.push(groupDigitalPlugin);
    groupOpts.plugins.push(verticalLinePlugin(verticalLinesX, () => charts));

    const groupChart = initUPlotChart(groupOpts, groupChartData, chartDiv, charts);

    groupChart._type = 'digital';
    groupChart._metadata = metadata;
    groupChart._userGroupId = groupId;
    charts.push(groupChart);

    console.log(`[renderDigitalCharts] ✅ Created digital chart for groupId: ${groupId}, metadata:`, metadata);
  });

  console.log(`[renderDigitalCharts] ⏱️ All digital groups rendered`);
  
  const totalTime = performance.now() - renderStartTime;
  console.log(
    `[renderDigitalCharts] ⏱️ Total digital rendering time: ${totalTime.toFixed(2)}ms`
  );
}
