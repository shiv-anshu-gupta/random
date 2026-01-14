/**
 * EquationEvaluatorComponent.js
 * Simple equation evaluator for computed channels
 */

import { createState } from "./createState.js";

export const computedChannelsState = createState([]);

let globalCfg = null;
let globalData = null;
let computedChannelsCounter = 0;

export function createEquationEvaluatorComponent(cfg, data, channelState) {
  globalCfg = cfg;
  globalData = data;

  // Initialize storage structures if not present
  if (!globalData.computedData) {
    globalData.computedData = [];
  }
  if (!globalCfg.computedChannels) {
    globalCfg.computedChannels = [];
  }

  console.log("[EquationEvaluator] Component initialized with:");
  console.log("  cfg:", cfg);
  console.log("  data:", data);
  console.log("  data.analogData length:", data?.analogData?.[0]?.length);
  console.log("  cfg.analogChannels:", cfg?.analogChannels?.length);

  const section = document.createElement("section");
  section.id = "equation-evaluator-section";
  section.classList.add("equation-evaluator-component");

  section.innerHTML = `
    <h2>Equation Evaluator</h2>
    
    <div class="equation-evaluator-controls">
      <div class="equation-evaluator-input-wrapper">
        <label for="equation-input">Equation:</label>
        <input
          type="text"
          id="equation-input"
          class="equation-evaluator-input"
          placeholder="e.g., sqrt(a0^2 + a1^2)"
        >
      </div>
      <button id="execute-btn" class="equation-evaluator-button">
        ▶️ Execute
      </button>
      <button id="show-channels-btn" class="equation-evaluator-button secondary">
        📋 Channels
      </button>
    </div>

    <div id="results" class="equation-evaluator-results"></div>
  `;

  const equationInput = section.querySelector("#equation-input");
  const executeBtn = section.querySelector("#execute-btn");
  const showChannelsBtn = section.querySelector("#show-channels-btn");
  const resultsDiv = section.querySelector("#results");

  executeBtn.onclick = () => {
    const equation = equationInput.value.trim();
    if (!equation) {
      resultsDiv.innerHTML =
        '<div class="equation-evaluator-error">Please enter an equation</div>';
      return;
    }
    executeEquation(equation, resultsDiv);
  };

  showChannelsBtn.onclick = showAllChannelsDialog;

  // Allow Enter key to execute
  equationInput.onkeypress = (e) => {
    if (e.key === "Enter") executeBtn.click();
  };

  resultsDiv.innerHTML =
    '<div class="equation-evaluator-empty">Enter an equation and click Execute</div>';

  return section;
}

