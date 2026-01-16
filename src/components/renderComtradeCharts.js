// src/components/renderComtradeCharts.js
import { createChartOptions } from "./chartComponent.js";
import { createDragBar } from "./createDragBar.js";
import { setupChartDragAndDrop } from "./setupChartDragAndDrop.js";
import { renderAnalogCharts } from "./renderAnalogCharts.js";
import { renderDigitalCharts } from "./renderDigitalCharts.js";
import { renderComputedChannels } from "./renderComputedChannels.js";
import { destroyCharts } from "../utils/chartUtils.js";
import { autoGroupChannels } from "../utils/autoGroupChannels.js";
import { createDigitalFillPlugin } from "../plugins/digitalFillPlugin.js";
import { unwrap, createState } from "./createState.js";
import { analyzeGroupsAndPublishMaxYAxes } from "../utils/analyzeGroupsAndPublish.js";
import {
  getChartMetadataState,
  clearAllCharts,
} from "../utils/chartMetadataStore.js";

let metadataSubscriptionAttached = false;

/**
 * Render COMTRADE charts in the container.
 * @param {Object} cfg - COMTRADE config object.
 * @param {Object} data - Parsed COMTRADE data.
 * @param {HTMLElement} chartsContainer - The container for charts.
 * @param {Array} charts - Array to store chart instances.
 * @param {Array} verticalLinesX - Array of vertical line X positions.
 * @param {Function} createState - State creation utility.
 * @param {Function} calculateDeltas - Function to calculate deltas.
 * @param {string} TIME_UNIT - Time unit string.
 */
export function renderComtradeCharts(
  cfg,
  data,
  chartsContainer,
  charts,
  verticalLinesX,
  createState,
  calculateDeltas,
  TIME_UNIT,
  channelState
) {
  const renderStartTime = performance.now();

  clearAllCharts();
  console.log(`[renderComtradeCharts] Cleared chart metadata for new file`);

  // ✅ CRITICAL FIX: Properly destroy old charts BEFORE clearing array
  // This disconnects ResizeObservers, removes event listeners, and prevents memory leaks
  destroyCharts(charts);
  chartsContainer.innerHTML = "";
  setupChartDragAndDrop(chartsContainer);

  console.log("[renderComtradeCharts] Starting chart rendering...");

  // ✅ Functional approach: Analyze groups and publish to global store
  // This ensures consistent axis count across all displayed charts (analog + digital + computed)
  analyzeGroupsAndPublishMaxYAxes(charts, channelState, cfg);
  console.log(
    `[renderComtradeCharts] 🔧 Global axis alignment published to store`
  );

  // Phase 1: Render analog charts
  renderAnalogCharts(
    cfg,
    data,
    chartsContainer,
    charts,
    verticalLinesX,
    channelState,
    autoGroupChannels
  );

  // Phase 2: Render digital charts (they will read maxYAxes from global store)
  if (
    cfg.digitalChannels &&
    cfg.digitalChannels.length > 0 &&
    data.digitalData &&
    data.digitalData.length > 0
  ) {
    renderDigitalCharts(
      cfg,
      data,
      chartsContainer,
      charts,
      verticalLinesX,
      channelState
      // ✅ REMOVED: globalMaxYAxes parameter - digital charts now read from global store
    );
  }

  // Phase 3: Render computed channels
  renderComputedChannels(
    data,
    chartsContainer,
    charts,
    verticalLinesX,
    channelState
  );

  const metadataState = getChartMetadataState();
  if (!metadataSubscriptionAttached && metadataState?.subscribe) {
    metadataState.subscribe((change) => {
      console.log(
        "[MetadataChange]",
        change.path,
        "changed to",
        change.newValue
      );
    });
    metadataSubscriptionAttached = true;
  }

  const chartsMeta = Array.isArray(metadataState?.charts)
    ? metadataState.charts
    : [];

  console.log(`[renderComtradeCharts] Chart metadata summary:`, {
    totalCharts: chartsMeta.length,
    analog: chartsMeta.filter((c) => c.chartType === "analog").length,
    digital: chartsMeta.filter((c) => c.chartType === "digital").length,
    computed: chartsMeta.filter((c) => c.chartType === "computed").length,
  });

  const renderEndTime = performance.now();
  const totalTime = renderEndTime - renderStartTime;

  // Only log if render took significant time (not a quick in-place update)
  if (totalTime > 100) {
    console.log(
      `[renderComtradeCharts] ✅ All ${
        charts.length
      } charts rendered in ${totalTime.toFixed(1)}ms`
    );
  }

  if (charts.length > 0) {
    // Process deltas
    (async () => {
      try {
        const { collectChartDeltas } = await import(
          "../utils/calculateDeltas.js"
        );
        const allDeltaData = [];

        for (const chart of charts) {
          const chartDeltas = collectChartDeltas(
            verticalLinesX,
            chart,
            TIME_UNIT
          );
          if (chartDeltas.length > 0) {
            allDeltaData.push(...chartDeltas);
          }
        }

        if (allDeltaData.length > 0) {
          try {
            const { deltaWindow, verticalLinesX } = await import("../main.js");
            if (deltaWindow) {
              const linesLength = verticalLinesX?.length || 0;
              deltaWindow.update(allDeltaData, linesLength);
            }
          } catch (e) {
            console.warn(
              "[renderComtradeCharts] Failed to update deltaWindow:",
              e.message
            );
          }
        }
      } catch (e) {
        console.error(
          "[renderComtradeCharts] Error processing deltas:",
          e.message
        );
      }
    })();
  }
}
