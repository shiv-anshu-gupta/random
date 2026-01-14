# Progress Bar Integration - Visual Guide

## Complete Operation Flow

### GROUP CHANGE FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│ USER ACTION: Changes group in Tabulator (right-click → Edit)    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ MAIN.JS: CALLBACK_TYPE.GROUP Handler (Line 5076)               │
├─────────────────────────────────────────────────────────────────┤
│ ✓ showProgress(0, "Changing group for Channel A...")           │
│ ✓ setProgressCallback((percent, msg) => updateProgress(...))   │
│ ✓ channelState[type].groups[idx] = newGroup                    │
│ ✓ updateProgress(25, "Processing group change...")             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ Reactive Update Triggered
┌─────────────────────────────────────────────────────────────────┐
│ CHARTMANAGER.JS: Group Subscriber (Line 1368)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  callProgress(25, "Processing group change...")                │
│  [PROGRESS BAR: 25%]                                           │
│                                                                 │
│  callProgress(30, "Analyzing group structure...")              │
│  [PROGRESS BAR: 30%]                                           │
│                                                                 │
│  Analyze axes using analyzeGroupsAndPublishMaxYAxes()          │
│  callProgress(40, "Axis count: stable...")                     │
│  [PROGRESS BAR: 40%]                                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ DECISION: Do axes need to change?                      │  │
│  └──────────────┬────────────────────────────────────────┬─┘  │
│                 │                                        │    │
│         NO (Cheap Path)                          YES (Rebuild) │
│                 │                                        │    │
│  ┌──────────────▼───────────────────┐   ┌───────────────▼──┐ │
│  │ FAST PATH: Reuse existing charts │   │ SLOW PATH: Full  │ │
│  │ • Update data in-place           │   │ rebuild          │ │
│  │ • Call setData()                 │   │ • Destroy charts │ │
│  │ • callProgress(50, ...)          │   │ • Re-render      │ │
│  │ • callProgress(100, ...)         │   │ • callProgress() │ │
│  │ [PROGRESS: 40% → 50% → 100%]     │   │ [PROGRESS: 50-100%]
│  └──────────────┬───────────────────┘   └───────────────┬──┘ │
│                 │                                        │    │
│                 └────────────────────┬───────────────────┘    │
│                                      │                         │
│                        ▼ All paths reach here                 │
│                                                                 │
│  callProgress(100, "Group change complete!")                  │
│  [PROGRESS BAR: 100% ✓]                                       │
│                                                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ AUTO-HIDE: After 800ms                                         │
├─────────────────────────────────────────────────────────────────┤
│ setTimeout(() => hideProgress(), 800)                          │
│ Progress bar fades out                                         │
└─────────────────────────────────────────────────────────────────┘
```

### COLOR CHANGE FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│ USER ACTION: Changes color in Tabulator (right-click → Edit)   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ MAIN.JS: CALLBACK_TYPE.COLOR Handler (Line 4488)              │
├─────────────────────────────────────────────────────────────────┤
│ ✓ showProgress(0, "Changing color for Channel B...")          │
│ ✓ setProgressCallback((percent, msg) => updateProgress(...))  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Try handleChannelUpdate with cheap path                  │ │
│  │ (uPlot.setSeries - ~2ms)                                 │ │
│  │                                                           │ │
│  │ handleChannelUpdate(                                      │ │
│  │   "color",                                               │ │
│  │   { row, value: color },                                │ │
│  │   ...,                                                   │ │
│  │   (percent, msg) => callProgress(percent, msg)          │ │
│  │ )                                                         │ │
│  │                                                           │ │
│  │ Returns: true (cheap path succeeded)                      │ │
│  │ callProgress(100, "Color change complete!")             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│ OR (if cheap path fails)                                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Legacy/Fallback Path:                                    │ │
│  │                                                           │ │
│  │ callProgress(50, "Updating color in state...")          │ │
│  │ updateChannelFieldByID(...)                              │ │
│  │ callProgress(75, "Applying color to chart...")          │ │
│  │ callProgress(100, "Color change complete!")             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ✓ setTimeout(() => hideProgress(), 500)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ AUTO-HIDE: After 500ms (faster than GROUP)                    │
├─────────────────────────────────────────────────────────────────┤
│ Progress bar fades out                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Progress Bar States During GROUP CHANGE

### Cheap Path (No Axis Change) - ~50ms

```
0ms:  [████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0% Changing group...
5ms:  [██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 25% Processing group change...
10ms: [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 30% Analyzing group structure...
20ms: [█████████████░░░░░░░░░░░░░░░░░░░░░░░░░] 40% Axis count: stable...
35ms: [██████████████████████░░░░░░░░░░░░░░░] 50% Reusing existing charts...
45ms: [███████████████████████████████████████] 100% Group change complete! ✓
50ms: [Progress bar fades out] ← Auto-hide after 800ms
```

### Full Rebuild (Axis Change) - ~400-500ms

```
0ms:   [████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0% Changing group...
10ms:  [██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 25% Processing group change...
20ms:  [████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 30% Analyzing group structure...
30ms:  [█████████████░░░░░░░░░░░░░░░░░░░░░░░░░] 40% Axis count: changing...
50ms:  [████████████████████░░░░░░░░░░░░░░░░░░] 50% Rebuilding chart structure...
150ms: [██████████████████████░░░░░░░░░░░░░░░] 65% Rendering new charts...
250ms: [████████████████████████░░░░░░░░░░░░] 80% Finalizing group structure...
350ms: [███████████████████████████░░░░░░░░░] 90% Completing rebuild...
400ms: [███████████████████████████████████████] 100% Group change complete! ✓
800ms: [Progress bar fades out] ← Auto-hide triggered
```

## Progress Bar States During COLOR CHANGE

### Fast Color Update - ~10-20ms

```
0ms:  [████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0% Changing color...
5ms:  [██████████████░░░░░░░░░░░░░░░░░░░░░░░░] 50% Updating color in state...
10ms: [██████████████████████░░░░░░░░░░░░░░░] 75% Applying color to chart...
15ms: [███████████████████████████████████████] 100% Color change complete! ✓
20ms: [Progress bar fades out] ← Auto-hide after 500ms
```

## Callback Chain Diagram

```
┌──────────────────────────────────────────────────────────────┐
│ main.js: OPERATION HANDLER                                  │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ showProgress(0, "Changing group...")                   │ │
│ └────────────────────────────────────────────────────────┘ │
│                      │                                     │
│                      ▼                                     │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ setProgressCallback((percent, msg) => {                │ │
│ │   updateProgress(percent, msg);                        │ │
│ │   if (percent >= 100) {                                │ │
│ │     setTimeout(() => hideProgress(), 800ms);           │ │
│ │   }                                                     │ │
│ │ });                                                     │ │
│ └────────────────────────────────────────────────────────┘ │
│                      │ Stores function in                 │
│                      ▼ globalProgressCallback              │
└──────────────────────┼──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ UPDATE TRIGGERED: channelState changes                      │
│ (Subscription detected in chartManager.js)                 │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ chartManager.js: GROUP SUBSCRIBER                          │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ callProgress(30, "Analyzing group structure...");      │ │
│ │                                                         │ │
│ │ const callProgress = (percent, message) => {           │ │
│ │   const callback = getProgressCallback?.();            │ │
│ │   callback?.(percent, message);                        │ │
│ │ };                                                      │ │
│ │                                                         │ │
│ │ // Gets globalProgressCallback from main.js            │ │
│ │ // Calls stored function: updateProgress(30, "...")   │ │
│ └────────────────────────────────────────────────────────┘ │
│                      │                                     │
│                      ▼                                     │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ updateProgress(30, "Analyzing group structure...")    │ │
│ │ // Updates ProgressBar.js progressState               │ │
│ │ // DOM updates to show 30%                             │ │
│ └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ ProgressBar.js: DOM UPDATE                                  │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ progressState updates:                                 │ │
│ │ • visible: true                                        │ │
│ │ • percent: 30                                          │ │
│ │ • message: "Analyzing group structure..."              │ │
│ │                                                         │ │
│ │ DOM rendered:                                          │ │
│ │ [██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 30%      │ │
│ │  Analyzing group structure...                          │ │
│ └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                       │
                       ▼
              [Repeat for 40%, 50%, 75%, 100%]
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│ FINAL STATE (100%)                                          │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ [███████████████████████████████████████] 100%       │ │
│ │  Group change complete! ✓                              │ │
│ │                                                         │ │
│ │ setTimeout(() => hideProgress(), 800ms)               │ │
│ │ ↓ After 800ms                                         │ │
│ │ hideProgress() → progressState.visible = false         │ │
│ │ ↓                                                       │ │
│ │ DOM: Progress bar fades out and removes               │ │
│ └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
                    ┌─────────────────────────────────┐
                    │ ProgressBar.js (Component)      │
                    │                                 │
                    │ exports:                        │
                    │ • createProgressBar()           │
                    │ • showProgress(%, msg)          │
                    │ • updateProgress(%, msg)        │
                    │ • hideProgress()                │
                    │                                 │
                    │ state: progressState            │
                    │ • visible: boolean              │
                    │ • percent: 0-100                │
                    │ • message: string               │
                    └───────┬─────────────────────────┘
                            │
                            ▲ DOM updates from state
                            │
                            ▼
                    ┌─────────────────────────────────┐
                    │ main.js (Event Handlers)        │
                    │                                 │
                    │ • showProgress()                │
                    │ • updateProgress()              │
                    │ • hideProgress()                │
                    │                                 │
                    │ + Global Callback:              │
                    │ • globalProgressCallback        │
                    │ • setProgressCallback(fn)       │
                    │ • callProgress(%, msg)          │
                    └───────┬─────────────────────────┘
                            │
                ┌───────────┴────────────────┐
                ▼                            ▼
        ┌──────────────────┐      ┌──────────────────┐
        │ GROUP Handler    │      │ COLOR Handler    │
        │ (Line 5076)      │      │ (Line 4488)      │
        └──────────────────┘      └──────────────────┘
                │                            │
                └───────────┬────────────────┘
                            ▼
                    ┌──────────────────────┐
                    │ chartManager.js      │
                    │                      │
                    │ • subscribeChartUpdates()
                    │ • handleChannelUpdate()
                    │ • Group subscriber() │
                    │                      │
                    │ Calls callProgress() │
                    └──────────────────────┘
                            │
                            ▼ Updates via callback
                    ┌──────────────────────┐
                    │ progressState updates│
                    │ Displayed to user    │
                    └──────────────────────┘
```

## Key Integration Points

### 1. Operation Initiation
```javascript
showProgress(0, "Starting operation...")
setProgressCallback(fn) // Store callback for later use
```

### 2. State Update (Triggers Subscribers)
```javascript
channelState.groups[idx] = newValue
// ↓ Reactive system detects change
// ↓ Subscriber in chartManager fires
```

### 3. Progress Tracking
```javascript
callProgress(percent, msg)
  ↓ Calls stored globalProgressCallback
  ↓ Calls updateProgress(percent, msg)
  ↓ Updates progressState
  ↓ DOM re-renders with new %
```

### 4. Completion
```javascript
callProgress(100, "Complete!")
// ↓ setTimeout(() => hideProgress(), delay)
// ↓ hideProgress() called after delay
// ↓ progressState.visible = false
// ↓ DOM removes progress bar
```

## Summary

- **Decoupled:** Handlers and subscribers don't directly call each other
- **Reactive:** Uses state subscription pattern (createState)
- **Trackable:** Multiple progress stages show actual operation progress
- **Auto-cleanup:** Automatic hide after completion
- **Resilient:** Works for both fast and slow paths
