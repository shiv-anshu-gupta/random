// File: src/services/computedChannels/dataPreparation.js
// Single Responsibility: Convert and prepare data for worker

/**
 * Extract and validate data sources
 */
export const extractDataSources = (dataObj, cfgData) => {
  const analogArray = Array.isArray(dataObj?.analogData)
    ? dataObj.analogData
    : [];
  const digitalArray = Array.isArray(dataObj?.digitalData)
    ? dataObj.digitalData
    : [];

  return {
    analogArray,
    digitalArray,
    sampleCount: analogArray?.[0]?.length || 0,
  };
};

/**
 * Extract channel names used in the expression
 * @param {string} mathJsExpr - The mathematical expression
 * @returns {Set<string>} Set of channel identifiers used in the expression
 */
const extractUsedChannelNames = (mathJsExpr) => {
  const usedChannels = new Set();
  // Match valid variable names: letters, numbers, underscores
  // This extracts all identifiers from the expression
  const tokens = mathJsExpr.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];
  tokens.forEach((token) => {
    // Filter out Math.js functions and constants
    const mathJsFunctions = new Set([
      "sin",
      "cos",
      "tan",
      "sqrt",
      "pow",
      "abs",
      "log",
      "exp",
      "min",
      "max",
      "sum",
      "mean",
      "random",
      "floor",
      "ceil",
      "round",
      "pi",
      "e",
    ]);
    if (!mathJsFunctions.has(token)) {
      usedChannels.add(token);
    }
  });
  return usedChannels;
};

/**
 * Convert arrays to ArrayBuffers (transferable objects)
 * ✅ OPTIMIZATION: Only convert channels that are used in the expression
 * This reduces memory copy from ~300MB (all 599 channels) to ~1-5MB (only used channels)
 */
export const convertToTransferableBuffers = (
  analogArray,
  digitalArray,
  mathJsExpr = "",
  cfgData = null
) => {
  const analogBuffers = [];
  const digitalBuffers = [];
  const transferableObjects = [];

  // Extract used channels if expression is provided
  const usedChannels = mathJsExpr
    ? extractUsedChannelNames(mathJsExpr)
    : new Set();
  const shouldCheckUsage = mathJsExpr && cfgData; // Only optimize if we have both expression and config

  // Convert analog channels (only used ones if optimization is enabled)
  for (let i = 0; i < analogArray.length; i++) {
    let shouldInclude = true;

    if (shouldCheckUsage) {
      // Get channel identifier
      const channel = cfgData.analogChannels?.[i];
      const channelId = channel?.id || `a${i}`;
      const shortId = `a${i}`;

      // Only include if used in expression
      shouldInclude = usedChannels.has(channelId) || usedChannels.has(shortId);
    }

    if (shouldInclude) {
      const buffer = new Float64Array(analogArray[i]).buffer;
      analogBuffers.push(buffer);
      transferableObjects.push(buffer);
    } else {
      analogBuffers.push(null); // Placeholder for unused channels
    }
  }

  // Convert digital channels (only used ones if optimization is enabled)
  for (let i = 0; i < digitalArray.length; i++) {
    let shouldInclude = true;

    if (shouldCheckUsage) {
      // Get channel identifier
      const channel = cfgData.digitalChannels?.[i];
      const channelId = channel?.id || `d${i}`;
      const shortId = `d${i}`;

      // Only include if used in expression
      shouldInclude = usedChannels.has(channelId) || usedChannels.has(shortId);
    }

    if (shouldInclude) {
      const buffer = new Float64Array(digitalArray[i]).buffer;
      digitalBuffers.push(buffer);
      transferableObjects.push(buffer);
    } else {
      digitalBuffers.push(null); // Placeholder for unused channels
    }
  }

  const channelsConverted = transferableObjects.length;
  const totalChannels = analogArray.length + digitalArray.length;
  console.log(
    `[DataPreparation] ✅ Converted ${channelsConverted}/${totalChannels} channels (${Math.round(
      (channelsConverted / totalChannels) * 100
    )}%)`
  );

  return {
    analogBuffers,
    digitalBuffers,
    transferableObjects,
  };
};

/**
 * Extract and serialize channel metadata
 */
export const serializeChannelMetadata = (cfgData) => {
  const analogChannelsMeta = (cfgData?.analogChannels || []).map((ch) => ({
    id: ch.id,
    ph: ch.ph,
    units: ch.units,
  }));

  const digitalChannelsMeta = (cfgData?.digitalChannels || []).map((ch) => ({
    id: ch.id,
    ph: ch.ph,
    units: ch.units,
  }));

  return {
    analogChannelsMeta,
    digitalChannelsMeta,
  };
};

/**
 * Build worker task payload
 */
export const buildWorkerTask = (
  mathJsExpr,
  analogBuffers,
  digitalBuffers,
  analogChannelsMeta,
  digitalChannelsMeta,
  sampleCount,
  analogArray,
  digitalArray
) => {
  return {
    mathJsExpr,
    analogBuffers,
    digitalBuffers,
    analogChannels: analogChannelsMeta,
    digitalChannels: digitalChannelsMeta,
    sampleCount,
    analogCount: analogArray.length,
    digitalCount: digitalArray.length,
  };
};
