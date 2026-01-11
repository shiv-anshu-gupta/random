/**
 * Computed Channel Metadata Manager
 * Stores and manages metadata for all computed channels
 * (name, id, equation, color, type, group, etc.)
 */

class ComputedChannelMetadata {
  constructor() {
    // Map to store metadata by channel ID for O(1) lookup
    this.metadataMap = new Map();

    // Array to maintain insertion order
    this.metadataList = [];
  }

  /**
   * Add or update computed channel metadata
   * @param {string} channelId - Unique channel identifier
   * @param {Object} metadata - Channel metadata object
   * @returns {Object} The stored metadata
   */
  set(channelId, metadata) {
    const fullMetadata = {
      id: channelId,
      name: metadata.name || channelId,
      equation: metadata.equation || "",
      latexEquation: metadata.latexEquation || "", // Raw LaTeX from MathLive
      mathJsExpression: metadata.mathJsExpression || "",
      color: metadata.color || "#999",
      type: metadata.type || "Computed",
      group: metadata.group || "Computed",
      unit: metadata.unit || "",
      stats: metadata.stats || {},
      scalingFactor: metadata.scalingFactor || 1,
      createdAt: metadata.createdAt || new Date().toISOString(),
      description: metadata.description || "",
    };

    this.metadataMap.set(channelId, fullMetadata);

    // Update in array or add if new
    const existingIdx = this.metadataList.findIndex((m) => m.id === channelId);
    if (existingIdx >= 0) {
      this.metadataList[existingIdx] = fullMetadata;
    } else {
      this.metadataList.push(fullMetadata);
    }

    return fullMetadata;
  }

  /**
   * Get metadata for a specific channel
   * @param {string} channelId - Channel identifier
   * @returns {Object|null} Channel metadata or null if not found
   */
  get(channelId) {
    return this.metadataMap.get(channelId) || null;
  }

  /**
   * Get all metadata as array
   * @returns {Array} All channel metadata in insertion order
   */
  getAll() {
    return [...this.metadataList];
  }

  /**
   * Get metadata by name (case-insensitive)
   * @param {string} name - Channel name
   * @returns {Object|null} Channel metadata or null
   */
  getByName(name) {
    return (
      this.metadataList.find(
        (m) => m.name.toLowerCase() === name.toLowerCase()
      ) || null
    );
  }

  /**
   * Get all channels in a specific group
   * @param {string} group - Group name
   * @returns {Array} Channels in that group
   */
  getByGroup(group) {
    return this.metadataList.filter((m) => m.group === group);
  }

  /**
   * Delete metadata for a channel
   * @param {string} channelId - Channel identifier
   * @returns {boolean} True if deleted, false if not found
   */
  delete(channelId) {
    const existed = this.metadataMap.delete(channelId);
    if (existed) {
      this.metadataList = this.metadataList.filter((m) => m.id !== channelId);
    }
    return existed;
  }

  /**
   * Check if channel exists
   * @param {string} channelId - Channel identifier
   * @returns {boolean} True if channel exists
   */
  has(channelId) {
    return this.metadataMap.has(channelId);
  }

  /**
   * Get count of all computed channels
   * @returns {number} Total number of channels
   */
  count() {
    return this.metadataMap.size;
  }

  /**
   * Clear all metadata
   */
  clear() {
    this.metadataMap.clear();
    this.metadataList = [];
  }

  /**
   * Export all metadata as JSON
   * @returns {string} JSON string of all metadata
   */
  toJSON() {
    return JSON.stringify(this.metadataList);
  }

  /**
   * Import metadata from JSON
   * @param {string} jsonString - JSON string of metadata
   */
  fromJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data)) {
        this.clear();
        data.forEach((item) => this.set(item.id, item));
      }
    } catch (e) {
      console.error("[ComputedChannelMetadata] Import error:", e.message);
    }
  }
}

// Global instance
export const computedChannelMetadata = new ComputedChannelMetadata();

// Also export the class for testing
export { ComputedChannelMetadata };
