/**
 * uPlot Plugin: Vertical Line & Crosshair Points
 * FIXED: Prevents selection box during drag using event capture phase
 * FIXED: Uses getBoundingClientRect + clientX for accurate coordinate math
 */
import { crosshairColors } from "../utils/constants.js";
import { getNearestIndex } from "../utils/helpers.js";
import { debounce } from "../utils/computedChannelOptimization.js";

/**
 * Convert a mouse event to the correct X value relative to the uPlot overlay.
 * Uses getBoundingClientRect() + clientX instead of e.offsetX to handle scrolling,
 * CSS transforms, and container positioning correctly.
 * @param {uPlot} u - The uPlot instance
 * @param {MouseEvent} e - The mouse event
 * @returns {number} The X value in data coordinates
 */
function getEventXValue(u, e) {
  const over = u.over;
  if (!over) return u.posToVal(e.offsetX, "x"); // fallback for safety
  
  // Get precise coordinates relative to the overlay using getBoundingClientRect
  // This accounts for scrolling, CSS transforms, and container positioning
  const rect = over.getBoundingClientRect();
  const x = e.clientX - rect.left;
  
  // Convert pixel position to data value
  return u.posToVal(x, "x");
}

export default function verticalLinePlugin(
  verticalLinesXState,
  getCharts = null,
  options = {}
) {
  let isDragging = false;
  let draggedLineIndex = null;
  let overlayRef = null;
  let unsubscribe = null;
  const lineColors = options.lineColors || crosshairColors;
  const lineWidth = options.lineWidth || 4;
  const pointRadius = options.pointRadius || 5;
  const labelFormatter =
    options.labelFormatter ||
    ((color) => color.charAt(0).toUpperCase() + color.slice(1));

  function isHoveringLine(u, xVal, hoverRadius) {
    const lines = verticalLinesXState.asArray();
    return lines.some((xData) => Math.abs(xVal - xData) < hoverRadius);
  }

  return {
    hooks: {
      init: [
        (u) => {
          const overlay = u.over;
          overlayRef = overlay;

          // ✅ Debounce the update function to prevent multiple rapid calls
          const debouncedDeltaUpdate = debounce(async () => {
            if (getCharts) {
              const charts = getCharts();
              const { collectChartDeltas } = await import(
                "../utils/calculateDeltas.js"
              );
              const allDeltaData = [];

              // ✅ Collect all chart deltas in ONE batch
              for (const chart of charts) {
                try {
                  const chartDeltas = collectChartDeltas(
                    verticalLinesXState.asArray(),
                    chart,
                    "microseconds"
                  );
                  if (chartDeltas.length > 0) {
                    allDeltaData.push(...chartDeltas);
                  }
                } catch (error) {
                  console.error(
                    "[verticalLinePlugin] Error collecting chart deltas:",
                    error
                  );
                }
              }

              if (allDeltaData.length > 0) {
                try {
                  const { deltaWindow } = await import("../main.js");
                  const linesLength =
                    verticalLinesXState?.asArray?.()?.length || 0;
                  if (deltaWindow) {
                    console.log(
                      "[verticalLinePlugin] 🔄 Calling deltaWindow.update() with debounce"
                    );
                    deltaWindow.update(allDeltaData, linesLength);
                  }
                } catch (e) {
                  console.error(
                    "[verticalLinePlugin] Error updating delta window:",
                    e
                  );
                }
              }
            }
          }, 100); // ✅ 100ms debounce to batch rapid state changes

          // Subscribe to state changes with debounced update
          if (
            verticalLinesXState &&
            typeof verticalLinesXState.subscribe === "function"
          ) {
            unsubscribe = verticalLinesXState.subscribe(async () => {
              console.log(
                "[verticalLinePlugin] Subscription triggered, calling debounced update"
              );
              debouncedDeltaUpdate();
            });
          }

          // ✅ CRITICAL: Attach handlers in CAPTURE phase (true) to run BEFORE uPlot's handlers
          const handleMouseDown = (e) => {
            if (!u || !u.scales || !u.data) return;

            const lines = verticalLinesXState.asArray();
            const xVal = getEventXValue(u, e);
            // Use the same radius as cursor display for consistent hover detection
            const hoverRadius = (u.scales.x.max - u.scales.x.min) * 0.045;

            for (let idx = 0; idx < lines.length; idx++) {
              const xData = lines[idx];
              if (Math.abs(xVal - xData) < hoverRadius) {
                // ✅ Set drag state BEFORE consuming event
                isDragging = true;
                draggedLineIndex = idx;
                console.log(
                  `[verticalLinePlugin] 🎯 mousedown: Starting drag of line ${idx} at xVal=${xVal.toFixed(2)}`
                );

                // ✅ STOP event from reaching uPlot's handlers
                e.stopPropagation();
                e.stopImmediatePropagation();
                e.preventDefault();

                u.redraw();
                return;
              }
            }
          };

          const handleMouseMove = (e) => {
            if (!u || !u.scales) return;

            const xVal = getEventXValue(u, e);
            // Use same radius for consistency with mousedown detection
            const hoverRadius = (u.scales.x.max - u.scales.x.min) * 0.045;
            const isHovering = isHoveringLine(u, xVal, hoverRadius);

            overlay.style.cursor = isHovering ? "ew-resize" : "default";

            // ✅ SUPPRESS uPlot's default crosshair cursor/behavior when hovering OR dragging
            // This ensures uPlot's own cursor logic doesn't fire and obscure our custom line
            if (isHovering || isDragging) {
              e.stopPropagation();
              e.stopImmediatePropagation();
              e.preventDefault();
            }

            if (isDragging && draggedLineIndex !== null) {
              // ✅ Update dragged line position (event already stopped above)
              // Validate that draggedLineIndex is still within bounds
              const current = verticalLinesXState.asArray();
              if (draggedLineIndex < 0 || draggedLineIndex >= current.length) {
                console.warn(
                  `[verticalLinePlugin] ⚠️ Invalid draggedLineIndex ${draggedLineIndex}, resetting drag`
                );
                isDragging = false;
                draggedLineIndex = null;
                return;
              }

              // ✅ Update state reactively via array assignment to trigger subscriptions
              // This ensures the state change propagates to all subscribers and redraws
              const next = [...current];
              next[draggedLineIndex] = xVal;
              // Direct assignment on reactive state triggers the proxy's set trap
              verticalLinesXState.value = next;
              
              console.log(
                `[verticalLinePlugin] 🔄 mousemove: Dragging line ${draggedLineIndex} to xVal=${xVal.toFixed(2)}`
              );

              // ✅ IMMEDIATELY redraw the current chart being dragged for smooth movement
              u.redraw();

              // Sync with other charts
              if (getCharts) {
                const charts = getCharts();
                (async () => {
                  for (let chart of charts) {
                    if (chart && chart !== u && chart.redraw) {
                      chart.redraw();
                    }
                  }

                  // Collect deltas
                  const { collectChartDeltas } = await import(
                    "../utils/calculateDeltas.js"
                  );
                  const allDeltaData = [];

                  for (const chart of charts) {
                    const chartDeltas = collectChartDeltas(
                      verticalLinesXState.asArray(),
                      chart,
                      "microseconds"
                    );
                    if (chartDeltas.length > 0) {
                      allDeltaData.push(...chartDeltas);
                    }
                  }

                  const linesArray =
                    verticalLinesXState?.value || verticalLinesXState || [];
                  const linesLength = Array.isArray(linesArray)
                    ? linesArray.length
                    : 0;

                  // Show drawer whenever vertical lines exist (even if just 1)
                  if (linesLength > 0) {
                    try {
                      const { deltaWindow } = await import("../main.js");
                      if (deltaWindow) {
                        deltaWindow.show(); // Show the drawer when dragging lines
                        deltaWindow.update(allDeltaData, linesLength);
                      }
                    } catch (e) {
                      // Silent fail
                    }
                  }
                })();
              }
            }
          };

          const handleMouseUp = (e) => {
            if (isDragging) {
              console.log(
                `[verticalLinePlugin] 🛑 mouseup on overlay: Ending drag of line ${draggedLineIndex}`
              );
              isDragging = false;
              draggedLineIndex = null;
              overlay.style.cursor = "default";

              // ✅ BLOCK event to prevent unwanted selection
              e.stopPropagation();
              e.stopImmediatePropagation();
              e.preventDefault();
            }
          };

          // ✅ Use CAPTURE phase (true) to intercept events BEFORE uPlot's bubble phase
          overlay.addEventListener("mousedown", handleMouseDown, true);
          overlay.addEventListener("mousemove", handleMouseMove, true);
          overlay.addEventListener("mouseup", handleMouseUp, true);

          overlay.addEventListener(
            "mouseleave",
            () => {
              if (isDragging) {
                isDragging = false;
                draggedLineIndex = null;
                overlay.style.cursor = "default";
              }
            },
            true
          );

          // ✅ Add window-level mouseup in capture phase to ensure drag state is reset
          // even when the mouse is released outside the overlay
          const handleWindowMouseUp = (e) => {
            if (isDragging) {
              console.log(
                `[verticalLinePlugin] 🛑 mouseup on window: Ending drag of line ${draggedLineIndex} (released outside overlay)`
              );
              isDragging = false;
              draggedLineIndex = null;
              overlay.style.cursor = "default";
              
              // ✅ Suppress uPlot's end-of-selection logic to prevent cursor/selection artifacts
              e.stopPropagation();
              e.stopImmediatePropagation();
              e.preventDefault();
            }
          };
          window.addEventListener("mouseup", handleWindowMouseUp, true);
          
          // Store reference for cleanup in destroy hook
          overlayRef._handleWindowMouseUp = handleWindowMouseUp;
        },
      ],
      draw: [
        (u) => {
          if (!verticalLinesXState) return;
          if (!u.data || !u.data[0] || u.data[0].length === 0) return;

          const ctx = u.ctx;
          const { top, height } = u.bbox;

          if (!top || !height || !ctx) return;

          const lines =
            typeof verticalLinesXState.asArray === "function"
              ? verticalLinesXState.asArray()
              : Array.isArray(verticalLinesXState)
              ? verticalLinesXState
              : verticalLinesXState.value || [];

          ctx.save();
          ctx.lineWidth = lineWidth;

          lines.forEach((xData, idx) => {
            try {
              const nearestIdx = getNearestIndex(u.data[0], xData);

              if (
                !Number.isFinite(nearestIdx) ||
                nearestIdx < 0 ||
                nearestIdx >= u.data[0].length
              ) {
                return;
              }

              // Draw line at EXACT xData position, not rounded to nearest index
              const xPos = u.valToPos(xData, "x", true);
              const color = lineColors[idx % lineColors.length];

              // Draw vertical line
              ctx.strokeStyle = color;
              ctx.globalAlpha = 1;
              ctx.beginPath();
              ctx.moveTo(xPos, top);
              ctx.lineTo(xPos, top + height);
              ctx.stroke();

              // Draw crosshair points
              u.data.slice(1).forEach((series, seriesIdx) => {
                const actualIdx = seriesIdx + 1;
                if (!u.series[actualIdx]) return;

                const interpolatedValue = getInterpolatedValue(
                  u.data[0],
                  series,
                  xData,
                  nearestIdx
                );

                const yPos = u.valToPos(interpolatedValue, "y", true);
                ctx.beginPath();
                ctx.arc(xPos, yPos, pointRadius, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.globalAlpha = 1;
                ctx.fill();
              });

              // Draw label
              ctx.font = "bold 12px Arial";
              ctx.fillStyle = color;
              ctx.globalAlpha = 1;
              ctx.fillText(labelFormatter(color), xPos + 5, u.bbox.top + 15);
            } catch (err) {
              console.error(
                "[verticalLinePlugin] Error drawing line:",
                err.message
              );
            }
          });
          ctx.restore();
        },
      ],
      destroy: [
        (u) => {
          if (unsubscribe) unsubscribe();
          if (overlayRef) {
            // Clean up window-level mouseup listener
            if (overlayRef._handleWindowMouseUp) {
              window.removeEventListener("mouseup", overlayRef._handleWindowMouseUp, true);
            }
            overlayRef.replaceWith(overlayRef.cloneNode(true));
          }
        },
      ],
    },
  };
}

// Helper function for value interpolation
function getInterpolatedValue(xData, yData, targetX, nearestIdx) {
  if (xData[nearestIdx] === targetX) {
    return yData[nearestIdx];
  }

  let idx1 = nearestIdx;
  let idx2 = nearestIdx;

  if (targetX > xData[nearestIdx] && nearestIdx < xData.length - 1) {
    idx2 = nearestIdx + 1;
  } else if (targetX < xData[nearestIdx] && nearestIdx > 0) {
    idx1 = nearestIdx - 1;
    idx2 = nearestIdx;
  }

  const x1 = xData[idx1];
  const x2 = xData[idx2];
  const y1 = yData[idx1];
  const y2 = yData[idx2];

  if (x1 === x2 || typeof y1 !== "number" || typeof y2 !== "number") {
    return yData[nearestIdx];
  }

  const interpolated = y1 + ((y2 - y1) * (targetX - x1)) / (x2 - x1);
  return interpolated;
}
