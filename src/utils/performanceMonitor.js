/**
 * @module performanceMonitor
 * @description
 * High-performance diagnostic tool for tracing state changes and chart updates.
 * Batches all DOM updates to RAF to avoid blocking the main thread.
 * Used to diagnose performance bottlenecks in Tabulator -> ChartManager pipeline.
 */

const DEBUG_ENABLED = true; // Set to false to disable all diagnostics
const BATCH_DOM_UPDATES = true; // Use RAF batching for DOM updates
const SLOW_THRESHOLD_MS = 30; // Log warnings if operation takes > 30ms

/**
 * In-memory circular buffer of recent operations (doesn't touch DOM until needed)
 */
const operationLog = {
  maxSize: 100,
  entries: [],
  add(operation) {
    if (!DEBUG_ENABLED) return;

    this.entries.push({
      timestamp: performance.now(),
      ...operation,
    });

    // Keep only last N entries
    if (this.entries.length > this.maxSize) {
      this.entries.shift();
    }
  },
  clear() {
    this.entries = [];
  },
  getAll() {
    return [...this.entries];
  },
};

/**
 * Phase tracking for the entire message processing pipeline
 */
class PhaseTracker {
  constructor(name) {
    this.name = name;
    this.phases = {};
  }

  mark(phaseName) {
    if (!this.phases[phaseName]) {
      this.phases[phaseName] = { start: 0, end: 0, duration: 0 };
    }
    this.phases[phaseName].start = performance.now();
  }

  end(phaseName) {
    if (!this.phases[phaseName]) return;
    this.phases[phaseName].end = performance.now();
    this.phases[phaseName].duration =
      this.phases[phaseName].end - this.phases[phaseName].start;
  }

  getReport() {
    const totalDuration = Object.values(this.phases).reduce(
      (sum, p) => sum + p.duration,
      0
    );
    const phases = Object.entries(this.phases).map(([name, data]) => ({
      name,
      duration: data.duration.toFixed(2),
      percent: ((data.duration / totalDuration) * 100).toFixed(1),
    }));

    return {
      name: this.name,
      totalDuration: totalDuration.toFixed(2),
      phases,
      isSlow: totalDuration > SLOW_THRESHOLD_MS,
    };
  }
}

/**
 * Log operation with automatic buffering (memory-safe, no DOM blocker)
 */
function trackOperation(operation) {
  if (!DEBUG_ENABLED) return;

  operationLog.add(operation);

  // Only log to console if it was slow
  if (operation.duration > SLOW_THRESHOLD_MS) {
    const emoji =
      operation.duration > 100 ? "🔴" : operation.duration > 50 ? "🟡" : "🟢";
    console.warn(
      `${emoji} [${operation.type}] ${
        operation.description
      }: ${operation.duration.toFixed(2)}ms`
    );
  }
}

/**
 * Check if a color change is taking too long
 * Diagnoses if problem is in: Tabulator -> Main -> ChartManager -> uPlot
 */
function analyzeColorUpdateFlow(colorChangeTime) {
  if (colorChangeTime < SLOW_THRESHOLD_MS) return null; // Fast enough

  const analysis = {
    totalTime: colorChangeTime,
    possibleBottlenecks: [],
    recommendations: [],
  };

  if (colorChangeTime > 200) {
    analysis.possibleBottlenecks.push(
      "Full chart recreation (chart.setSeries() failed?)"
    );
    analysis.recommendations.push("Check: Does chart have setSeries() method?");
    analysis.recommendations.push(
      "Check: Is chart._channelIndices properly set?"
    );
  } else if (colorChangeTime > 50) {
    analysis.possibleBottlenecks.push("debugLite.log() DOM updates");
    analysis.possibleBottlenecks.push("chart.redraw() performance");
    analysis.recommendations.push("Disable debugLite.log() in hot path");
    analysis.recommendations.push("Profile: Is redraw(false) still slow?");
  } else {
    analysis.possibleBottlenecks.push("Multiple subscribers triggered");
    analysis.recommendations.push(
      "Check: How many subscriptions fire on color change?"
    );
  }

  return analysis;
}

/**
 * Main diagnostic function to trace entire pipeline
 */
function traceMessageFlow(type) {
  const tracker = new PhaseTracker(`Message: ${type}`);

  return {
    tracker,
    mark(phase) {
      tracker.mark(phase);
    },
    end(phase) {
      tracker.end(phase);
    },
    report() {
      const report = tracker.getReport();

      if (report.isSlow) {
        console.warn(`⚠️ ${report.name}`, {
          totalMs: report.totalDuration,
          phases: report.phases,
        });

        // Find slowest phase
        const slowestPhase = report.phases.reduce((max, p) =>
          parseFloat(p.duration) > parseFloat(max.duration) ? p : max
        );

        console.warn(
          `🎯 Slowest phase: ${slowestPhase.name} (${slowestPhase.duration}ms, ${slowestPhase.percent}%)`
        );
      }

      return report;
    },
  };
}

/**
 * Get all buffered operations for analysis
 */
function getPerformanceReport() {
  return {
    recentOperations: operationLog.getAll(),
    totalLogged: operationLog.entries.length,
    slowOperations: operationLog.entries.filter(
      (e) => e.duration > SLOW_THRESHOLD_MS
    ),
  };
}

/**
 * Reset diagnostics (call after analysis)
 */
function resetDiagnostics() {
  operationLog.clear();
}

export {
  trackOperation,
  traceMessageFlow,
  analyzeColorUpdateFlow,
  getPerformanceReport,
  resetDiagnostics,
  DEBUG_ENABLED,
  SLOW_THRESHOLD_MS,
};