function executeEquation(equation, resultsDiv) {
  try {
    const compiled = math.compile(equation);
    const sampleCount =
      globalData?.analogData?.[0]?.length ||
      globalData?.analog?.[0]?.length ||
      0;
    const results = [];

    for (let i = 0; i < sampleCount; i++) {
      const scope = {};

      // Use analogData or fallback to analog
      const analogArray = globalData?.analogData || globalData?.analog || [];
      analogArray.forEach((ch, idx) => {
        scope[`a${idx}`] = ch?.[i] ?? 0;
      });

      // Use digitalData or fallback to digital
      const digitalArray = globalData?.digitalData || globalData?.digital || [];
      digitalArray.forEach((ch, idx) => {
        scope[`d${idx}`] = ch?.[i] ?? 0;
      });

      // Also add by channel ID if available
      globalCfg?.analogChannels?.forEach((chCfg, idx) => {
        if (chCfg.id) {
          scope[chCfg.id] = analogArray?.[idx]?.[i] ?? 0;
        }
      });
      globalCfg?.digitalChannels?.forEach((chCfg, idx) => {
        if (chCfg.id) {
          scope[chCfg.id] = digitalArray?.[idx]?.[i] ?? 0;
        }
      });

      try {
        const value = compiled.evaluate(scope);
        results.push(Number(value) || 0);
      } catch (e) {
        results.push(NaN);
      }
    }

    const validResults = results.filter((v) => !isNaN(v));
    const stats = {
      count: results.length,
      validCount: validResults.length,
      min: Math.min(...validResults),
      max: Math.max(...validResults),
      avg: validResults.reduce((a, b) => a + b, 0) / validResults.length,
    };

    // Auto-detect scaling factor from raw data
    const firstChannelData = globalData?.analogData?.[0] || [];
    const maxRaw = Math.max(...firstChannelData.map((v) => Math.abs(v)));
    const scalingFactor = maxRaw / 2; // Assuming chart range is -2 to +2

    const scaledStats = {
      min: stats.min / scalingFactor,
      max: stats.max / scalingFactor,
      avg: stats.avg / scalingFactor,
    };

    // Store current computation for potential saving
    const currentComputation = {
      equation,
      results,
      stats,
      scaledStats,
      scalingFactor,
    };

    let html = `
      <div class="equation-evaluator-summary">
        <p class="equation-evaluator-summary-text">
          <strong>Equation:</strong>
          <code>${equation}</code>
        </p>

        <div class="equation-evaluator-stats-group variant-info">
          <p class="equation-evaluator-stats-title"><strong>📊 Raw Values (COMTRADE)</strong></p>
          <div class="equation-evaluator-stats-grid">
            <div class="equation-evaluator-stat-card">
              <div class="equation-evaluator-stat-label">Samples</div>
              <div class="equation-evaluator-stat-value accent-cyan">${
                stats.count
              }</div>
            </div>
            <div class="equation-evaluator-stat-card">
              <div class="equation-evaluator-stat-label">Valid</div>
              <div class="equation-evaluator-stat-value accent-green">${
                stats.validCount
              }</div>
            </div>
            <div class="equation-evaluator-stat-card">
              <div class="equation-evaluator-stat-label">Min</div>
              <div class="equation-evaluator-stat-value accent-blue">${stats.min.toFixed(
                0
              )}</div>
            </div>
            <div class="equation-evaluator-stat-card">
              <div class="equation-evaluator-stat-label">Max</div>
              <div class="equation-evaluator-stat-value accent-orange">${stats.max.toFixed(
                0
              )}</div>
            </div>
            <div class="equation-evaluator-stat-card">
              <div class="equation-evaluator-stat-label">Average</div>
              <div class="equation-evaluator-stat-value accent-purple">${stats.avg.toFixed(
                0
              )}</div>
            </div>
          </div>
        </div>

        <div class="equation-evaluator-stats-group variant-success">
          <p class="equation-evaluator-stats-title"><strong>📈 Scaled Values (Chart Range)</strong></p>
          <div class="equation-evaluator-stats-grid">
            <div class="equation-evaluator-stat-card">
              <div class="equation-evaluator-stat-label">Min</div>
              <div class="equation-evaluator-stat-value accent-blue">${scaledStats.min.toFixed(
                3
              )}</div>
            </div>
            <div class="equation-evaluator-stat-card">
              <div class="equation-evaluator-stat-label">Max</div>
              <div class="equation-evaluator-stat-value accent-orange">${scaledStats.max.toFixed(
                3
              )}</div>
            </div>
            <div class="equation-evaluator-stat-card">
              <div class="equation-evaluator-stat-label">Average</div>
              <div class="equation-evaluator-stat-value accent-green">${scaledStats.avg.toFixed(
                3
              )}</div>
            </div>
            <div class="equation-evaluator-stat-card">
              <div class="equation-evaluator-stat-label">Scale Factor</div>
              <div class="equation-evaluator-stat-value accent-purple">${(
                scalingFactor / 1000000
              ).toFixed(2)}M</div>
            </div>
          </div>
        </div>

        <div class="equation-evaluator-actions">
          <button id="save-channel-btn" class="equation-evaluator-button success">
            💾 Save as Computed Channel
          </button>
          <button id="export-ascii-btn" class="equation-evaluator-button info">
            📥 Export as ASCII
          </button>
          <button id="clear-results-btn" class="equation-evaluator-button danger">
            🗑️ Clear
          </button>
        </div>
      </div>
    `;
    resultsDiv.innerHTML = html;

    // Add event listeners for save, export and clear buttons
    const saveBtn = resultsDiv.querySelector("#save-channel-btn");
    const exportBtn = resultsDiv.querySelector("#export-ascii-btn");
    const clearBtn = resultsDiv.querySelector("#clear-results-btn");

    saveBtn.onclick = () => saveComputedChannel(currentComputation, resultsDiv);
    exportBtn.onclick = () => exportAsASCII(currentComputation);
    clearBtn.onclick = () => {
      resultsDiv.innerHTML =
        '<div class="equation-evaluator-empty">Enter an equation and click Execute</div>';
    };
  } catch (error) {
    resultsDiv.innerHTML = `<div class="equation-evaluator-error-box"><strong>Error:</strong> ${error.message}</div>`;
  }
}

