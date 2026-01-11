/**
 * CSV Export Utility
 * Exports all channel data (analog, digital, computed, device data) to CSV format
 */

/**
 * Get channel metadata with fallback
 * @param {Object} channel - Channel object
 * @param {string} type - Channel type (analog, digital, computed)
 * @returns {Object} Metadata with equation/scale, unit, etc.
 */
function getChannelMetadata(channel, type = "analog") {
  // For computed channels - try to get from global metadata manager
  if (type === "computed" && window.computedChannelMetadata) {
    const meta = window.computedChannelMetadata.get(channel.name || channel.id);
    if (meta) {
      return {
        equation: meta.equation || "N/A",
        unit: meta.unit || "N/A",
        name: meta.name || channel.name || channel.id || "Unknown",
      };
    }
  }

  // For all channels - use available properties
  const name = channel.name || channel.id || `Channel_${Math.random()}`;
  let equation = "N/A";
  let unit = "N/A";

  if (type === "computed") {
    equation = channel.equation || channel.mathJsExpression || "N/A";
    unit = channel.unit || "N/A";
  } else if (type === "analog") {
    // For analog: show scale and offset as formula
    const scale = channel.scale || "1";
    const offset = channel.offset || "0";
    equation =
      offset !== "0" ? `(Raw * ${scale}) + ${offset}` : `Raw * ${scale}`;
    unit = channel.unit || "N/A";
  } else if (type === "digital") {
    equation = channel.equation || "State";
    unit = channel.unit || "Binary";
  }

  return { equation, unit, name };
}

/**
 * Export ALL channels (analog, digital, computed) to CSV with complete metadata
 * Format: Time, Channel_1_Equation, Channel_1_Data, Channel_1_Unit, Channel_2_Equation, ...
 * @param {Object} data - Data object with analog, digital, computedData arrays
 * @param {string} filename - Optional filename (default: "all-channels.csv")
 */
export function exportAllChannelsAsCSV(data, filename = "all-channels.csv") {
  try {
    if (!data.time || data.time.length === 0) {
      alert("❌ No time data available");
      return;
    }

    // Build CSV with inline metadata format
    const rows = [];
    const headers = ["Time"];
    const channelInfo = []; // Store: {data, meta, type}

    // Add analog channels
    if (data.analogData && Array.isArray(data.analogData)) {
      for (let i = 0; i < data.analogData.length; i++) {
        const channel = data.analogData[i];
        const meta = getChannelMetadata(channel, "analog");

        headers.push(`${meta.name}_Equation`);
        headers.push(`${meta.name}_Data`);
        headers.push(`${meta.name}_Unit`);

        channelInfo.push({
          data: channel, // The data array for analog
          meta: meta,
          type: "analog",
          index: i,
        });
      }
    }

    // Add digital channels
    if (data.digitalData && Array.isArray(data.digitalData)) {
      for (let i = 0; i < data.digitalData.length; i++) {
        const channel = data.digitalData[i];
        const meta = getChannelMetadata(channel, "digital");

        headers.push(`${meta.name}_Equation`);
        headers.push(`${meta.name}_Data`);
        headers.push(`${meta.name}_Unit`);

        channelInfo.push({
          data: channel, // The data array for digital
          meta: meta,
          type: "digital",
          index: i,
        });
      }
    }

    // Add computed channels
    if (data.computedData && Array.isArray(data.computedData)) {
      for (const channel of data.computedData) {
        const meta = getChannelMetadata(channel, "computed");

        headers.push(`${meta.name}_Equation`);
        headers.push(`${meta.name}_Data`);
        headers.push(`${meta.name}_Unit`);

        channelInfo.push({
          data: channel,
          meta: meta,
          type: "computed",
        });
      }
    }

    rows.push(headers.join(","));

    // Add data rows
    for (let i = 0; i < data.time.length; i++) {
      const row = [data.time[i]];

      for (const info of channelInfo) {
        const { data: channelData, meta, type } = info;

        // Add equation
        row.push(`"${meta.equation}"`);

        // Add data value - handle different data structures
        let value = "";
        if (type === "computed") {
          value =
            channelData.data && channelData.data[i] !== undefined
              ? channelData.data[i]
              : "";
        } else if (type === "analog" || type === "digital") {
          // For analog/digital, channelData is the array directly
          value = channelData[i] !== undefined ? channelData[i] : "";
        }
        row.push(value);

        // Add unit
        row.push(`"${meta.unit}"`);
      }

      rows.push(row.join(","));
    }

    const csvContent = rows.join("\n");

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const totalChannels =
      (data.analogData?.length || 0) +
      (data.digitalData?.length || 0) +
      (data.computedData?.length || 0);
    console.log(
      `✅ CSV exported: ${filename} (${totalChannels} channels, ${data.time.length} samples)`
    );
  } catch (error) {
    console.error("[CSV Export] Error:", error);
    alert(`❌ CSV export failed: ${error.message}`);
  }
}

/**
 * Export computed channels ONLY to CSV with complete metadata inline
 * Format: Time, Channel_1_Equation, Channel_1_Data, Channel_1_Unit, Channel_2_Equation, Channel_2_Data, Channel_2_Unit, ...
 * @param {Object} data - Data object with computedData array
 * @param {string} filename - Optional filename (default: "computed-channels.csv")
 */
export function exportComputedChannelsAsCSV(
  data,
  filename = "computed-channels.csv"
) {
  try {
    if (!data || !data.computedData || data.computedData.length === 0) {
      alert("❌ No computed channels to export");
      return;
    }

    if (!data.time || data.time.length === 0) {
      alert("❌ No time data available");
      return;
    }

    // Build CSV with inline metadata format
    const rows = [];

    // Build CSV header: Time, Channel_1_Equation, Channel_1_Data, Channel_1_Unit, Channel_2_Equation, ...
    const headers = ["Time"];
    const channelMetas = [];

    for (const channel of data.computedData) {
      const meta = getChannelMetadata(channel, "computed");
      channelMetas.push(meta);

      const channelName = meta.name;
      headers.push(`${channelName}_Equation`);
      headers.push(`${channelName}_Data`);
      headers.push(`${channelName}_Unit`);
    }
    rows.push(headers.join(","));

    // Add data rows
    for (let i = 0; i < data.time.length; i++) {
      const row = [data.time[i]];
      for (let j = 0; j < data.computedData.length; j++) {
        const channel = data.computedData[j];
        const meta = channelMetas[j];

        // Add equation (same for all rows of this channel)
        const equation = meta.equation;
        row.push(`"${equation}"`); // Quote to handle commas in equations

        // Add data value
        const value =
          channel.data && channel.data[i] !== undefined ? channel.data[i] : "";
        row.push(value);

        // Add unit (same for all rows of this channel)
        const unit = meta.unit;
        row.push(`"${unit}"`); // Quote to handle special characters
      }
      rows.push(row.join(","));
    }

    const csvContent = rows.join("\n");

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(
      `✅ CSV exported: ${filename} (${data.computedData.length} channels, ${data.time.length} samples)`
    );
  } catch (error) {
    console.error("[CSV Export] Error:", error);
    alert(`❌ CSV export failed: ${error.message}`);
  }
}
