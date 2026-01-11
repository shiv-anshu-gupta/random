// src/utils/autoGroupChannels.js
/**
 * Group analog channels by pattern (Currents, Voltages, Line Voltages, Other).
 * @param {Array} analogChannels - Array of analog channel objects with 'id' and 'unit'.
 * @returns {Array} Array of grouped channel info: { name, indices, colors }
 */
export function autoGroupChannels(analogChannels) {
  const groups = [];
  const patterns = [
    // Your custom naming conventions
    {
      name: "Z-Currents",
      regex: /^Z[1234]$/i,
      colorSet: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
    },
    {
      name: "X-Voltages",
      regex: /^X[123]$/i,
      colorSet: ["#ff7f00", "#ffff33", "#a65628"],
    },

    // New patterns requested
    {
      name: "IK-IM-Currents",
      regex: /^I[KLMO]$/i,
      colorSet: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
    },
    {
      name: "VP-VR-Voltages",
      regex: /^V[PQR]$/i,
      colorSet: ["#ff7f00", "#ffff33", "#a65628"],
    },

    // Standard IEC naming
    {
      name: "Currents",
      regex: /^I[ABC]$/i,
      colorSet: ["#e41a1c", "#377eb8", "#4daf4a"],
    },
    {
      name: "Voltages",
      regex: /^V[ABC]$/i,
      colorSet: ["#984ea3", "#ff7f00", "#ffff33"],
    },

    // Alternative naming (L/R)
    {
      name: "L-Currents",
      regex: /^L[1234]$/i,
      colorSet: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
    },
    {
      name: "R-Voltages",
      regex: /^R[123]$/i,
      colorSet: ["#ff7f00", "#ffff33", "#a65628"],
    },

    // Line notation (IL, UL)
    {
      name: "IL-Currents",
      regex: /^IL[1234]$/i,
      colorSet: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
    },
    {
      name: "UL-Voltages",
      regex: /^UL[123]$/i,
      colorSet: ["#ff7f00", "#ffff33", "#a65628"],
    },

    // Underscore notation (I_A, V_A)
    {
      name: "I_-Currents",
      regex: /^I_[ABCN]$/i,
      colorSet: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
    },
    {
      name: "V_-Voltages",
      regex: /^V_[ABC]$/i,
      colorSet: ["#ff7f00", "#ffff33", "#a65628"],
    },

    // Descriptive naming (CUR_A, VOL_A)
    {
      name: "CUR-Currents",
      regex: /^CUR_[ABCN]$/i,
      colorSet: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3"],
    },
    {
      name: "VOL-Voltages",
      regex: /^VOL_[ABC]$/i,
      colorSet: ["#ff7f00", "#ffff33", "#a65628"],
    },

    // Line Voltages
    {
      name: "Line Voltages",
      regex: /^V(AB|BC|CA)$/i,
      colorSet: ["#a65628", "#f781bf", "#999999"],
    },

    // ===== TESTING: Random Channel Patterns (Max 2 channels per group) =====

    // Group 1: M-Currents
    {
      name: "M-Currents",
      regex: /^M[1234]$/i,
      colorSet: ["#e41a1c", "#377eb8"],
    },

    // Group 2: N-Voltages
    {
      name: "N-Voltages",
      regex: /^N[1234]$/i,
      colorSet: ["#ff7f00", "#ffff33"],
    },

    // Group 3: P-Currents
    {
      name: "P-Currents",
      regex: /^P[1234]$/i,
      colorSet: ["#4daf4a", "#984ea3"],
    },

    // Group 4: Q-Voltages
    {
      name: "Q-Voltages",
      regex: /^Q[1234]$/i,
      colorSet: ["#a65628", "#f781bf"],
    },

    // Group 5: S-Currents
    {
      name: "S-Currents",
      regex: /^S[1234]$/i,
      colorSet: ["#377eb8", "#4daf4a"],
    },

    // Group 6: T-Voltages
    {
      name: "T-Voltages",
      regex: /^T[1234]$/i,
      colorSet: ["#e41a1c", "#ff7f00"],
    },

    // Group 7: U-Currents
    {
      name: "U-Currents",
      regex: /^U[1234]$/i,
      colorSet: ["#984ea3", "#a65628"],
    },

    // Group 8: W-Voltages
    {
      name: "W-Voltages",
      regex: /^W[1234]$/i,
      colorSet: ["#ffff33", "#f781bf"],
    },

    // Group 9: Y-Currents
    {
      name: "Y-Currents",
      regex: /^Y[12]$/i,
      colorSet: ["#4daf4a", "#377eb8"],
    },

    // Group 10: Z-Voltages
    {
      name: "Z-Voltages",
      regex: /^Z[12]$/i,
      colorSet: ["#a65628", "#e41a1c"],
    },

    // Group 11: AA-Currents
    {
      name: "AA-Currents",
      regex: /^AA[12]$/i,
      colorSet: ["#ff7f00", "#984ea3"],
    },

    // Group 12: AB-Voltages
    {
      name: "AB-Voltages",
      regex: /^AB[12]$/i,
      colorSet: ["#377eb8", "#ffff33"],
    },

    // Group 13: AC-Currents
    {
      name: "AC-Currents",
      regex: /^AC[12]$/i,
      colorSet: ["#4daf4a", "#a65628"],
    },

    // Group 14: AD-Voltages
    {
      name: "AD-Voltages",
      regex: /^AD[12]$/i,
      colorSet: ["#f781bf", "#377eb8"],
    },

    // Group 15: AE-Currents
    {
      name: "AE-Currents",
      regex: /^AE[12]$/i,
      colorSet: ["#e41a1c", "#4daf4a"],
    },

    // Group 16: AF-Voltages
    {
      name: "AF-Voltages",
      regex: /^AF[12]$/i,
      colorSet: ["#ff7f00", "#a65628"],
    },

    // Group 17: AG-Currents
    {
      name: "AG-Currents",
      regex: /^AG[12]$/i,
      colorSet: ["#984ea3", "#ffff33"],
    },

    // Group 18: AH-Voltages
    {
      name: "AH-Voltages",
      regex: /^AH[12]$/i,
      colorSet: ["#377eb8", "#4daf4a"],
    },

    // Group 19: AI-Currents
    {
      name: "AI-Currents",
      regex: /^AI[12]$/i,
      colorSet: ["#a65628", "#f781bf"],
    },

    // Group 20: AJ-Voltages
    {
      name: "AJ-Voltages",
      regex: /^AJ[12]$/i,
      colorSet: ["#e41a1c", "#ff7f00"],
    },

    // Group 21: AK-Currents
    {
      name: "AK-Currents",
      regex: /^AK[12]$/i,
      colorSet: ["#4daf4a", "#984ea3"],
    },

    // Group 22: AL-Voltages
    {
      name: "AL-Voltages",
      regex: /^AL[12]$/i,
      colorSet: ["#ffff33", "#377eb8"],
    },

    // Group 23: AM-Currents
    {
      name: "AM-Currents",
      regex: /^AM[12]$/i,
      colorSet: ["#a65628", "#e41a1c"],
    },

    // Group 24: AN-Voltages
    {
      name: "AN-Voltages",
      regex: /^AN[12]$/i,
      colorSet: ["#f781bf", "#4daf4a"],
    },

    // Group 25: AO-Currents
    {
      name: "AO-Currents",
      regex: /^AO[12]$/i,
      colorSet: ["#377eb8", "#a65628"],
    },

    // Group 26: AP-Voltages
    {
      name: "AP-Voltages",
      regex: /^AP[12]$/i,
      colorSet: ["#ff7f00", "#984ea3"],
    },

    // Group 27: AQ-Currents
    {
      name: "AQ-Currents",
      regex: /^AQ[12]$/i,
      colorSet: ["#e41a1c", "#ffff33"],
    },

    // Group 28: AR-Voltages
    {
      name: "AR-Voltages",
      regex: /^AR[12]$/i,
      colorSet: ["#4daf4a", "#377eb8"],
    },

    // Group 29: AS-Currents
    {
      name: "AS-Currents",
      regex: /^AS[12]$/i,
      colorSet: ["#984ea3", "#a65628"],
    },

    // Group 30: AT-Voltages
    {
      name: "AT-Voltages",
      regex: /^AT[12]$/i,
      colorSet: ["#a65628", "#ffff33"],
    },

    // Group 31: AU-Currents
    {
      name: "AU-Currents",
      regex: /^AU[12]$/i,
      colorSet: ["#f781bf", "#377eb8"],
    },

    // Group 32: AV-Voltages
    {
      name: "AV-Voltages",
      regex: /^AV[12]$/i,
      colorSet: ["#ff7f00", "#4daf4a"],
    },

    // Group 33: AW-Currents
    {
      name: "AW-Currents",
      regex: /^AW[12]$/i,
      colorSet: ["#377eb8", "#e41a1c"],
    },

    // Group 34: AX-Voltages
    {
      name: "AX-Voltages",
      regex: /^AX[12]$/i,
      colorSet: ["#984ea3", "#ffff33"],
    },

    // Group 35: AY-Currents
    {
      name: "AY-Currents",
      regex: /^AY[12]$/i,
      colorSet: ["#a65628", "#377eb8"],
    },

    // Group 36: AZ-Voltages
    {
      name: "AZ-Voltages",
      regex: /^AZ[12]$/i,
      colorSet: ["#4daf4a", "#f781bf"],
    },

    // Group 37: BA-Currents
    {
      name: "BA-Currents",
      regex: /^BA[12]$/i,
      colorSet: ["#ff7f00", "#e41a1c"],
    },

    // Group 38: BB-Voltages
    {
      name: "BB-Voltages",
      regex: /^BB[12]$/i,
      colorSet: ["#ffff33", "#984ea3"],
    },

    // Group 39: BC-Currents
    {
      name: "BC-Currents",
      regex: /^BC[12]$/i,
      colorSet: ["#377eb8", "#a65628"],
    },

    // Group 40: BD-Voltages
    {
      name: "BD-Voltages",
      regex: /^BD[12]$/i,
      colorSet: ["#4daf4a", "#ff7f00"],
    },

    // Group 41: BE-Currents
    {
      name: "BE-Currents",
      regex: /^BE[12]$/i,
      colorSet: ["#a65628", "#e41a1c"],
    },

    // Group 42: BF-Voltages
    {
      name: "BF-Voltages",
      regex: /^BF[12]$/i,
      colorSet: ["#f781bf", "#984ea3"],
    },

    // Group 43: BG-Currents
    {
      name: "BG-Currents",
      regex: /^BG[12]$/i,
      colorSet: ["#e41a1c", "#377eb8"],
    },

    // Group 44: BH-Voltages
    {
      name: "BH-Voltages",
      regex: /^BH[12]$/i,
      colorSet: ["#ffff33", "#4daf4a"],
    },

    // Group 45: BI-Currents
    {
      name: "BI-Currents",
      regex: /^BI[12]$/i,
      colorSet: ["#984ea3", "#ff7f00"],
    },

    // Group 46: BJ-Voltages
    {
      name: "BJ-Voltages",
      regex: /^BJ[12]$/i,
      colorSet: ["#377eb8", "#a65628"],
    },

    // Group 47: BK-Currents
    {
      name: "BK-Currents",
      regex: /^BK[12]$/i,
      colorSet: ["#4daf4a", "#f781bf"],
    },

    // Group 48: BL-Voltages
    {
      name: "BL-Voltages",
      regex: /^BL[12]$/i,
      colorSet: ["#a65628", "#e41a1c"],
    },

    // Group 49: BM-Currents
    {
      name: "BM-Currents",
      regex: /^BM[12]$/i,
      colorSet: ["#ff7f00", "#984ea3"],
    },

    // Group 50: BN-Voltages
    {
      name: "BN-Voltages",
      regex: /^BN[12]$/i,
      colorSet: ["#ffff33", "#377eb8"],
    },
  ];

  let groupId = 0;
  patterns.forEach((pattern) => {
    const indices = analogChannels
      .map((ch, idx) => (pattern.regex.test(ch.id) ? idx : -1))
      .filter((idx) => idx !== -1);
    if (indices.length > 0) {
      groups.push({
        groupId: `G${groupId}`,
        name: pattern.name,
        indices,
        colors: pattern.colorSet.slice(0, indices.length),
      });
      groupId++;
    }
  });

  const groupedIndices = groups.flatMap((g) => g.indices);
  const remaining = analogChannels
    .map((ch, idx) => (groupedIndices.includes(idx) ? -1 : idx))
    .filter((idx) => idx !== -1);
  if (remaining.length > 0) {
    groups.push({
      groupId: `G${groupId}`,
      name: "Other",
      indices: remaining,
      colors: ["#888"],
    });
  }
  return groups;
}

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
