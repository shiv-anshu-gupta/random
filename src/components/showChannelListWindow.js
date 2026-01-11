// // src/components/showChannelListWindow.js
// // Opens a child window and renders the channel list with drag-and-drop support
// import { createChannelList } from './ChannelList.js';

// /**
//  * Opens a child window and displays the channel list.
//  * @param {Object} channelState - State object with analog and digital channel info.
//  * @param {Function} onChannelDrop - Callback(channelType, fromIdx, toIdx) when a channel is reordered.
//  * @param {Function} onChannelColorChange - Callback(channelType, idx, color) when a channel color is changed.
//  */
// export function showChannelListWindow(channelState, onChannelDrop, onChannelColorChange) {
//   const win = window.open('', 'ChannelListWindow', 'width=400,height=600');
//   if (!win) return;
//   win.document.title = 'Channel List';
//   // Basic styles for the list
//   win.document.head.innerHTML = `
//     <title>Channel List</title>
//     <style>
//       body { font-family: Arial, sans-serif; margin: 0; padding: 12px; background: #f9f9f9; }
//       .channel-list-container { padding: 8px; }
//       .channel-list-section { margin-bottom: 18px; }
//       .channel-list { list-style: none; padding: 0; margin: 0; }
//       .channel-list-item { padding: 6px 12px; margin-bottom: 4px; background: #fff; border: 1px solid #ccc; border-radius: 4px; cursor: grab; transition: background 0.2s; }
//       .channel-list-item.dragging { opacity: 0.5; }
//       .channel-list-item.drag-over { background: #e6f0fa; }
//       h3 { margin: 8px 0 8px 0; font-size: 1.1em; }
//     </style>
//   `;
//   win.document.body.innerHTML = '';
//   // Render the channel list
//   const renderList = () => {
//     win.document.body.innerHTML = '';
//     // Unwrap channelState if it's a proxy/state object
//     const analogChannels = channelState.analog?.yLabels?.map((id, idx) => ({
//       id,
//       color: channelState.analog.lineColors[idx],
//       type: 'analog',
//       idx
//     })) || [];
//     const digitalChannels = channelState.digital?.yLabels?.map((id, idx) => ({
//       id,
//       color: channelState.digital.lineColors[idx],
//       type: 'digital',
//       idx
//     })) || [];
//     // Compose a cfg-like object for createChannelList
//     const channelListCfg = {
//       analogChannels,
//       digitalChannels
//     };
//     const listEl = createChannelList(channelListCfg, (type, fromIdx, toIdx, color) => {
//       if (color !== undefined && typeof onChannelColorChange === 'function') {
//         onChannelColorChange(type, fromIdx, color);
//       } else {
//         onChannelDrop(type, fromIdx, toIdx);
//       }
//       renderList();
//     });
//     win.document.body.appendChild(listEl);
//   };
//   renderList();
// }

import { createChannelList } from "./ChannelList.js";
import { autoGroupChannels } from "../utils/autoGroupChannels.js";
import themeBroadcast from "../utils/themeBroadcast.js";
/**
 * Open a Channel List popup and initialize the child UI.
 *
 * This function prepares the child window (loads Tailwind + Tabulator) and
 * injects the ChannelList UI into the popup. It serializes the current
 * `channelState` (analog/digital arrays) and passes them to the child. The
 * child runs `createChannelList` inside its own context and uses
 * `window.opener.postMessage(...)` to notify the parent of user-driven
 * changes (color/name/add/delete). The parent listens for these messages and
 * updates `channelState` (createState), which in turn notifies chart
 * subscribers.
 *
 * Note: the child may also call the `onChannelColorChange` or `onChannelDrop`
 * callbacks directly if they are supplied, keeping compatibility with the
 * existing callback-based integration.
 *
 * @param {Object} channelState - reactive state (createState) containing channel metadata
 * @param {Function} [onChannelDrop] - optional callback(type, fromIdx, toIdx)
 * @param {Function} [onChannelColorChange] - optional callback(type, idx, color)
 * @param {Window} [parentWindow] - optional: reference to parent window for postMessage communication
 * @returns {Window|undefined} the popup window object if opened
 */
