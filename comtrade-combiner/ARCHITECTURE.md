# COMTRADE File Combiner - Architecture & Flow

## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   COMTRADE File Combiner                        │
│              (Independent Standalone Tool)                      │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   index.html     │ ← Main entry point (open in browser)
│   + styles.css   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│                    UI LAYER                                  │
│                 (src/app.js)                                 │
│  ┌────────────────┐         ┌──────────────────────┐         │
│  │ Settings Panel │         │ Preview Panel         │         │
│  ├────────────────┤         ├──────────────────────┤         │
│  │ File Upload    │         │ File List            │         │
│  │ Time Window    │   ───→  │ Analysis Results     │         │
│  │ Thresholds     │         │ Combine Groups       │         │
│  │ Action Buttons │         │ Modal Preview        │         │
│  └────────────────┘         └──────────────────────┘         │
└────────┬─────────────────────────────────┬────────────────────┘
         │                                 │
         ▼                                 ▼
┌────────────────────────────┐  ┌────────────────────────────────┐
│   FILE PARSER UTILITY      │  │   COMBINER UTILITY             │
│   (fileParser.js)          │  │   (combiner.js)                │
├────────────────────────────┤  ├────────────────────────────────┤
│ ✓ parseCFG()               │  │ ✓ groupByTimeWindow()          │
│ ✓ parseDAT()               │  │ ✓ findDuplicateChannels()      │
│ ✓ matchFilePairs()         │  │ ✓ findSimilarChannels()        │
│                            │  │ ✓ calculateSimilarity()        │
│                            │  │ ✓ getLevenshteinDistance()     │
│                            │  │ ✓ prepareCombinedFile()        │
└────────────────────────────┘  └────────────────────────────────┘
```

## 📊 Data Flow Diagram

```
Step 1: FILE UPLOAD
═══════════════════════════════════════════════════════════════════
User selects files:
    [test1.cfg] [test1.dat] [test2.cfg] [test2.dat] [test3.cfg] [test3.dat]
                                    ↓
                    matchFilePairs() → Pairs identified
                                    ↓
                    ✓ Pair 1: (test1.cfg, test1.dat)
                    ✓ Pair 2: (test2.cfg, test2.dat)
                    ✓ Pair 3: (test3.cfg, test3.dat)


Step 2: FILE PARSING
═══════════════════════════════════════════════════════════════════
For each pair, parse CFG and DAT:

    parseCFG() extracts:              parseDAT() extracts:
    ├─ stationName                    ├─ fileSize
    ├─ deviceName                     └─ estimatedSamples
    ├─ timestamp (IMPORTANT!)
    └─ channels: [{
        name: "IA",
        unit: "A",
        type: "analog"
      }, ...]
                                    ↓
                    parsedData = [
                      {timestamp: 10:00:01, channels: [...]},
                      {timestamp: 10:00:02, channels: [...]},
                      {timestamp: 10:00:05, channels: [...]}
                    ]


Step 3: TIME WINDOW GROUPING
═══════════════════════════════════════════════════════════════════
Input: parsedData + timeWindow (2 seconds)

Algorithm:
  1. Sort by timestamp
  2. Start first group with file 1
  3. For each next file:
     - If timestamp within window: ADD to current group
     - Else: START new group

Process:
  10:00:01 ─┐
            ├─ Within 2 sec ─┐
  10:00:02 ─┘               │
                            └─ GROUP 1 (combine these)

  10:00:05 ─────────────────── GROUP 2 (separate)
           (3 sec away)

Result:
  groups = [
    {files: [file1, file2], timeSpan: 1 sec},
    {files: [file3], timeSpan: 0 sec}
  ]


Step 4: DUPLICATE DETECTION
═══════════════════════════════════════════════════════════════════
Check each group:

Group 1 Channels:
  File 1: [IA, IB, IC, VA, VB, VC]
  File 2: [IA, IB, IC, PA, PB, PC]
           ↑  ↑  ↑
        DUPLICATES! (same names)

Result:
  duplicates: {
    "IA_analog": [{file: 0, idx: 0}, {file: 1, idx: 0}],
    "IB_analog": [{file: 0, idx: 1}, {file: 1, idx: 1}],
    "IC_analog": [{file: 0, idx: 2}, {file: 1, idx: 2}]
  }


Step 5: SIMILAR DETECTION
═══════════════════════════════════════════════════════════════════
Compare ALL channels in group:

File A: "IA"      vs  File B: "I_A"
        ├─ Type: analog      vs  analog     ✓ 30%
        ├─ Unit: A           vs  A          ✓ 20%
        └─ Name similarity   vs  (Levenshtein)
           "IA" → "I_A" = 95% similar       ✓ 47.5%
                                            ─────────
                                            Total: 97.5% ✓

