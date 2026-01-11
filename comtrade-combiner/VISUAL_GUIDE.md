# 🎨 COMTRADE File Combiner - Visual Guide

## 🖥️ User Interface Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    COMTRADE File Combiner                               │
│              Combine multiple COMTRADE files with time-window           │
│                      based merging                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────┬─────────────────────────────────┐
│         SETTINGS PANEL                 │      PREVIEW PANEL              │
│         (Left side)                    │      (Right side)               │
│                                        │                                 │
│  📋 Settings & Configuration           │  📊 Preview & Analysis          │
│                                        │                                 │
│  ┌────────────────────────────────┐   │  ┌──────────────────────────┐   │
│  │ Select COMTRADE Files          │   │  │ Uploaded Files           │   │
│  │ [Choose files...]              │   │  │ ┌────────────────────┐   │   │
│  │                                │   │  │ │ Pair 1             │   │   │
│  ├────────────────────────────────┤   │  │ │ test1.cfg + .dat   │   │   │
│  │ Time Window (seconds)          │   │  │ ├────────────────────┤   │   │
│  │ [2.0          ]                │   │  │ │ Pair 2             │   │   │
│  │ Files within this window will  │   │  │ │ test2.cfg + .dat   │   │   │
│  │ be combined                    │   │  │ └────────────────────┘   │   │
│  │                                │   │  │                          │   │
│  ├────────────────────────────────┤   │  ├──────────────────────────┤   │
│  │ ☑ Remove Duplicate Channels    │   │  │ Analysis Results         │   │
│  │   Remove channels with         │   │  │                          │   │
│  │   identical names              │   │  │ 🔍 Duplicate Found       │   │
│  │                                │   │  │    3 duplicates          │   │
│  │ ☑ Remove Similar Channels      │   │  │ 📊 Similar Channels      │   │
│  │   Detect nearly identical      │   │  │    1 similar pair        │   │
│  │   channels                     │   │  │ 📈 Total Channels        │   │
│  │                                │   │  │    36 channels total     │   │
│  ├────────────────────────────────┤   │  ├──────────────────────────┤   │
│  │ Similarity Threshold           │   │  │ Combine Groups           │   │
│  │ [0.95      |============|  ]   │   │  │                          │   │
│  │ 0.5=50% similar, 1.0=100%      │   │  │ Group 1                 │   │
│  │                                │   │  │ ├─ [2/3]               │   │
│  ├────────────────────────────────┤   │  │ ├─ Files: test1, test2  │   │
│  │ [🔍 Analyze]                   │   │  │ ├─ ⏱️ Time: 1.0s        │   │
│  │ [✅ Combine & Export]          │   │  │ ├─ 📊 12 → 8 channels   │   │
│  │ [🔄 Reset]                     │   │  │ └─ Removed: 2+1         │   │
│  └────────────────────────────────┘   │  │                          │   │
│                                        │  │ Group 2                 │   │
│                                        │  │ ├─ [1/3]               │   │
│                                        │  │ ├─ Files: test3         │   │
│                                        │  │ └─ 📊 12 → 12 channels  │   │
│                                        │  └──────────────────────────┘   │
│                                        │                                 │
└────────────────────────────────────────┴─────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Ready                                                                   │
│ Status bar with feedback                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🎬 Step-by-Step Workflow

### Step 1: Select Files

```
User clicks "Choose files..."
        ↓
File browser opens
        ↓
User selects: [test1.cfg] [test1.dat] [test2.cfg] [test2.dat]
        ↓
App matches pairs automatically
        ↓
Display: "Pair 1: test1.cfg + test1.dat ✓"
        ↓
Display: "Pair 2: test2.cfg + test2.dat ✓"
```

### Step 2: Configure Settings

```
User adjusts:
  ├─ Time Window: 2 seconds
  ├─ ☑ Remove Duplicates
  ├─ ☑ Remove Similar
  └─ Threshold: 0.95

Status: "Ready"
```

### Step 3: Analyze