function saveComputedChannel(computation, resultsDiv) {
  const channelName = `computed_${computedChannelsCounter}`;
  computedChannelsCounter++;

  // Store the raw data array in globalData
  globalData.computedData.push({
    id: channelName,
    equation: computation.equation,
    data: computation.results,
    stats: computation.stats,
    scaledStats: computation.scaledStats,
    scalingFactor: computation.scalingFactor,
  });

  // Register in config
  // ✅ AUTO-DETECT GROUP for the computed channel
  let computedChannelGroup = "G0";
  if (computation.equation) {
    const existingGroups = new Set();

    // Get groups from channelState
    if (window.channelState?.analog?.groups) {
      window.channelState.analog.groups.forEach((g) => {
        if (typeof g === "string" && g.startsWith("G")) {
          const num = parseInt(g.substring(1), 10);
          if (!isNaN(num)) existingGroups.add(num);
        }
      });
    }

    if (window.channelState?.digital?.groups) {
      window.channelState.digital.groups.forEach((g) => {
        if (typeof g === "string" && g.startsWith("G")) {
          const num = parseInt(g.substring(1), 10);
          if (!isNaN(num)) existingGroups.add(num);
        }
      });
    }

    // Find next available group
    let nextGroupNum = 0;
    while (existingGroups.has(nextGroupNum)) {
      nextGroupNum++;
    }
    computedChannelGroup = `G${nextGroupNum}`;
  }

  globalCfg.computedChannels.push({
    id: channelName,
    equation: computation.equation,
    unit: "Computed",
    group: computedChannelGroup,
    index: globalData.computedData.length - 1,
  });

  // 🎯 CRITICAL: Broadcast new computed channel to Channel List popup if open
  if (window.__channelListWindow && !window.__channelListWindow.closed) {
    try {
      const computedChannelsList = globalCfg.computedChannels || [];
      console.log("[EquationEvaluatorComponent] 📢 Broadcasting computed channels to popup after creation:", {
        count: computedChannelsList.length,
        newChannelId: channelName,
        ids: computedChannelsList.map((ch) => ch.id),
      });

      window.__channelListWindow.postMessage(
        {
          source: "MainApp",
          type: "computed_channels_updated",
          payload: {
            computedChannels: computedChannelsList,
          },
        },
        "*"
      );
    } catch (err) {
      console.warn(
        "[EquationEvaluatorComponent] Failed to broadcast computed channels to popup:",
        err
      );
    }
  }

  // Show success message
  const successMsg = document.createElement("div");
  successMsg.style.cssText =
    "color: #ffffff; background: var(--accent-green); padding: 12px; border-radius: var(--border-radius-sm); margin-top: 10px; text-align: center; font-weight: bold; animation: fadeOut 3s ease-in-out forwards;";
  successMsg.textContent = `✅ Channel saved as "${channelName}" with ${computation.results.length} samples`;

  // Add animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeOut {
      0% { opacity: 1; }
      70% { opacity: 1; }
      100% { opacity: 0; }
    }
  `;
  if (!document.head.querySelector("style[data-animation]")) {
    style.setAttribute("data-animation", "true");
    document.head.appendChild(style);
  }

  resultsDiv.parentElement.insertBefore(successMsg, resultsDiv.nextSibling);

  setTimeout(() => successMsg.remove(), 3000);

  console.log(
    "[EquationEvaluator] Saved computed channel:",
    channelName,
    "with",
    computation.results.length,
    "samples"
  );
  console.log(
    "[EquationEvaluator] Total computed channels:",
    globalData.computedData.length
  );

  // Dispatch custom event so main.js can re-render charts
  const event = new CustomEvent("computedChannelSaved", {
    detail: {
      channelId: channelName,
      equation: computation.equation,
      samples: computation.results.length,
    },
  });
  window.dispatchEvent(event);
}

function showAllChannelsDialog() {
  console.log(
    "[EquationEvaluator] Showing channels dialog. globalData:",
    globalData,
    "globalCfg:",
    globalCfg
  );

  const modal = document.createElement("div");
  modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;`;

  const dialog = document.createElement("div");
  dialog.style.cssText = `background: white; border-radius: 8px; padding: 30px; max-width: 800px; max-height: 80vh; overflow: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3); color: #333;`;

  let html = `<h2 style="margin-top: 0; color: #667eea;">Available Channels</h2>`;

  const totalSamples =
    globalData?.analogData?.[0]?.length || globalData?.analog?.[0]?.length || 0;
  console.log("[EquationEvaluator] totalSamples:", totalSamples);
  html += `<p><strong>Total Samples:</strong> ${totalSamples}</p>`;

  if (globalCfg.analogChannels?.length > 0) {
    html += `<h3 style="color: #667eea;">Analog Channels (${globalCfg.analogChannels.length})</h3>`;
    html += '<ul style="list-style: none; padding: 0;">';
    globalCfg.analogChannels.forEach((ch, i) => {
      html += `<li style="padding: 8px; background: #f0f0f0; margin-bottom: 5px; border-radius: 4px; border-left: 4px solid #667eea;">
        <strong>a${i}: ${ch.id || "Analog " + i}</strong> - Unit: ${
        ch.unit || "N/A"
      } - Samples: ${totalSamples}
      </li>`;
    });
    html += "</ul>";
  }

  if (globalCfg.digitalChannels?.length > 0) {
    html += `<h3 style="color: #667eea;">Digital Channels (${globalCfg.digitalChannels.length})</h3>`;
    html += '<ul style="list-style: none; padding: 0;">';
    globalCfg.digitalChannels.forEach((ch, i) => {
      html += `<li style="padding: 8px; background: #f0f0f0; margin-bottom: 5px; border-radius: 4px; border-left: 4px solid #667eea;">
        <strong>d${i}: ${
        ch.id || "Digital " + i
      }</strong> - Samples: ${totalSamples}
      </li>`;
    });
    html += "</ul>";
  }

  // Show Computed Channels
  if (globalData.computedData?.length > 0) {
    html += `<h3 style="color: #27AE60;">🧮 Computed Channels (${globalData.computedData.length})</h3>`;
    html += '<ul style="list-style: none; padding: 0;">';
    globalData.computedData.forEach((ch, i) => {
      html += `<li style="padding: 12px; background: #D5F4E6; margin-bottom: 5px; border-radius: 4px; border-left: 4px solid #27AE60;">
        <div><strong>c${i}: ${ch.id}</strong> - Samples: ${ch.data.length}</div>
        <div style="font-size: 12px; color: #555; margin-top: 5px;">Equation: <code style="background: white; padding: 2px 4px; border-radius: 2px;">${
          ch.equation
        }</code></div>
        <div style="font-size: 12px; color: #555; margin-top: 3px;">Range: [${ch.stats.min.toFixed(
          0
        )}, ${ch.stats.max.toFixed(0)}] | Avg: ${ch.stats.avg.toFixed(0)}</div>
      </li>`;
    });
    html += "</ul>";
  } else {
    html += `<p style="color: #999; font-style: italic;">No computed channels yet. Create one by entering an equation and clicking "Save as Computed Channel".</p>`;
  }

  dialog.innerHTML = html;

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ Close";
  closeBtn.style.cssText =
    "width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 20px; font-weight: bold; font-size: 14px;";
  closeBtn.onclick = () => modal.remove();
  dialog.appendChild(closeBtn);

  modal.appendChild(dialog);
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  document.body.appendChild(modal);
}