If similarity ≥ threshold (0.95):
  → Mark "I_A" for removal


Step 6: PREPARE COMBINED FILE
═══════════════════════════════════════════════════════════════════
Input: Group + options (removeDuplicates, removeSimilar, threshold)

For each group:
  1. Collect all channels
  2. Remove duplicates (if enabled)
  3. Remove similar (if enabled)
  4. Calculate statistics

Result:
  combined = {
    originalFiles: ["test1.cfg", "test2.cfg"],
    totalChannels: 12,
    duplicatesRemoved: 3,
    similarRemoved: 1,
    finalChannelCount: 8,
    mergedChannels: [...],
    startTime: 2024-12-17T10:00:01Z,
    timeSpan: 1.0
  }


Step 7: DISPLAY & PREVIEW
═══════════════════════════════════════════════════════════════════
Show in UI:
  ┌─────────────────────────────────────────┐
  │ Group 1                           [2/3] │  ← File count
  ├─────────────────────────────────────────┤
  │ Files: test1.cfg, test2.cfg             │
  │ ⏱️ Time span: 1.00s                     │
  │ 📊 Channels: 12 → 8                    │
  │    Removed: 3 duplicates + 1 similar   │
  │ ✓ Ready to export                       │
  └─────────────────────────────────────────┘
```

## 🔄 Algorithm Details

### Time Window Grouping

```
Files by timestamp:
[A: 10:00:01] [B: 10:00:02] [C: 10:00:05]

Window = 2 seconds

Check each:
  A: [10:00:01] → Start group 1
  B: [10:00:02] → 1 sec from A → Within 2s → Add to group 1
  C: [10:00:05] → 3 sec from A → Outside 2s → New group 2

Result: [[A, B], [C]]
```

### Levenshtein Distance

```
String comparison example:
  "IA" vs "I_A"

  Transformations needed:
    "IA"   → "I_A"
    Step 1: Insert "_" after "I"

  Distance = 1 character change
  Similarity = (2 - 1) / 2 = 0.5 = 50%

Another example:
  "Phase_A" vs "PhaseA"

  Distance = 1 (_)
  Similarity = (7 - 1) / 7 = 85%
```

### Similarity Score Calculation

```
Channel 1: IA (type: analog, unit: A)
Channel 2: I_A (type: analog, unit: A)

Score = (Type Score × 30%) + (Unit Score × 20%) + (Name Score × 50%)

Type Score: analog === analog → 1.0 → 1.0 × 30% = 30%
Unit Score: A === A → 1.0 → 1.0 × 20% = 20%
Name Score: 85% → 0.85 × 50% = 42.5%
                           ──────────
                           Total = 92.5%

Threshold = 0.95 (95%)
92.5% < 95% → NOT SIMILAR (won't be removed)

But threshold = 0.90 (90%):
92.5% > 90% → SIMILAR (will be removed)
```

## 🎯 Complete Workflow Example

```
INPUT:
  Files: fault_1.cfg/dat (10:00:01, 12 channels)
         fault_2.cfg/dat (10:00:02, 12 channels)
         fault_3.cfg/dat (10:00:05, 12 channels)

  Settings: Window=2s, RemoveDup=ON, RemoveSim=ON, Threshold=0.95

PROCESS:
  1. Parse → 3 files with timestamps
  2. Group → Group 1: [1,2], Group 2: [3]
  3. Check Duplicates → 3 found in group 1
  4. Check Similar → 1 pair similar at 96%
  5. Prepare → Remove 4 total, keep 8 channels

OUTPUT:
  Group 1:
    ├─ Start Time: 10:00:01
    ├─ Time Span: 1 second
    ├─ Final Channels: 8/12 ✓
    └─ Status: Ready to export

  Group 2:
    ├─ Start Time: 10:00:05
    ├─ Time Span: 0 seconds
    ├─ Final Channels: 12/12 ✓
    └─ Status: Ready to export

USER SEES:
  ✅ Analysis complete: 2 combine groups found
  📊 Remove Duplicates: 3 found
  📊 Remove Similar: 1 found
  ✓ Summary: 24 channels → 20 channels
```

## 🔗 When Ready to Integrate

Copy these to main project:

```
comtrade-combiner/src/utils/
├── fileParser.js   → src/utils/fileParser.js
└── combiner.js     → src/utils/fileCombiner.js

Add to src/main.js:
import { ComtradeCombiner } from './utils/fileCombiner.js';
import { ComtradeFileParser } from './utils/fileParser.js';

// Add UI button for "Combine Files"
// Call: ComtradeCombiner.groupByTimeWindow(files, timeWindow);
```

---

**This architecture keeps the combiner completely independent until ready for integration! 🚀**
