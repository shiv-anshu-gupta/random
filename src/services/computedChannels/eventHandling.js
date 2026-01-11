// File: src/services/computedChannels/eventHandling.js
// Single Responsibility: Dispatch events

/**
 * Dispatch computedChannelSaved event to trigger chart rendering
 */
export const dispatchChannelSavedEvent = (
  channelData,
  expression,
  unit,
  stats,
  results
) => {
  window.dispatchEvent(
    new CustomEvent("computedChannelSaved", {
      detail: {
        channelId: channelData.id,
        channelName: channelData.name,
        equation: expression,
        samples: results.length,
        unit: unit || "",
        stats: stats,
        fullData: channelData,
      },
    })
  );
};

/**
 * Notify child window of successful evaluation
 */
export const notifyChildWindowSuccess = (
  channelName,
  resultCount,
  unit,
  stats,
  elapsedMs
) => {
  try {
    const channelListWindow = window.open("", "ChannelListWindow");
    if (channelListWindow && !channelListWindow.closed) {
      channelListWindow.postMessage(
        {
          source: "ParentWindow",
          type: "computedChannelEvaluated",
          payload: {
            success: true,
            channelName: channelName,
            samples: resultCount,
            unit: unit,
            stats: stats,
            elapsedMs: elapsedMs,
          },
        },
        "*"
      );
    }
  } catch (e) {
    console.warn("[main.js] Failed to notify child window:", e);
  }
};

/**
 * Notify child window of evaluation error
 */
export const notifyChildWindowError = (message) => {
  try {
    const channelListWindow = window.open("", "ChannelListWindow");
    if (channelListWindow && !channelListWindow.closed) {
      channelListWindow.postMessage(
        {
          source: "ParentWindow",
          type: "computedChannelEvaluated",
          payload: {
            success: false,
            error: message,
          },
        },
        "*"
      );
    }
  } catch (e) {
    console.warn("[main.js] Failed to notify child window of error:", e);
  }
};

/**
 * Notify child window of computed channel state update
 * This triggers Tabulator to add the new row
 */
export const notifyChildWindowStateUpdated = (computedChannels) => {
  try {
    const channelListWindow = window.open("", "ChannelListWindow");
    if (channelListWindow && !channelListWindow.closed) {
      channelListWindow.postMessage(
        {
          source: "ParentWindow",
          type: "COMPUTED_CHANNEL_STATE_UPDATED",
          computedChannels: computedChannels.map((ch) => ({
            id: ch.id || ch.name,
            name: ch.name || ch.id,
            unit: ch.unit || "",
            group: ch.group || "Computed",
            color: ch.color || "#FF6B6B",
            equation: ch.equation || "",
          })),
        },
        "*"
      );
      console.log(
        "[eventHandling] ✅ Notified child window of state update with",
        computedChannels.length,
        "channels"
      );
    }
  } catch (e) {
    console.warn("[eventHandling] Failed to notify child window state:", e);
  }
};
