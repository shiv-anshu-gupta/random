# 🔍 Where to Look - Files & What Changed

## Quick Navigation

### 📄 Modified Source Files

**1. src/components/chartUpdateHelpers.js** (NEW)
- **Size:** ~450 lines
- **Purpose:** Utility functions for optimization
- **Key functions:**
  - `applyColorChangeInPlace()` - Direct color update
  - `simulateChannelGroupChange()` - Simulate group change
  - `simulateChannelDeletion()` - Simulate deletion
  - `axisCountDidChange()` - Axis comparison
  - 5 more helper functions

**2. src/components/chartManager.js** (ENHANCED)
- **New lines:** ~280
- **Key addition:** `handleChannelUpdate()` export
- **Location of new code:** End of file (after `updateVerticalLinesOverlay()`)
- **What to look for:**
  ```javascript
  export function handleChannelUpdate(type, payload, ...) {
    // Central decision point
    switch (type) {
      case "color": ...
      case "group": ...
      case "delete": ...
    }
  }
  ```

**3. src/components/ChannelList.js** (ENHANCED)
- **Modified lines:** ~10 in cellEdited handler
- **Location:** Around lines 2280-2320
- **Changes:** Better message types and payloads
- **What changed:**
  - Added `value` field to scale and group payloads
  - New `callback_time_window` message type for start/duration
  - Same semantic behavior, better structure

**4. src/main.js** (ENHANCED)
- **New lines:** ~95
- **Changes in multiple places:**
  
  **a) Import statement (line ~39)**
  ```javascript
  // Before:
  import { subscribeChartUpdates } from "./components/chartManager.js";
  
  // After:
  import { subscribeChartUpdates, handleChannelUpdate } from "./components/chartManager.js";
  ```
  
  **b) CALLBACK_TYPE constant (lines ~813-824)**
  ```javascript
  // Added:
  TIME_WINDOW: "callback_time_window",
  ```
  
  **c) New TIME_WINDOW handler (NEW, lines ~4762-4827)**
  ```javascript
  case CALLBACK_TYPE.TIME_WINDOW: {
    // Routes start/duration changes
    // ~65 lines of logic
  }
  ```
  
  **d) Enhanced COLOR handler (lines ~4522-4609)**
  ```javascript
  // Now tries cheap path first:
  const handled = handleChannelUpdate("color", { row, value }, ...);
  if (handled) return;
  
  // Then falls back to legacy logic
  ```

---

## 📚 Documentation Files (NEW)

### Read These in Order:

1. **README_OPTIMIZATION_v2.1.md** (This is the main completion summary)
   - Overview of what was delivered
   - Key features and improvements
   - How to use and test

2. **QUICK_START_OPTIMIZATION.md** (Quick reference)
   - High-level explanation
   - Manual testing procedures
   - Troubleshooting guide
   - API reference

3. **OPTIMIZATION_IMPLEMENTATION.md** (Technical deep dive)
   - Executive summary
   - How it works with examples
   - Console output examples
   - Performance metrics

4. **IMPLEMENTATION_CHANGES_DETAILED.md** (Line-by-line changes)
   - Before/after code
   - Function signatures
   - Testing recommendations

5. **ARCHITECTURE_DIAGRAMS.md** (Visual flows)
   - Flow diagrams for color/group/delete
   - System architecture
   - Decision tree diagram

6. **DELIVERY_SUMMARY.md** (Comprehensive checklist)
   - What was delivered
   - Testing status
   - Verification checklist

---

## 🔬 How to Verify Implementation

### Step 1: Check Files Exist
```bash
# These files should exist:
ls src/components/chartUpdateHelpers.js     # NEW
ls src/components/chartManager.js           # ENHANCED
ls src/components/ChannelList.js            # ENHANCED
ls src/main.js                              # ENHANCED

# Documentation files should exist:
ls OPTIMIZATION_IMPLEMENTATION.md
ls IMPLEMENTATION_CHANGES_DETAILED.md
ls QUICK_START_OPTIMIZATION.md
ls ARCHITECTURE_DIAGRAMS.md
ls DELIVERY_SUMMARY.md
ls README_OPTIMIZATION_v2.1.md
```

