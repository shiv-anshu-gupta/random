/**
 * @file debugMode.js - Enable/disable debug logging
 * @module debugMode
 * @description
 * Simple utility to enable/disable debug logging for chart operations.
 * Prevents console spam and application freeze during normal operation.
 *
 * Usage:
 * - Enable: localStorage.setItem('DEBUG_CHARTS', '1')
 * - Disable: localStorage.removeItem('DEBUG_CHARTS')
 * - Toggle: window.toggleDebugMode()
 */

/**
 * Check if debug mode is enabled
 * @returns {boolean} True if DEBUG_CHARTS is set in localStorage
 */
export function isDebugMode() {
  return (
    typeof localStorage !== "undefined" &&
    localStorage.getItem("DEBUG_CHARTS") === "1"
  );
}

/**
 * Enable debug logging
 */
export function enableDebugMode() {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("DEBUG_CHARTS", "1");
    console.log("🔧 Debug mode ENABLED - Charts logging is active");
  }
}

/**
 * Disable debug logging
 */
export function disableDebugMode() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("DEBUG_CHARTS");
    console.log("✅ Debug mode DISABLED - Charts logging is silent");
  }
}

/**
 * Toggle debug mode
 * @returns {boolean} New debug mode state
 */
export function toggleDebugMode() {
  if (isDebugMode()) {
    disableDebugMode();
    return false;
  } else {
    enableDebugMode();
    return true;
  }
}

// Expose toggle to window for easy access from console
if (typeof window !== "undefined") {
  window.toggleDebugMode = toggleDebugMode;
  window.enableDebugMode = enableDebugMode;
  window.disableDebugMode = disableDebugMode;
  window.isDebugMode = isDebugMode;

  // Show startup info
  console.log(
    "💡 Tip: Use window.toggleDebugMode() to enable/disable chart debug logging"
  );
}