// Export for window access
window.computedChannelsState = computedChannelsState;

// Export helper functions for integrating computed channels with chart
export function getComputedChannels() {
  // Try to get from globalData first (for main thread access)
  if (globalData?.computedData && globalData.computedData.length > 0) {
    return globalData.computedData;
  }
  return [];
}

export function getComputedChannelConfig() {
  // Try to get from globalCfg first
  if (globalCfg?.computedChannels && globalCfg.computedChannels.length > 0) {
    return globalCfg.computedChannels;
  }
  return [];
}

export function getComputedChannelData(channelId) {
  // ✅ FIX: Get data from globalData where it's actually stored
  if (!globalData?.computedData) {
    console.warn(
      "[getComputedChannelData] No computed data found in globalData"
    );
    return [];
  }

  const computed = globalData.computedData.find((ch) => ch.id === channelId);

  if (!computed) {
    console.warn(
      `[getComputedChannelData] Channel ${channelId} not found in globalData`
    );
    return [];
  }

  if (!computed.data) {
    console.error(
      `[getComputedChannelData] Channel ${channelId} has no data property`,
      computed
    );
    return [];
  }

  // ✅ Validate that data is an array of numbers
  if (!Array.isArray(computed.data)) {
    console.error(
      `[getComputedChannelData] Channel ${channelId} data is not an array:`,
      typeof computed.data
    );
    return [];
  }

  // ✅ IMPORTANT: Apply scaling factor if present
  let scaledData = computed.data;
  if (computed.scalingFactor && computed.scalingFactor !== 1) {
    console.log(
      `[getComputedChannelData] Applying scaling factor ${computed.scalingFactor} to channel ${channelId}`
    );
    scaledData = computed.data.map((val) => val / computed.scalingFactor);
  }

  console.log(
    `[getComputedChannelData] Returning ${scaledData.length} samples for channel ${channelId}`
  );
  return scaledData;
}

