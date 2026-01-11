/**
 * Computed Channel Storage Manager
 * Persists computed channels to localStorage for persistence across page reloads
 */

const STORAGE_KEY = "COMTRADE_COMPUTED_CHANNELS";
const STORAGE_METADATA_KEY = "COMTRADE_COMPUTED_METADATA";

/**
 * Save computed channels to localStorage with merge (not replace!)
 * @param {Array} computedData - Array of computed channel objects (cfg.computedChannels metadata)
 * @param {Object|Array} dataOrMetadata - Either data.computedData array (with actual values) or metadata object
 * @param {Object} metadata - Optional metadata to save (if dataOrMetadata is an array)
 * @returns {boolean} Success status
 */
export function saveComputedChannelsToStorage(
  computedData,
  dataOrMetadata = {},
  metadata = {}
) {
  try {
    if (!Array.isArray(computedData)) {
      throw new Error("computedData must be an array");
    }

    // ✅ Extract data array and metadata from parameters
    let dataComputedData = [];
    let metadataToSave = metadata;

    if (Array.isArray(dataOrMetadata)) {
      // ✅ Called with (cfg.computedChannels, data.computedData, metadata)
      dataComputedData = dataOrMetadata;
      metadataToSave = metadata;
    } else {
      // ✅ Called with (cfg.computedChannels, metadata)
      metadataToSave = dataOrMetadata;
    }

    // ✅ LOG INPUT PARAMETERS
    console.log("[Storage] saveComputedChannelsToStorage received:");
    console.log("[Storage]   computedData count:", computedData.length);
    console.log(
      "[Storage]   First cfg item data field:",
      computedData[0]?.data?.length || "NO DATA FIELD"
    );
    console.log("[Storage]   dataComputedData count:", dataComputedData.length);
    console.log("[Storage]   First data item:", dataComputedData[0]?.id);

    // ✅ STEP 1: Load existing channels from localStorage
    const existingData = loadComputedChannelsFromStorage();

    console.log(
      `[Storage] 📂 Loaded ${existingData.length} existing channels from localStorage`
    );

    // ✅ STEP 2: Merge new channels with existing (avoiding duplicates)
    const mergedData = [...existingData];

    computedData.forEach((newChannel) => {
      // Check if channel already exists (by name, id, or expression)
      const existingIndex = mergedData.findIndex(
        (ch) =>
          ch.name === (newChannel.name || newChannel.id) ||
          ch.id === newChannel.id ||
          ch.expression === (newChannel.expression || newChannel.equation)
      );

      // ✅ MERGE WITH DATA: Find corresponding entry in data.computedData to get actual values
      const dataEntry = dataComputedData.find(
        (d) =>
          d.id === newChannel.id ||
          d.name === newChannel.name ||
          d.equation === newChannel.equation
      );

      console.log(
        `[Storage] Merging channel ${newChannel.name || newChannel.id}:`,
        {
          hasDataInNewChannel: !!newChannel.data,
          dataLengthInNewChannel: newChannel.data?.length || 0,
          foundDataEntry: !!dataEntry,
          dataLengthInDataEntry: dataEntry?.data?.length || 0,
        }
      );

      // ✅ CRITICAL: If dataEntry doesn't have data but newChannel does, keep newChannel's data
      const mergedChannel = {
        ...newChannel,
        ...(dataEntry || {}), // ✅ Use dataEntry if it exists
        // ✅ ENSURE: Preserve critical metadata fields from newChannel (cfg) that define appearance/behavior
        color: dataEntry?.color || newChannel.color, // ✅ Preserve color from cfg if not in data
        unit: dataEntry?.unit || newChannel.unit, // ✅ Preserve unit from cfg
        group: dataEntry?.group || newChannel.group, // ✅ Preserve group from cfg
        type: dataEntry?.type || newChannel.type, // ✅ Preserve type from cfg
        // ✅ ENSURE: If newChannel has data and we're not overriding it, keep it
        data: dataEntry?.data || newChannel.data, // ✅ Prefer dataEntry but fallback to newChannel
      };

      console.log(
        `[Storage] Final merged channel data length: ${
          mergedChannel.data?.length || 0
        }`
      );

      if (existingIndex >= 0) {
        // ✅ UPDATE existing channel
        console.log(
          `[Storage] 🔄 Updating existing channel: ${
            newChannel.name || newChannel.id
          }`
        );
        mergedData[existingIndex] = {
          ...mergedData[existingIndex],
          ...mergedChannel,
        };
      } else {
        // ✅ ADD new channel
        console.log(
          `[Storage] ➕ Adding new channel: ${newChannel.name || newChannel.id}`
        );
        mergedData.push(mergedChannel);
      }
    });

    // ✅ STEP 3: Prepare data for storage (exclude large uPlot references)
    const dataToStore = mergedData.map((channel) => {
      // Ensure data is always numeric array
      let numericData = channel.data;

      console.log(
        `[Storage] Processing channel ${
          channel.name
        }: data type=${typeof numericData}, isArray=${Array.isArray(
          numericData
        )}, length=${numericData?.length || "N/A"}`
      );

      if (!Array.isArray(numericData)) {
        console.log(
          `[Storage] ⚠️ Converting non-array data to empty for ${channel.name}`
        );
        numericData = [];
      } else if (numericData.length > 0 && typeof numericData[0] !== "number") {
        console.log(
          `[Storage] Converting ${numericData.length} non-numeric values for ${channel.name}`
        );
        numericData = numericData.map((v) => {
          const num = parseFloat(v);
          return isNaN(num) ? 0 : num;
        });
      }

      console.log(
        `[Storage] Final data for ${channel.name}: ${numericData.length} samples`
      );

      return {
        id: channel.id, // ✅ FIRST: Stable numeric ID for table S.No.
        name: channel.name || channel.id,
        data: numericData, // ✅ Always numeric array
        unit: channel.unit,
        type: channel.type || "Analog", // ✅ Default to "Analog" not "Computed"
        group: channel.group || "G0", // ✅ Default to "G0" not "Computed"
        expression: channel.expression || channel.equation,
        mathJsExpression: channel.mathJsExpression, // ✅ Include for complete metadata
        color: channel.color || "#4ECDC4", // ✅ Fallback color
        min: channel.min,
        max: channel.max,
        samples: numericData.length,
      };
    });

    // ✅ STEP 4: Save merged data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
    localStorage.setItem(
      STORAGE_METADATA_KEY,
      JSON.stringify({
        ...metadata,
        savedAt: new Date().toISOString(),
        channelCount: dataToStore.length,
      })
    );

    console.log(
      `✅ Saved ${dataToStore.length} computed channels to localStorage (${existingData.length} existing + ${computedData.length} new)`
    );
    console.log(
      "[Storage] Detailed save:",
      dataToStore.map((ch) => ({
        id: ch.id,
        name: ch.name,
        samples: ch.samples,
        dataLength: ch.data ? ch.data.length : 0,
        color: ch.color,
        group: ch.group,
        expression: ch.expression,
        hasFirstValue: ch.data && ch.data.length > 0 ? ch.data[0] : undefined,
      }))
    );
    return true;
  } catch (error) {
    console.error("[Storage] Error saving computed channels:", error);
    return false;
  }
}

