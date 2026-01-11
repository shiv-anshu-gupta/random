/**
 * File Grouping Utilities
 * Groups and validates COMTRADE file pairs for multi-file processing
 */

/**
 * Group files into CFG/DAT pairs by base name
 * @param {FileList|File[]} files - Array of files to group
 * @returns {Array} Array of {cfg, dat} pairs
 */
export function groupCfgDatFiles(files) {
  const fileMap = {};

  for (const file of files) {
    const name = file.name.toUpperCase();

    // Extract base name (without extension)
    const match = name.match(/^(.+)\.(CFG|DAT)$/);
    if (!match) {
      console.warn(
        `[groupCfgDatFiles] Skipping non-CFG/DAT file: ${file.name}`
      );
      continue;
    }

    const baseName = match[1];
    const ext = match[2];

    if (!fileMap[baseName]) {
      fileMap[baseName] = {};
    }

    fileMap[baseName][ext] = file;
  }

  // Build pairs, ensuring both CFG and DAT exist
  const pairs = [];
  for (const baseName in fileMap) {
    const pair = fileMap[baseName];
    if (pair.CFG && pair.DAT) {
      pairs.push({
        cfg: pair.CFG,
        dat: pair.DAT,
        baseName,
      });
    } else if (pair.CFG) {
      console.warn(`[groupCfgDatFiles] Missing DAT for CFG: ${baseName}`);
    } else if (pair.DAT) {
      console.warn(`[groupCfgDatFiles] Missing CFG for DAT: ${baseName}`);
    }
  }

  console.log(
    `[groupCfgDatFiles] Created ${pairs.length} file pairs from ${files.length} files`
  );
  return pairs;
}

/**
 * Sort file pairs alphabetically by base name
 * @param {Array} filePairs - Array of {cfg, dat} pairs
 * @returns {Array} Sorted pairs
 */
export function sortFilePairs(filePairs) {
  return [...filePairs].sort((a, b) => {
    const nameA = a.baseName || a.cfg.name;
    const nameB = b.baseName || b.cfg.name;
    return nameA.localeCompare(nameB);
  });
}

/**
 * Separate computed channel files from regular COMTRADE files
 * @param {Array} filePairs - Array of {cfg, dat} pairs
 * @returns {Object} {regular: [], computed: []} arrays
 */
export function separateComputedFiles(filePairs) {
  const regular = [];
  const computed = [];

  for (const pair of filePairs) {
    // Check if CFG file indicates computed channels
    const baseName = (pair.baseName || pair.cfg.name).toUpperCase();

    if (baseName.includes("COMPUTED") || baseName.includes("_CC_")) {
      computed.push(pair);
    } else {
      regular.push(pair);
    }
  }

  console.log(
    `[separateComputedFiles] Regular: ${regular.length}, Computed: ${computed.length}`
  );
  return { regular, computed };
}

/**
 * Validate sample rates across multiple CFG files
 * @param {Array} cfgArray - Array of parsed CFG objects
 * @returns {Object} {isValid: boolean, errors: string[]}
 */
export function validateSampleRates(cfgArray) {
  const errors = [];

  if (cfgArray.length === 0) {
    return { isValid: true, errors: [] };
  }

  const firstSampleRate = cfgArray[0].sample_rate;

  for (let i = 1; i < cfgArray.length; i++) {
    const rate = cfgArray[i].sample_rate;
    if (rate !== firstSampleRate) {
      errors.push(
        `File ${i} has sample rate ${rate} but expected ${firstSampleRate}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