/**
 * Export computed channel data as ASCII format (CSV-like)
 * Generates file with headers and all data points
 */
function exportAsASCII(computation) {
  try {
    if (
      !computation ||
      !computation.results ||
      !Array.isArray(computation.results)
    ) {
      alert("❌ No data to export. Please execute an equation first.");
      return;
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const fileName = `computed_channel_${timestamp}.csv`;

    // Build CSV content with headers
    let csvContent = "# Computed Channel Export\n";
    csvContent += `# Equation: ${computation.equation}\n`;
    csvContent += `# Timestamp: ${new Date().toISOString()}\n`;
    csvContent += `# Total Samples: ${computation.stats.count}\n`;
    csvContent += `# Valid Samples: ${computation.stats.validCount}\n`;
    csvContent += `# Min Value: ${computation.stats.min.toFixed(6)}\n`;
    csvContent += `# Max Value: ${computation.stats.max.toFixed(6)}\n`;
    csvContent += `# Average Value: ${computation.stats.avg.toFixed(6)}\n`;
    csvContent += `# Scaling Factor: ${computation.scalingFactor.toFixed(6)}\n`;
    csvContent += `# Scaled Min: ${computation.scaledStats.min.toFixed(6)}\n`;
    csvContent += `# Scaled Max: ${computation.scaledStats.max.toFixed(6)}\n`;
    csvContent += `# Scaled Average: ${computation.scaledStats.avg.toFixed(
      6
    )}\n`;
    csvContent += "\n";
    csvContent += "# Data in two formats:\n";
    csvContent += "# Column 1: Raw Values (COMTRADE format)\n";
    csvContent += "# Column 2: Scaled Values (Chart display format)\n";
    csvContent += "\n";
    csvContent += "Sample#,RawValue,ScaledValue\n";

    // Add data rows
    computation.results.forEach((rawValue, index) => {
      const scaledValue = rawValue / computation.scalingFactor;
      csvContent += `${index + 1},${rawValue.toFixed(6)},${scaledValue.toFixed(
        6
      )}\n`;
    });

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success notification
    console.log(
      `[ExportASCII] ✅ Exported ${computation.results.length} samples to ${fileName}`
    );
    alert(
      `✅ Successfully exported!\n\nFile: ${fileName}\nSamples: ${computation.results.length}\n\nLocation: Downloads folder`
    );
  } catch (error) {
    console.error("[ExportASCII] Error:", error);
    alert(`❌ Export failed: ${error.message}`);
  }
}