```
Click: [🔍 Analyze Files]
        ↓
Parse each file:
  ├─ Read CFG → Extract timestamp, channels
  └─ Read DAT → Get file size
        ↓
Group by time:
  ├─ File 1 (10:00:01) ─┐
  ├─ File 2 (10:00:02) ─┤─→ Group 1 (within 2s)
  └─ File 3 (10:00:05) ─┘   Group 2 (separate)
        ↓
Find duplicates:
  ├─ "IA" appears in both files → Mark for removal
  └─ Count: 3 duplicates
        ↓
Find similar:
  ├─ "IA" vs "I_A" → 95% similar
  └─ Count: 1 similar pair
        ↓
Display results in Preview Panel
        ↓
Status: "✅ Analysis complete: 2 combine groups found"
```

### Step 4: Review Results

```
Preview Panel shows:

Group 1
├─ Files: test1.cfg, test2.cfg
├─ Time span: 1.0 second
├─ Original channels: 12
├─ Duplicates removed: 3
├─ Similar removed: 1
└─ Final: 8 channels ✓

Group 2
├─ Files: test3.cfg
├─ Time span: 0 seconds
├─ Original channels: 12
├─ Duplicates removed: 0
├─ Similar removed: 0
└─ Final: 12 channels ✓
```

### Step 5: Combine & Export

```
Click: [✅ Combine & Export]
        ↓
Modal opens showing:

📦 Combined Files Summary

Combined File 1:
├─ Files: test1.cfg, test2.cfg
├─ Start Time: 2024-12-17 10:00:01
├─ Time Span: 1.0 seconds
├─ Original Channels: 12
├─ Duplicates Removed: 3
├─ Similar Removed: 1
├─ Final Channels: 8 ✓
└─ Merged Channels:
   ├─ IA (analog)
   ├─ IB (analog)
   ├─ IC (analog)
   ├─ VA (analog)
   ├─ VB (analog)
   └─ ... and 3 more

Combined File 2:
├─ Files: test3.cfg
└─ Final Channels: 12

Next Step: Implement actual file export/merge logic
```

## 🧮 Algorithm Visualizations

### Time Window Grouping

**Visual 1: Timeline**

```
Time →
10:00:01    10:00:02    10:00:03    10:00:04    10:00:05
   ↓           ↓                                    ↓
 File1       File2                               File3
   |--------1 second--------|
         Within 2s window → GROUP 1

                                      |----3 seconds----|
                                   Outside window → GROUP 2
```

**Visual 2: Algorithm**

```
Input: [File(10:00:01), File(10:00:02), File(10:00:05)]
Window: 2 seconds

Iteration:
┌─────────────────────────────────────────────────┐
│ F1(10:00:01) → Start GROUP 1, t=10:00:01        │
│ F2(10:00:02) → 1s from start → In window → Add  │
│ F3(10:00:05) → 4s from start → Out window → New │
│              → Start GROUP 2, t=10:00:05        │
└─────────────────────────────────────────────────┘

Output: [[F1, F2], [F3]]
```

### Duplicate Detection

**Visual: Channel Comparison**

```
File 1 Channels    File 2 Channels
───────────────    ───────────────
IA                 IA              ← DUPLICATE!
IB                 IB              ← DUPLICATE!
IC                 IC              ← DUPLICATE!
VA                 VA              ← Different files
VB                 VB              ← Different files
VC                 VC              ← Different files
```

### Similar Channel Detection

**Visual: Similarity Scoring**

```
Channel 1: IA
Channel 2: I_A

Scoring:
┌─────────────────────────────────────┐
│ Type: analog vs analog   ✓          │ 100% → 30%
│ Unit: A vs A             ✓          │ 100% → 20%
│ Name: IA vs I_A          ≈          │  85% → 42.5%
├─────────────────────────────────────┤
│ Total Similarity Score:  92.5%      │
├─────────────────────────────────────┤
│ Threshold: 0.95 (95%)               │
│ 92.5% < 95% → NOT SIMILAR           │
│ (Won't be removed)                  │
└─────────────────────────────────────┘

If threshold = 0.90 (90%):
92.5% > 90% → SIMILAR (will be removed)
```

### Levenshtein Distance Example

**Visual: String Transformation**

```
"IA"  →  "I_A"

Step 1: Insert "_" at position 1
"I" + "_" + "A" = "I_A" ✓

Distance = 1 operation
Max length = 2
Similarity = (2 - 1) / 2 = 50%

Another:
"IA" vs "IA"
No operations needed
Distance = 0
Similarity = 100%
```

## 🎯 Feature Demonstrations

