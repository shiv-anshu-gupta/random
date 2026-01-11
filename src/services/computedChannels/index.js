// File: src/services/computedChannels/index.js
// Single Responsibility: Orchestrate the entire flow

import {
  validateExpressionPayload,
  validateGlobalData,
  validateSampleData,
  validateExpressionSyntax,
} from "./validators.js";
import {
  extractDataSources,
  convertToTransferableBuffers,
  serializeChannelMetadata,
  buildWorkerTask,
} from "./dataPreparation.js";
import {
  convertResultsToArray,
  calculateStatistics,
  buildChannelData,
} from "./resultProcessing.js";
import {
  saveToGlobalData,
  saveToCfg,
  updateStateStore,
} from "./stateUpdate.js";
import {
  dispatchChannelSavedEvent,
  notifyChildWindowSuccess,
  notifyChildWindowError,
  notifyChildWindowStateUpdated,
} from "./eventHandling.js";
import {
  createComputedChannelWorker,
  buildWorkerMessageHandler,
  buildWorkerErrorHandler,
  sendTaskToWorker,
} from "./workerManagement.js";
import { convertLatexToMathJs } from "./expressionConversion.js";

/**
 * Main orchestrator: Handles computed channel evaluation end-to-end
 * This replaces the entire evaluateComputedChannel case block
 */
export const handleComputedChannelEvaluation = async (payload) => {
  try {
    // 1️⃣ VALIDATE INPUT & EXTRACT CHANNEL NAME
    const validation1 = validateExpressionPayload(payload);
    if (!validation1.valid) {
      console.warn("[ComputedChannel]", validation1.error);
      return;
    }
    const { expression, unit } = payload;
    const { channelName, mathExpression } = validation1; // ← Extract from validator

    // 2️⃣ VALIDATE DATA AVAILABILITY
    const cfgData =
      window.globalCfg || (window.opener && window.opener.globalCfg);
    const dataObj =
      window.globalData || (window.opener && window.opener.globalData);

    const validation2 = validateGlobalData(cfgData, dataObj);
    if (!validation2.valid) {
      console.error(
        "[ComputedChannel]",
        validation2.error,
        validation2.details
      );
      return;
    }

    // 3️⃣ EXTRACT & VALIDATE DATA
    const { analogArray, digitalArray, sampleCount } = extractDataSources(
      dataObj,
      cfgData
    );

    const validation3 = validateSampleData(analogArray);
    if (!validation3.valid) {
      console.error("[ComputedChannel]", validation3.error);
      return;
    }

    // 4️⃣ CONVERT EXPRESSION FORMAT
    const mathJsExpr = convertLatexToMathJs(expression);

    // 5️⃣ VALIDATE EXPRESSION SYNTAX
    const validation4 = validateExpressionSyntax(mathJsExpr);
    if (!validation4.valid) {
      console.error(
        "[ComputedChannel] Invalid expression syntax:",
        validation4.error
      );
      return;
    }

    // 6️⃣ PREPARE DATA FOR WORKER
    // ✅ OPTIMIZATION: Only convert channels used in the expression
    const { analogBuffers, digitalBuffers, transferableObjects } =
      convertToTransferableBuffers(
        analogArray,
        digitalArray,
        mathJsExpr,
        cfgData
      );
    const { analogChannelsMeta, digitalChannelsMeta } =
      serializeChannelMetadata(cfgData);
    const workerTask = buildWorkerTask(
      mathJsExpr,
      analogBuffers,
      digitalBuffers,
      analogChannelsMeta,
      digitalChannelsMeta,
      sampleCount,
      analogArray,
      digitalArray
    );

    console.log("[ComputedChannel] ⚡ Starting worker evaluation...");

    // 7️⃣ CREATE WORKER & SETUP HANDLERS
    const worker = createComputedChannelWorker();
    const startTime = performance.now();

    // Import progress functions
    const { showProgress, updateProgress, hideProgress } = await import(
      "../../components/ProgressBar.js"
    );

    // Show progress bar immediately
    showProgress(
      1,
      `Processing: ${channelName || expression.substring(0, 20)}...`
    );

    const onProgress = (percent, processed, total) => {
      console.log(`[Worker] 📊 Progress: ${percent}% (${processed}/${total})`);
      // Update UI progress bar
      updateProgress(
        Math.max(1, percent),
        `Processing: ${percent}% (${processed}/${total})`
      );
    };

    const onSuccess = (
      resultsBuffer,
      resultCount,
      elapsedMs,
      unit,
      expression,
      cfgData
    ) => {
      console.log(`[ComputedChannel] ✅ Worker completed in ${elapsedMs}ms`);
      // Hide progress bar
      hideProgress();

      // Process results
      const results = convertResultsToArray(resultsBuffer);
      const stats = calculateStatistics(results);
      const channelData = buildChannelData(
        results,
        expression,
        mathJsExpr,
        unit,
        stats,
        channelName // ← NEW: Pass extracted channel name
      );

      // Update state
      saveToGlobalData(channelData);
      saveToCfg(channelData, cfgData);
      updateStateStore(channelData);

      // Dispatch events
      dispatchChannelSavedEvent(channelData, expression, unit, stats, results);
      notifyChildWindowSuccess(
        channelData.name,
        resultCount,
        unit,
        stats,
        elapsedMs
      );

      // ✅ Notify child window to update Tabulator with new computed channel
      notifyChildWindowStateUpdated(cfgData.computedChannels);

      console.log("[ComputedChannel] ✅ Channel saved and events dispatched");
    };

    const onError = (message) => {
      console.error("[ComputedChannel] ❌ Error:", message);
      // Hide progress bar on error
      hideProgress();
      notifyChildWindowError(message);
    };

    // Setup message and error handlers
    const messageHandler = buildWorkerMessageHandler(
      worker,
      startTime,
      unit,
      expression,
      cfgData,
      onProgress,
      onSuccess,
      onError
    );

    const errorHandler = buildWorkerErrorHandler(worker, onError);

    worker.onmessage = messageHandler;
    worker.onerror = errorHandler;

    // 8️⃣ SEND TASK TO WORKER
    sendTaskToWorker(worker, workerTask, transferableObjects);
    console.log("[ComputedChannel] ✅ Task sent to worker (zero-copy)");
  } catch (error) {
    console.error("[ComputedChannel] ❌ Unexpected error:", error);
  }
};