export function showChannelListWindow(
  channelState,
  onChannelDrop,
  onChannelColorChange,
  charts, // optional: pass charts array so we can inspect digital chart plugin for display colors
  cfg, // COMTRADE config
  data, // COMTRADE data
  parentWindow = null // ✅ FIX: Accept explicit parent window reference
) {
  // ✅ FIX: Set up parentWindow reference with fallback
  parentWindow = parentWindow || window;
  console.log(
    "[showChannelListWindow] Received parentWindow, will pass to ChannelList",
    { hasParentWindow: !!parentWindow }
  );

  const win = window.open("", "ChannelListWindow", "width=600,height=700");
  if (!win) {
    console.error("Failed to open popup window - popups may be blocked");
    return false;
  }

  // ✅ REGISTER window immediately (before other setup)
  themeBroadcast.registerWindow("ChannelListWindow", win);

  // ✅ Load theme CSS
  themeBroadcast.loadThemeCSS(win);

  // ✅ Store reference for cleanup
  window.__channelListWindow = win;

  // ✅ Unregister when popup closes
  win.addEventListener("beforeunload", () => {
    console.log(
      "[ChannelList] Popup closing, unregistering from theme broadcast"
    );
    themeBroadcast.unregisterWindow("ChannelListWindow");
    window.__channelListWindow = null;
  });

  win.document.title = "Channel List";

  // ✅ Apply current theme to popup immediately
  const currentTheme = localStorage.getItem("comtrade-theme") || "dark";
  win.document.documentElement.setAttribute("data-theme", currentTheme);

  // ✅ Listen for theme changes from parent window
  win.addEventListener("message", (ev) => {
    if (ev.data && ev.data.theme) {
      win.document.documentElement.setAttribute("data-theme", ev.data.theme);
      localStorage.setItem("comtrade-theme", ev.data.theme);
      console.log("[ChannelList] Theme updated:", ev.data.theme);
    }
  });

  // Bind full cfg/data to the popup for module scripts to consume
  try {
    win.globalCfg = cfg;
    win.globalData = data;

    // ✅ Pass color constants to popup window
    if (typeof window !== "undefined" && window.COMPUTED_CHANNEL_COLORS) {
      win.COMPUTED_CHANNEL_COLORS = window.COMPUTED_CHANNEL_COLORS;
      console.log(
        "[showChannelListWindow] ✅ Passed computed color palette to popup:",
        win.COMPUTED_CHANNEL_COLORS
      );
    }

    // Also create a serialized data object with analog and digital arrays for expression evaluation
    if (data && typeof data === "object") {
      win.__dataArrays = {
        analogData: data.analog || data.analogData || [],
        digitalData: data.digital || data.digitalData || [],
        TIME_UNIT: data.TIME_UNIT,
        TIME_DATA: data.TIME_DATA || data.time || data.t || [],
      };
      console.log(
        "[showChannelListWindow] Bound data arrays to child window:",
        {
          analogCount: win.__dataArrays.analogData.length,
          digitalCount: win.__dataArrays.digitalData.length,
        }
      );
    }

    // Also bind the computed channels state for reactive updates
    if (typeof window !== "undefined" && window.__computedChannelsState) {
      win.__computedChannelsState = window.__computedChannelsState;
    }
  } catch (e) {
    console.warn("[showChannelListWindow] Failed to bind globals:", e);
  }

  // Add Math.js - needed for expression evaluation in ChannelList
  const mathScript = win.document.createElement("script");
  mathScript.src =
    "https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.11.0/math.min.js";
  win.document.head.appendChild(mathScript);

  // Tailwind CSS
  const tailwindScript = win.document.createElement("script");
  tailwindScript.src = "https://cdn.tailwindcss.com";
  win.document.head.appendChild(tailwindScript);

  // ✅ Add MathLive CSS for LaTeX editor
  const mlCoreCSS = win.document.createElement("link");
  mlCoreCSS.rel = "stylesheet";
  mlCoreCSS.href = "https://unpkg.com/mathlive/dist/mathlive.core.css";
  win.document.head.appendChild(mlCoreCSS);

  const mlCSS = win.document.createElement("link");
  mlCSS.rel = "stylesheet";
  mlCSS.href = "https://unpkg.com/mathlive/dist/mathlive.css";
  win.document.head.appendChild(mlCSS);

  // ✅ Add custom CSS for MathLive keyboard z-index
  const mlKeyboardStyle = win.document.createElement("style");
  mlKeyboardStyle.textContent = `
    .ML__keyboard {
      z-index: 10002 !important;
    }
  `;
  win.document.head.appendChild(mlKeyboardStyle);

  // ✅ Add MathLive JavaScript
  const mlScript = win.document.createElement("script");
  mlScript.defer = true;
  mlScript.src = "https://unpkg.com/mathlive";
  win.document.head.appendChild(mlScript);

  // Add Tabulator CSS
  const tabulatorCSS = win.document.createElement("link");
  tabulatorCSS.rel = "stylesheet";
  tabulatorCSS.href =
    "https://unpkg.com/tabulator-tables@5.5.2/dist/css/tabulator.min.css";
  win.document.head.appendChild(tabulatorCSS);

  // Add Tabulator JS
  const tabulatorScript = win.document.createElement("script");
  tabulatorScript.src =
    "https://unpkg.com/tabulator-tables@5.5.2/dist/js/tabulator.min.js";
  // tabulatorScript.onload = () => {
  //   setTimeout(setupChannelList, 20); // small delay to ensure Tailwind is ready
  // };
  // win.document.head.appendChild(tabulatorScript);
  tailwindScript.onload = () => {
    tabulatorScript.onload = () => {
      // Debug Tabulator versions to detect mismatches
      try {
        console.debug(
          "popup Tabulator version:",
          win.Tabulator &&
            win.Tabulator.prototype &&
            win.Tabulator.prototype.constructor &&
            win.Tabulator.prototype.constructor.VERSION
            ? win.Tabulator.prototype.constructor.VERSION
            : win.Tabulator?.version || null
        );
      } catch (e) {
        console.debug("popup Tabulator version: (unavailable)");
      }
      try {
        console.debug(
          "main Tabulator version:",
          window.Tabulator?.version || null
        );
      } catch (e) {
        console.debug("main Tabulator version: (unavailable)");
      }
      // Ensure math.js is available before initializing table
      if (typeof win.math === "undefined") {
        mathScript.addEventListener("load", () => setupChannelList());
      } else {
        setupChannelList();
      }
    };
    win.document.head.appendChild(tabulatorScript);
  };

  // Root container with Tailwind styling
  // win.document.body.innerHTML = `
  //   <div id="channel-root" class="p-4 bg-red-50 min-h-screen overflow-x-auto"></div>
  // `;

  win.document.body.innerHTML = `
  <div id="channel-table" class="w-auto flex flex-col gap-4 rounded-md h-auto p-2 md:p-4 theme-bg">
    <div id="button-bar" class="flex flex-wrap gap-2 m-2 md:m-3">
      <select id="group-select" class="border rounded px-2 py-1 text-sm theme-border theme-bg" style="color: var(--chart-text);">
        <option value="Analog">Analog</option>
        <option value="Digital">Digital</option>
      </select>
      <button id="add-row" class="theme-btn-success text-sm px-3 py-1 rounded">
        Add Blank Row
      </button>
      <button id="history-undo" class="theme-btn-primary text-sm px-3 py-1 rounded">Undo Edit</button>
      <button id="history-redo" class="theme-btn-primary text-sm px-3 py-1 rounded">Redo Edit</button>
      <button id="download-pdf" class="theme-btn-primary text-sm px-3 py-1 rounded">Download PDF</button>
    </div>
    <div id="channel-root" class="w-auto overflow-y-auto border theme-border rounded-lg shadow-md" style="background-color: var(--chart-background);"></div>
  </div>
  `;

  // Add custom CSS with theme variables
  const themeStyle = win.document.createElement("style");
  themeStyle.textContent = `
    :root {
      --bg-primary: #f5f5f5;
      --bg-secondary: #ffffff;
      --bg-tertiary: #f0f0f0;
      --bg-sidebar: #ffffff;
      --text-primary: #1a1a1a;
      --text-secondary: #666666;
      --text-muted: #999999;
      --border-color: #e0e0e0;
      --chart-bg: #ffffff;
      --chart-text: #1a1a1a;
      --chart-grid: #e0e0e0;
      --chart-axis: #666666;
    }

    /* Theme-aware button styles */
    .theme-btn-primary {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
    }
    .theme-btn-primary:hover {
      background-color: var(--bg-tertiary);
    }

    .theme-btn-success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #155724;
    }
    .theme-btn-success:hover {
      background-color: #155724;
      color: #d4edda;
    }

    .theme-btn-danger {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #721c24;
    }
    .theme-btn-danger:hover {
      background-color: #721c24;
      color: #f8d7da;
    }

    /* Theme-aware background and text */
    .theme-bg {
      background-color: var(--chart-bg);
      color: var(--chart-text);
    }
    .theme-border {
      border-color: var(--border-color);
    }
  `;
  win.document.head.appendChild(themeStyle);

  // Add theme synchronization listener
  win.addEventListener("message", (event) => {
    // Only accept messages from parent window
    if (event.source !== window.opener) return;

    const { source, type, payload } = event.data || {};

    if (source === "MainApp" && type === "theme_change") {
      const { theme, colors } = payload;
      console.log(
        `[ChannelListWindow] Received theme change from parent: ${theme}`
      );

      // Apply theme colors to CSS variables
      const root = win.document.documentElement.style;
      Object.entries(colors).forEach(([key, value]) => {
        root.setProperty(key, value);
      });

      // Save to localStorage for persistence
      win.localStorage.setItem("comtrade-theme", theme);

      console.log(`[ChannelListWindow] Applied theme: ${theme}`);
    }
  });

  // Request current theme from parent on load
  if (window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage(
        {
          source: "ChildApp",
          type: "theme_request",
          payload: {
            windowType: "channelList",
            timestamp: Date.now(),
          },
        },
        "*"
      );
    } catch (err) {
      console.warn(
        "[ChannelListWindow] Could not request theme from parent:",
        err
      );
    }
  }

  function setupChannelList() {
    // Build analog channel objects and compute group names using autoGroupChannels
    const analogChannels =
      channelState.analog?.yLabels?.map((id, idx) => ({
        id,
        name: id,
        channelID: channelState.analog.channelIDs?.[idx],
        color: channelState.analog.lineColors[idx],
        type: "Analog",
        idx,
      })) || [];

    console.log(
      "[showChannelListWindow] Analog channels from channelState:",
      analogChannels
    );
    console.log(
      "[showChannelListWindow] channelState.analog.yUnits:",
      channelState.analog?.yUnits
    );

    // Compute grouping for analog channels based on ids/units
    let analogGroupMap = {};
    try {
      const groups = autoGroupChannels(
        analogChannels.map((ch, i) => ({
          id: ch.id,
          unit: channelState.analog.yUnits?.[i],
        }))
      );
      groups.forEach((g) => {
        g.indices.forEach((gi) => {
          analogGroupMap[gi] = g.name;
        });
      });
    } catch (e) {
      // fallback: leave analogGroupMap empty
    }

    // Prefer using the chart's displayed color for digital channels when available
    const digitalChannels =
      channelState.digital?.yLabels?.map((id, idx) => {
        let color = channelState.digital.lineColors[idx];
        try {
          if (charts && charts.length > 0) {
            const digitalChart = charts.find((c) => c && c._chartType === "digital");
            const plugin =
              digitalChart &&
              digitalChart.plugins &&
              digitalChart.plugins.find((p) => p && p.id === "digitalFill");
            if (plugin && typeof plugin.getSignalColors === "function") {
              const mapping = plugin.getSignalColors();
              // Each channel's original index in the state matches its idx in the channelList
              // Use this to find the displayed color for this channel if it's visible
              const found = mapping.find((m) => m.originalIndex === idx);
              if (found && found.color) {
                // If this channel is currently displayed, use its display color
                color = found.color;
              }
            }
          }
        } catch (e) {
          /* ignore and fallback to channelState color */
        }

        const cfgGroup = cfg?.digitalChannels?.[idx]?.group;
        const stateGroup = channelState.digital?.groups?.[idx];

        return {
          id,
          name: id,
          channelID: channelState.digital.channelIDs?.[idx],
          color: color,
          type: "Digital",
          idx,
          originalIndex: idx,
          group:
            (typeof cfgGroup === "string" && /^G\d+$/.test(cfgGroup)
              ? cfgGroup.trim()
              : "") ||
            (typeof stateGroup === "string" && /^G\d+$/.test(stateGroup)
              ? stateGroup.trim()
              : "") ||
            "G0",
        };
      }) || [];

    // Attach group names to analog channels (default to 'Group 1' when unknown)
    const analogChannelsWithGroup = analogChannels.map((ch, i) => ({
      ...ch,
      unit: channelState.analog?.yUnits?.[i] || "", // ← Add unit from channelState
      // prefer persisted group from channelState if present, else autoGroup map, else default
      group:
        (channelState.analog &&
          channelState.analog.groups &&
          channelState.analog.groups[i]) ||
        analogGroupMap[i] ||
        "Group 1",
    }));

    console.log(
      "[showChannelListWindow] analogChannelsWithGroup (with units):",
      analogChannelsWithGroup
    );

    // Build computed channels from cfg if available
    const computedChannels =
      cfg && cfg.computedChannels
        ? cfg.computedChannels.map((ch, idx) => ({
            id: ch.id,
            name: ch.name,
            type: "Computed",
            unit: ch.unit || "",
            group: ch.group || "Computed",
            color: ch.color || "#888",
            idx,
          }))
        : [];

    // Also include computed channels from channelState if available
    if (
      channelState?.computed?.channelIDs &&
      channelState.computed.channelIDs.length > 0
    ) {
      channelState.computed.channelIDs.forEach((id, idx) => {
        // Only add if not already in computedChannels
        if (!computedChannels.some((ch) => ch.id === id)) {
          computedChannels.push({
            id,
            name: channelState.computed.yLabels[idx] || id,
            type: "Computed",
            unit: channelState.computed.yUnits[idx] || "",
            group: channelState.computed.groups[idx] || "Computed",
            color: channelState.computed.lineColors[idx] || "#FF6B6B",
            idx: computedChannels.length,
          });
        }
      });
    }

    console.log(
      "[showChannelListWindow] cfg.computedChannels:",
      cfg?.computedChannels
    );
    console.log(
      "[showChannelListWindow] computedChannels (with units):",
      computedChannels
    );

    const channelListCfg = {
      analogChannels: analogChannelsWithGroup,
      digitalChannels,
      computedChannels,
    };

    console.log(
      "[showChannelListWindow] Final channelListCfg being sent to popup:",
      channelListCfg
    );

    // Call createChannelList and append
    // const listEl = createChannelList.call(
    //   win,
    //   channelListCfg,
    //   (type, fromIdx, toIdx, color) => {
    //     if (color !== undefined && typeof onChannelColorChange === "function") {
    //       onChannelColorChange(type, fromIdx, color);
    //     } else if (typeof onChannelDrop === "function") {
    //       onChannelDrop(type, fromIdx, toIdx);
    //     }
    //   }
    // );

    // win.document.getElementById("channel-root").appendChild(listEl);

    const root = win.document.getElementById("channel-root");

    // Update globalCfg to use channelListCfg so that MathLive editor has access to all channels
    win.globalCfg = channelListCfg;

    // ✅ CRITICAL: Store parentWindow reference in popup window globals so cellEdited handler can access it
    win.globalParentWindow = parentWindow;
    console.log(
      "[showChannelListWindow] Stored parentWindow in popup globals:",
      {
        parentWindow: !!parentWindow,
        globalParentWindow: !!win.globalParentWindow,
        closed: parentWindow?.closed,
      }
    );

    // ✅ FIX: Pass Tabulator to createChannelList directly instead of trying to import
    // This avoids the MIME type error from trying to import modules in a popup context

    try {
      // Wait a moment for Tabulator to be available globally in the child window
      if (typeof win.Tabulator === "undefined") {
        console.warn(
          "[showChannelListWindow] Tabulator not available yet, waiting..."
        );
        setTimeout(() => {
          if (typeof win.Tabulator !== "undefined") {
            // Call createChannelList directly with the child window's Tabulator instance
            createChannelList(
              channelListCfg,
              (type, fromIdx, toIdx, color) => {
                // Notify parent of changes via postMessage
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage(
                    {
                      source: "ChannelListWindow",
                      type: "channel_update",
                      payload: { channelType: type, fromIdx, toIdx, color },
                    },
                    "*"
                  );
                }
              },
              win.Tabulator, // ✅ Pass the child window's Tabulator
              win.document, // ✅ Use child window's document
              root, // ✅ Append to child window's root
              parentWindow // ✅ FIX: Pass explicit parent window reference
            );
            console.log(
              "[showChannelListWindow] ChannelList initialized with child Tabulator"
            );
          } else {
            console.error(
              "[showChannelListWindow] Tabulator still not available after timeout"
            );
          }
        }, 500);
      } else {
        // Tabulator is already available
        createChannelList(
          channelListCfg,
          (type, fromIdx, toIdx, color) => {
            // Notify parent of changes via postMessage
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(
                {
                  source: "ChannelListWindow",
                  type: "channel_update",
                  payload: { channelType: type, fromIdx, toIdx, color },
                },
                "*"
              );
            }
          },
          win.Tabulator, // ✅ Pass the child window's Tabulator
          win.document, // ✅ Use child window's document
          root, // ✅ Append to child window's root
          parentWindow // ✅ FIX: Pass explicit parent window reference
        );
        console.log(
          "[showChannelListWindow] ChannelList initialized with child Tabulator"
        );
      }
    } catch (err) {
      console.error(
        "[showChannelListWindow] Failed to initialize ChannelList:",
        err
      );
    }
  }

  // ✅ Listen for theme changes from parent
  win.addEventListener("message", (event) => {
    // Only accept from parent
    if (event.source !== window) return;

    const { source, type, payload } = event.data || {};

    if (source === "MainApp" && type === "theme_change") {
      const { theme, colors } = payload;
      console.log(`[ChannelList] Received theme change: ${theme}`);

      // Apply theme
      win.document.documentElement.setAttribute("data-theme", theme);

      // Apply CSS variables if needed
      if (colors) {
        Object.entries(colors).forEach(([key, value]) => {
          win.document.documentElement.style.setProperty(key, value);
        });
      }
    }
  });

  return true;
}
