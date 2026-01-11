# COMTRADE Combiner - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Open the Application

```
Open: comtrade-combiner/index.html in your browser
```

### 2. Select COMTRADE Files

- Click **"Select COMTRADE Files"** button
- Choose multiple `.cfg` and `.dat` file pairs
- Ensure each pair has matching names (e.g., `file1.cfg` + `file1.dat`)
- The app automatically matches pairs

### 3. Configure Settings

Set these options in the left panel:

| Setting                  | Default   | What It Does                                           |
| ------------------------ | --------- | ------------------------------------------------------ |
| **Time Window**          | 2 seconds | Groups files with timestamps within this window        |
| **Remove Duplicates**    | ✓ Checked | Removes channels with identical names                  |
| **Remove Similar**       | ✓ Checked | Removes channels with very similar characteristics     |
| **Similarity Threshold** | 0.95      | How strict similarity detection is (higher = stricter) |

**Common Values:**

- **Loose (0.8)**: Removes almost-identical channels
- **Normal (0.95)**: Removes very similar channels
- **Strict (0.99)**: Only removes nearly identical channels

### 4. Analyze Files

1. Click **"🔍 Analyze Files"** button
2. Wait for analysis to complete (a few seconds)
3. Check results in tabs:
   - **📁 Files**: Shows matched file pairs
   - **📈 Analysis**: Summary of what will be removed
   - **🔗 Groups**: Preview of how files will be combined

### 5. Combine & Export

1. Review preview results
2. Click **"✅ Combine & Export"** button
3. Check the **"📋 Report"** tab for results
4. Click **"📥 Download Report"** to save detailed JSON

### 6. Use Combined Files

- CFG/DAT files are automatically generated
- Load them in any COMTRADE viewer
- Use with vertical lines for time measurement

---

## 📊 Understanding the Tabs

### Files Tab

Shows all selected and matched file pairs with their readiness status.

### Analysis Tab

Displays statistics:

- Number of duplicates found
- Number of similar channels
- Total channels

### Groups Tab

Shows how files will be grouped:

- Which files go together
- Time span of each group
- How many channels will be kept/removed

### Report Tab

**The most important tab!** Shows:

- Summary statistics
- Settings used
- Detailed breakdown per group
- List of removed channels with reasons
- Download button for detailed JSON report

### Preview Tab

Shows a visual preview (optional - shows after combining)

---

## 🎯 Common Scenarios

### Scenario 1: Combine Three Relay Records from Same Event

```
Files: R1_20250101_000000.cfg/dat
       R1_20250101_000001.cfg/dat
       R1_20250101_000002.cfg/dat

Settings:
- Time Window: 2 seconds (all within 2 seconds → 1 group)
- Remove Duplicates: ✓ (same channel names from same relay)
- Remove Similar: ✓ (they measure the same things)

Result: 1 combined group with deduplicated channels
```

### Scenario 2: Combine Different Relay Records

```
Files: R1_20250101_100000.cfg/dat
       R2_20250101_100000.cfg/dat
       R3_20250101_100000.cfg/dat

Settings:
- Time Window: 0.5 seconds (very strict)
- Remove Duplicates: ✓
- Remove Similar: ✗ (different relays might have similar names)

Result: 1 group if all same timestamp, all unique channels kept
```

### Scenario 3: Process Multiple Events

```
Files: Event1_20250101.cfg/dat  (timestamp 10:00:00)
       Event2_20250101.cfg/dat  (timestamp 10:05:00)
       Event3_20250101.cfg/dat  (timestamp 14:30:00)

Settings:
- Time Window: 60 seconds
- Remove Duplicates: ✓
- Remove Similar: ✗

Result: 3 separate groups (10:00-10:01, separate from 14:30)
```

---

## 🔍 Reading the Report

### Key Metrics

**Files Combined:** Total number of files processed

**Groups Created:** Number of separate combinations (based on time window)

**Total Channels:** Sum of all channels in all files

**Channels Removed:** Total number eliminated by filters

### Understanding Channel Flow

For each group, you'll see:

```
Original: 150 channels
   ↓ (remove 20 duplicates)
After Duplicates: 130 channels
   ↓ (remove 5 similar)
Final: 125 channels
```