### Demo 1: Time Window = 1 second

```
Files:
10:00:01  ─┐
           ├─→ GROUP 1 (0.5s apart)
10:00:01.5 ─┘

10:00:05  ─→ GROUP 2 (separate, >1s gap)
```

### Demo 2: Time Window = 5 seconds

```
Files:
10:00:01  ─┐
           │
10:00:02  ─┤
           ├─→ GROUP 1 (within 5s)
10:00:05  ─┤
           │
10:00:06  ─┘

Result: All in one group!
```

### Demo 3: Similarity Threshold = 0.90

```
Pairs found at 90% match:
├─ "IA" vs "I_A"     (95%) ✓ Detected
├─ "VA" vs "V_A"     (95%) ✓ Detected
├─ "IC" vs "I_C"     (95%) ✓ Detected
└─ "PA" vs "P_A"     (95%) ✓ Detected

Threshold = 0.98 (98%):
No matches (too strict)

Threshold = 0.50 (50%):
Many matches (very loose)
```

## 🔄 Data Transformation Examples

### Example 1: Single File Group

```
Input:
File 1 (10:00:01)
├─ IA (Analog, A)
├─ IB (Analog, A)
├─ IC (Analog, A)
├─ VA (Analog, V)
├─ VB (Analog, V)
└─ VC (Analog, V)
Total: 6 channels

Processing:
✓ No duplicates (single file)
✓ No similar pairs (all unique names)

Output:
6 channels → 6 channels (no change)
```

### Example 2: Two File Group with Duplicates

```
Input:
File 1 (10:00:01)       File 2 (10:00:02)
├─ IA                   ├─ IA
├─ IB                   ├─ IB
├─ IC                   ├─ IC
├─ VA                   ├─ PA
├─ VB                   ├─ PB
└─ VC                   └─ PC

Processing:
❌ Duplicates: IA, IB, IC (keep File 1, remove from File 2)
✓ Keep: VA, VB, VC, PA, PB, PC (new channels)

Output:
12 channels → 9 channels (removed 3)
```

### Example 3: Complete Merge with All Filters

```
Input:
File 1 (10:00:01)       File 2 (10:00:02)
├─ IA                   ├─ IA        ← Duplicate
├─ IB                   ├─ IB        ← Duplicate
├─ IC                   ├─ IC        ← Duplicate
├─ VA                   ├─ V_A       ← Similar (95%)
├─ VB                   ├─ V_B       ← Similar (95%)
└─ VC                   ├─ VN        ← New
                        └─ PA        ← New

Processing:
Remove Duplicates: IA, IB, IC (3 removed)
Remove Similar: V_A, V_B (2 removed)
Keep: VA, VB, VC, VN, PA

Total: 12 → 6 channels
Removed: 3 duplicates + 2 similar + 1 null = 6 total
```

## 🎨 Color & Status Indicators

```
┌────────────────────────────────────────┐
│ Status Indicators in UI                │
├────────────────────────────────────────┤
│ ✓ Green  = File ready / Successful     │
│ ⚠️ Yellow = Processing / Pending       │
│ ❌ Red   = Error / Issue               │
│ ⏳ Gray  = Inactive / Disabled         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Button States                          │
├────────────────────────────────────────┤
│ [🔍 Analyze]    = Primary (blue)       │
│ [✅ Combine]    = Success (green)      │
│ [🔄 Reset]      = Secondary (gray)    │
│ (Disabled)      = Grayed out           │
└────────────────────────────────────────┘
```

## 📱 Responsive Design

```
Desktop (1400px+):
┌─────────────────────────────────────────────┐
│  Settings Panel  │  Preview Panel           │
│  (Left 50%)      │  (Right 50%)             │
└─────────────────────────────────────────────┘

Tablet (1024px):
┌──────────────────────────────────────────┐
│  Settings Panel                          │
│  (Full width)                            │
├──────────────────────────────────────────┤
│  Preview Panel                           │
│  (Full width)                            │
└──────────────────────────────────────────┘

Mobile (<768px):
┌─────────────────────┐
│  Settings Panel     │
│  (Stacked)          │
├─────────────────────┤
│  Preview Panel      │
│  (Scrollable)       │
└─────────────────────┘
```

---

This visual guide helps understand the UI layout, workflow, and algorithms at a glance! 🎨✨