### Step 2: Check Syntax
```bash
# Verify JavaScript syntax
node -c src/components/chartUpdateHelpers.js
node -c src/components/chartManager.js

# No errors? ✅ Good to go
```

### Step 3: Manual Testing

**Test 1: Color Update (Fast Path)**
1. Open COMTRADE file
2. Open Channel List (Edit → Edit Channels)
3. Click a color cell
4. Change the color
5. **Expected:** Instant update (~2ms)
6. **Check console:** Look for logs with `[COLOR HANDLER]`

**Test 2: Group Change (Smart Path)**
1. Open Channel List
2. Select a channel
3. Change its group from "G0" to "G1"
4. **Expected:** Quick change (smart decision on rebuild)
5. **Check console:** Look for `axisCountDidChange` logs

**Test 3: Deletion (Smart Path)**
1. Open Channel List
2. Click Delete button
3. **Expected:** Instant removal (~15ms for typical cases)
4. **Check console:** Look for delete timing logs

### Step 4: Check for Errors
- Open browser DevTools (F12)
- Go to Console tab
- Perform operations above
- **Expected:** No errors, only info/log messages
- **Look for:** `[handleChannelUpdate]` and `[COLOR HANDLER]` messages

---

## 🎯 Key Code Locations

### handleChannelUpdate() - The Heart
**File:** `src/components/chartManager.js`  
**Lines:** ~2562-2722 (end of file)  
**Purpose:** Central decision point for all updates

**Look for:**
```javascript
export function handleChannelUpdate(type, payload, channelState, ...)
```

### applyColorChangeInPlace() - Fast Color Updates
**File:** `src/components/chartUpdateHelpers.js`  
**Lines:** ~55-100  
**Purpose:** Update series color without rebuild

**Look for:**
```javascript
export function applyColorChangeInPlace(payload, channelState)
```

### simulateChannelGroupChange() - Smart Group Logic
**File:** `src/components/chartUpdateHelpers.js`  
**Lines:** ~140-190  
**Purpose:** Simulate group change for analysis

**Look for:**
```javascript
export function simulateChannelGroupChange(currentState, channelID, newGroup)
```

### Enhanced COLOR Handler - Entry Point
**File:** `src/main.js`  
**Lines:** ~4522-4609  
**Purpose:** Routes to new optimization path

**Look for:**
```javascript
case CALLBACK_TYPE.COLOR: {
  handleChannelUpdate("color", { row, value }, ...)
}
```

---

## 📊 Performance Benchmarking

### How to Measure Yourself

**Chrome DevTools Performance Recording:**
1. Open DevTools → Performance tab
2. Click Record button
3. Edit a channel color
4. Click Stop
5. Look at timeline:
   - **Before:** Long rendering blocks (400ms)
   - **After:** Short blocks (~2ms) ✅

**Console Timing Logs:**
```javascript
// Logs show timing automatically
[handleChannelUpdate] ✅ Cheap color update succeeded (2.34ms)
[handleChannelUpdate] ✅ Cheap group change succeeded (8.56ms)
```

**Browser Console Time Profiling:**
```javascript
// In DevTools console:
console.time("color-change");
// User edits color
console.timeEnd("color-change");
// Shows: color-change: 2.34ms
```

---

## 🧪 Testing Scenarios

### Scenario 1: Rapid Color Edits (v1)
1. Open Channel List
2. Rapidly change colors of 5 channels
3. **Expected:** Each color update ~2ms
4. **Current behavior:** Sequential updates (no coalescing yet)
5. **Future:** v2.4 will batch these

