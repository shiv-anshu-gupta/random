// File: src/services/computedChannels/validators.js
// Single Responsibility: Validate inputs

import { processEquationInput } from "../../utils/channelNameExtractor.js";

/**
 * Validate expression payload from MathLive editor
 * Also extracts channel name if provided in format: "name = expression"
 */
export const validateExpressionPayload = (payload) => {
  const { expression, unit } = payload || {};

  if (!expression) {
    return {
      valid: false,
      error: "No expression provided for computed channel",
    };
  }

  // ✅ NEW: Process equation to extract channel name and math expression
  const processed = processEquationInput(expression);

  if (!processed.valid) {
    console.warn("[Validator] ⚠️ Name validation failed:", processed.error);
    return {
      valid: false,
      error: processed.error,
      channelName: null,
      mathExpression: processed.mathExpression,
    };
  }

  return {
    valid: true,
    channelName: processed.channelName,
    mathExpression: processed.mathExpression,
    unit: unit,
  };
};

/**
 * Validate global data availability
 */
export const validateGlobalData = (cfgData, dataObj) => {
  if (!cfgData || !dataObj) {
    return {
      valid: false,
      error: "Global cfg/data not available",
      details: {
        hasGlobalCfg: !!cfgData,
        hasGlobalData: !!dataObj,
      },
    };
  }

  return { valid: true };
};

/**
 * Validate sample data
 */
export const validateSampleData = (analogArray) => {
  const sampleCount = analogArray?.[0]?.length || 0;

  if (!sampleCount) {
    return {
      valid: false,
      error: "No analog samples available",
    };
  }

  return { valid: true, sampleCount };
};

/**
 * Validate expression syntax
 */
export const validateExpressionSyntax = (mathJsExpr) => {
  try {
    math.compile(mathJsExpr);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
};