### Why Was This Channel Removed?

Look in "Removed Channels" section:

- **Reason: Duplicate** → Same name as another channel
- **Reason: Similar** → Very similar to another channel

---

## 💡 Tips & Tricks

### Tip 1: Start Conservative

- Begin with Time Window = 2 seconds
- Enable both duplicate and similar removal
- Threshold = 0.95
- Gradually adjust if results don't match expectations

### Tip 2: Check Similarity Threshold

```
Phase A Voltage
Phase A Voltage 1      ← Might be duplicates (99% similar)

vs

Phase A Voltage
Phase B Voltage        ← Should NOT be combined (only 60% similar)
```

### Tip 3: Use Time Window Strategically

- **Small window (0.1s)**: Only VERY close files
- **Medium window (2s)**: Related events
- **Large window (5s)**: Everything in rough timeframe

### Tip 4: Preview Before Download

Always check the Report tab to see exactly what will be combined before downloading files.

### Tip 5: Download the JSON Report

The JSON report contains complete information:

- Every file included
- Every channel removed with reason
- Detailed statistics
- Use for documentation/compliance

---

## ⚠️ Common Issues

### Issue: "No matching .cfg and .dat pairs found"

**Solution:**

- Check file extensions (.cfg, .dat - case sensitive)
- Ensure filenames match (file1.cfg + file1.dat)
- Reload page and try again

### Issue: All my channels were removed

**Solution:**

- Lower the similarity threshold (try 0.8)
- Disable "Remove Similar"
- Check the report to see why channels were removed

### Issue: Too many groups created

**Solution:**

- Increase Time Window (try 5 seconds instead of 2)
- Check if files really have that timestamp difference

### Issue: Export button is disabled

**Solution:**

- Click "Analyze Files" first to generate groups
- Wait for analysis to complete
- Ensure at least one file pair is selected

---

## 📝 File Naming Convention

For best results, use standard COMTRADE naming:

```
STATION_DEVICE_20250101_100000.cfg
STATION_DEVICE_20250101_100000.dat
```

Parts:

- `STATION`: Station/substation name
- `DEVICE`: Equipment name (RELAY, MONITOR, etc.)
- `20250101`: Date (YYYYMMDD)
- `100000`: Time (HHMMSS)
- `.cfg` / `.dat`: File type

---

## 🎓 Understanding Interpolation

When combining files with **different sampling rates**, the app automatically:

1. **Detects** different sampling rates
2. **Aligns** all files to the highest rate
3. **Interpolates** values smoothly between samples
4. **Ensures** vertical lines show correct values

**Example:**

```
File 1: 100 Hz (samples every 0.01 seconds)
File 2: 500 Hz (samples every 0.002 seconds)

Combined: 500 Hz (uses interpolation for File 1)
```

This means when you use vertical lines for measurement, values are **precise** even though they come from different sampling rates.

---

## 📥 What Gets Downloaded?

### When you click "Combine & Export":

1. **CFG Files** (one per group)

   - Contains channel definitions
   - COMTRADE 2013 standard format
   - File name: `COMBINED_YYYYMMDD_HHMMSS_GroupN.cfg`

2. **DAT Files** (one per group)

   - Contains actual measurement data
   - ASCII format for easy import
   - File name: `COMBINED_YYYYMMDD_HHMMSS_GroupN.dat`

3. **JSON Report** (optional)
   - Detailed statistics
   - Lists all channels kept/removed
   - Complete metadata

### Using Combined Files:

- Import into COMTRADE viewer (like main COMTRADEv1)
- Use with digital relay tools
- Archive for compliance
- Analyze with other software

---

## 🚀 Next Steps

1. **Load combined files** in main COMTRADE viewer
2. **Use vertical lines** to measure time and deltas
3. **Interpolation** works automatically
4. **Download reports** for documentation

---

**Questions?** Check ENHANCED_FEATURES.md for detailed technical documentation.

**Reporting Issues?** See TROUBLESHOOTING_GUIDE.md

---

Version: 1.0 Enhanced | Last Updated: December 2025