/**
 * Append a single computed channel to localStorage (convenience helper)
 * @param {Object} channelData - Single channel object
 * @returns {boolean} Success status
 */
export function appendComputedChannelToStorage(channelData) {
  try {
    // Load existing channels
    const existingChannels = loadComputedChannelsFromStorage();

    // Check for duplicates
    const isDuplicate = existingChannels.some(
      (ch) =>
        ch.name === (channelData.name || channelData.id) ||
        ch.id === channelData.id
    );

    if (isDuplicate) {
      console.log(
        `[Storage] 🔄 Channel already exists: ${channelData.name}, updating instead`
      );
      // Update existing
      const updatedChannels = existingChannels.map((ch) =>
        ch.name === (channelData.name || channelData.id) ||
        ch.id === channelData.id
          ? { ...ch, ...channelData }
          : ch
      );
      return saveComputedChannelsToStorage(updatedChannels);
    }

    // Append new channel
    const updatedChannels = [...existingChannels, channelData];
    return saveComputedChannelsToStorage(updatedChannels);
  } catch (error) {
    console.error("[Storage] Error appending channel:", error);
    return false;
  }
}

/**
 * Load computed channels from localStorage
 * @returns {Array} Array of computed channel objects or empty array if none found
 */
export function loadComputedChannelsFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log("[Storage] No computed channels found in localStorage");
      return [];
    }

    const computedData = JSON.parse(stored);
    const metadata = JSON.parse(
      localStorage.getItem(STORAGE_METADATA_KEY) || "{}"
    );

    console.log(
      `✅ Loaded ${computedData.length} computed channels from localStorage (saved at ${metadata.savedAt})`
    );

    return Array.isArray(computedData) ? computedData : [];
  } catch (error) {
    console.error("[Storage] Error loading computed channels:", error);
    return [];
  }
}

/**
 * Clear all computed channels from localStorage
 * @returns {boolean} Success status
 */
export function clearComputedChannelsFromStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_METADATA_KEY);
    console.log("✅ Cleared computed channels from localStorage");
    return true;
  } catch (error) {
    console.error("[Storage] Error clearing computed channels:", error);
    return false;
  }
}

/**
 * Get storage metadata
 * @returns {Object} Metadata object or empty object if none
 */
export function getComputedChannelStorageMetadata() {
  try {
    const metadata = localStorage.getItem(STORAGE_METADATA_KEY);
    return metadata ? JSON.parse(metadata) : {};
  } catch (error) {
    console.error("[Storage] Error reading metadata:", error);
    return {};
  }
}

/**
 * Check if stored computed channels exist
 * @returns {boolean} True if computed channels are stored
 */
export function hasStoredComputedChannels() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch (error) {
    return false;
  }
}