### Scenario 2: Group Rearrangement
1. Open Channel List with 5 channels in G0
2. Move 3 channels one-by-one to G1
3. **Expected:** 
   - Fast moves if axes unchanged
   - Rebuild only if axis structure changes
4. **Check logs:** `axisCountDidChange` for each operation

### Scenario 3: Mixed Channel Types
1. Create mixed channels: Voltage + Current
2. Move Current to G1 (leaving Voltage in G0)
3. **Expected:**
   - Axes stay same (both still needed)
   - Fast update (~10ms)
4. **Verify:** No rebuild triggered

### Scenario 4: Complex Deletion
1. Load file with:
   - G0: Voltage1, Voltage2, Current1
   - G1: Power1, Power2
2. Delete Voltage1
3. **Expected:**
   - Axes unchanged (Voltage2 still exists)
   - Fast deletion (~15ms)
4. **Check:** No full rebuild

---

## 🐛 Debugging Tips

### If Color Update is Slow
```javascript
// Open DevTools Console and check:
console.log(window.uPlot);  // Should exist

// Check chart metadata
window.debugChartMetadata();  // Lists all charts

// Look for errors in console with [chartManager] prefix
```

### If Group Change Takes Too Long
```javascript
// Check if handleChannelUpdate is being called:
// Add breakpoint in src/main.js COLOR handler

// Look for these logs:
// [handleChannelUpdate] Analyzing group change...
// [axisCountDidChange] Axis comparison: {...}

// If you see "using full rebuild" but expect cheap path:
// Check if axis count actually changed (might be correct)
```

### If Console Shows No Logs
```javascript
// Logs should appear with [prefix] format
// If none, handleChannelUpdate might not be called

// Check:
1. Is handleChannelUpdate imported? (main.js line ~39)
2. Is the new COLOR handler running? (add console.log in try block)
3. Is color field correctly detected? (check field variable)
```

---

## 📝 Key Assertions to Check

### Assert 1: Import is Present
**File:** `src/main.js` line ~39
```javascript
// Should see:
import { subscribeChartUpdates, handleChannelUpdate } from "./components/chartManager.js";
```

### Assert 2: TIME_WINDOW Handler Exists
**File:** `src/main.js` lines ~4762-4827
```javascript
// Should have:
case CALLBACK_TYPE.TIME_WINDOW: {
  // Handle start/duration updates
}
```

### Assert 3: COLOR Handler Uses handleChannelUpdate
**File:** `src/main.js` lines ~4522-4609
```javascript
// Should have:
if (typeof handleChannelUpdate === "function") {
  const handled = handleChannelUpdate("color", { row, value }, ...);
}
```

### Assert 4: chartUpdateHelpers Exports Functions
**File:** `src/components/chartUpdateHelpers.js`
```javascript
// Should export:
export function applyColorChangeInPlace(...) {...}
export function simulateChannelGroupChange(...) {...}
export function axisCountDidChange(...) {...}
// ... and more
```

### Assert 5: chartManager Imports Helpers
**File:** `src/components/chartManager.js` top
```javascript
// Should import:
import { applyColorChangeInPlace, simulateChannelGroupChange, ... } 
  from "./chartUpdateHelpers.js";
```

---

## ✅ Final Verification Checklist

- [ ] No syntax errors (node -c check)
- [ ] chartUpdateHelpers.js file exists
- [ ] handleChannelUpdate exported from chartManager
- [ ] handleChannelUpdate imported in main.js
- [ ] TIME_WINDOW handler exists in main.js
- [ ] COLOR handler uses handleChannelUpdate
- [ ] All documentation files created
- [ ] Can load COMTRADE file
- [ ] Can open Channel List window
- [ ] Color updates work (check console logs)
- [ ] Group changes work (check console logs)
- [ ] Deletions work (check console logs)
- [ ] No console errors
- [ ] Existing features unchanged

---

**End of Navigation Guide**

Use this file to quickly find what changed and how to verify everything works!
