// File: src/services/computedChannels/resultProcessing.js
// Single Responsibility: Process worker results

/**
 * Convert ArrayBuffer to array
 */
export const convertResultsToArray = (resultsBuffer) => {
  return Array.from(new Float64Array(resultsBuffer));
};

/**
 * Calculate statistics from results
 */
export const calculateStatistics = (results) => {
  const validResults = results.filter((v) => isFinite(v) && v !== 0);

  if (validResults.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      count: results.length,
      validCount: 0,
    };
  }

  return {
    min: Math.min(...validResults),
    max: Math.max(...validResults),
    mean: validResults.reduce((a, b) => a + b, 0) / validResults.length,
    count: results.length,
    validCount: validResults.length,
  };
};

/**
 * Generate unique channel name (or use provided name)
 * If channelName provided, use it; otherwise generate timestamp-based name
 */
export const generateChannelName = (customChannelName = null) => {
  if (
    customChannelName &&
    typeof customChannelName === "string" &&
    customChannelName.trim()
  ) {
    const finalName = customChannelName.trim();
    console.log("[resultProcessing] ✅ Using custom channel name:", finalName);
    return finalName;
  }

  const timestampName = `computed_${Date.now()}`;
  console.log(
    "[resultProcessing] ⏱️ No custom name, using timestamp:",
    timestampName
  );
  return timestampName;
};

function detectComputedGroup() {
  const parseIndex = (value) => {
    if (typeof value !== "string") return null;
    if (!value.startsWith("G")) return null;
    const parsed = parseInt(value.slice(1), 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  let maxIndex = -1;

  try {
    const globalRef =
      typeof window !== "undefined"
        ? window
        : typeof globalThis !== "undefined"
        ? globalThis
        : null;
    const metadataState = globalRef?.__chartMetadataState;
    if (metadataState) {
      const { charts, nextUserGroupId } = metadataState;
      if (Array.isArray(charts)) {
        charts.forEach((chart) => {
          const idx = parseIndex(chart?.userGroupId);
          if (idx !== null && idx > maxIndex) {
            maxIndex = idx;
          }
        });
      }
      if (typeof nextUserGroupId === "number") {
        maxIndex = Math.max(maxIndex, nextUserGroupId - 1);
      }
    }

    const cfgGroups = globalRef?.globalCfg?.computedChannels;
    if (Array.isArray(cfgGroups)) {
      cfgGroups.forEach((item) => {
        const idx = parseIndex(item?.group);
        if (idx !== null && idx > maxIndex) {
          maxIndex = idx;
        }
      });
    }

    const collectFromState = (list) => {
      if (!Array.isArray(list)) return;
      list.forEach((value) => {
        const idx = parseIndex(value);
        if (idx !== null && idx > maxIndex) {
          maxIndex = idx;
        }
      });
    };

    collectFromState(globalRef?.channelState?.analog?.groups);
    collectFromState(globalRef?.channelState?.digital?.groups);
    collectFromState(globalRef?.channelState?.computed?.groups);
  } catch (error) {
    console.warn(
      "[resultProcessing] Group detection failed, defaulting to G0",
      error
    );
  }

  const nextIndex = maxIndex + 1;
  return `G${Math.max(0, nextIndex)}`;
}

/**
 * Build channel data object from results
 * Now accepts custom channel name from equation
 */
export const buildChannelData = (
  results,
  expression,
  mathJsExpr,
  unit,
  stats,
  customChannelName = null,
  groupOverride = null // ← NEW: Optional group override
) => {
  console.log("[resultProcessing] 🏗️ buildChannelData called with:", {
    customChannelName: customChannelName,
    expression: expression,
    mathJsExpr: mathJsExpr,
    hasResults: !!results,
    resultCount: results?.length,
  });

  const channelName = generateChannelName(customChannelName);

  console.log("[resultProcessing] 📝 Final channel name:", channelName);

  const resolvedGroup =
    typeof groupOverride === "string" && groupOverride.trim()
      ? groupOverride
      : detectComputedGroup();

  // ✅ ASSIGN COLOR FROM PALETTE (index-based at creation time)
  const computedIndex = window.globalData?.computedData?.length || 0;
  const computedPalette = (typeof window !== "undefined" &&
    window.COMPUTED_CHANNEL_COLORS) || [
    "#dc2626", // red-600
    "#2563eb", // blue-600
    "#16a34a", // green-600
    "#9333ea", // purple-700
    "#ea580c", // orange-600
    "#0d9488", // teal-600
    "#b45309", // amber-700
    "#be185d", // pink-600
  ];
  const assignedColor = computedPalette[computedIndex % computedPalette.length];

  console.log("[resultProcessing] 🎨 Assigned color:", {
    index: computedIndex,
    color: assignedColor,
    paletteSize: computedPalette.length,
  });

  return {
    id: channelName,
    // Alias for compatibility with UI/table code that expects channelID
    channelID: channelName,
    name: channelName,
    equation: expression,
    mathJsExpression: mathJsExpr,
    data: results,
    results: results,
    stats: stats,
    unit: unit || "",
    group: resolvedGroup,
    sampleCount: results.length,
    createdAt: Date.now(),
    index: computedIndex,
    color: assignedColor, // ✅ NEW: Assign palette color
    type: "Computed", // ✅ Set type to Computed so it updates channelState.computed
  };
};
