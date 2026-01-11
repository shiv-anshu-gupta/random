# COMTRADE File Combiner - Quick Start Guide

## ⚡ 30-Second Setup

### 1. Open the Tool

```bash
# Option A: Direct browser
cd comtrade-combiner
# Open index.html in your browser

# Option B: Local server (recommended)
python -m http.server 8000
# Then go to: http://localhost:8000/comtrade-combiner
```

### 2. Try It Out

```
1. Click "Select COMTRADE Files"
2. Pick some .cfg and .dat files from your test data
3. Set Time Window to 2 seconds
4. Click "🔍 Analyze Files"
5. Click "✅ Combine & Export" to see preview
```

## 📂 File Organization

```
COMTRADEv1/
├── src/                          ← Original main project
│   ├── main.js
│   ├── components/
│   └── utils/
│
└── comtrade-combiner/            ← NEW: Separate combiner tool
    ├── index.html                ← Open this to run
    ├── styles.css
    ├── src/
    │   ├── app.js
    │   └── utils/
    │       ├── fileParser.js
    │       └── combiner.js
    └── README.md
```

## 🧪 Test Scenarios

### Scenario 1: Basic Combining

```
Files:
- test_10-00-01.cfg/dat
- test_10-00-02.cfg/dat (1 sec later)
- test_10-00-05.cfg/dat (3 sec later)

Window: 2 seconds

Expected Result:
✓ Group 1: [test_10-00-01, test_10-00-02]
✓ Group 2: [test_10-00-05]
```

### Scenario 2: Duplicate Removal

```
File A channels: IA, IB, IC, VA, VB, VC
File B channels: IA, IB, IC, PA, PB, PC

Enable "Remove Duplicates"

Expected:
✓ IA, IB, IC removed from File B (duplicates)
✓ Keep: VA, VB, VC, PA, PB, PC
```

### Scenario 3: Similar Channel Detection

```
File A: IA, IB, IC (Current)
File B: I_A, I_B, I_C (Current) ← Slightly different naming

Enable "Remove Similar" at 0.95 threshold

Expected:
✓ I_A, I_B, I_C marked as similar to IA, IB, IC
✓ Recommends removal (95% match is very similar)
```

## 🎯 Key Features to Test

| Feature               | How to Test              | Expected Behavior               |
| --------------------- | ------------------------ | ------------------------------- |
| **File Upload**       | Select multiple files    | Shows paired .cfg/.dat files    |
| **Time Window**       | Set to 1, 2, 5 seconds   | Groups change based on setting  |
| **Analysis**          | Click "Analyze"          | Shows file count & channel info |
| **Duplicates**        | Toggle checkbox          | Count of duplicates changes     |
| **Similar Detection** | Adjust threshold 0.5-1.0 | More/fewer matches found        |
| **Modal Preview**     | Click "Combine"          | Shows export summary            |

## 💾 How to Use Results

After analysis, the preview shows:

```
Group 1
├── Files: file1.cfg, file2.cfg
├── Original Channels: 12
├── Duplicates Removed: 2
├── Similar Removed: 1
└── Final Channels: 9 ✓
```

**These statistics help you:**

- Verify the combine operation is correct
- Adjust settings if too many/few channels removed
- Confirm file grouping is as expected
- Get channel count before export

## 🔍 Debugging Tips

### Files Not Showing

```
❌ "No matching .cfg and .dat pairs found"
→ Make sure you have BOTH .cfg and .dat for each file
→ Names must match: file.cfg + file.dat
```

### Time Window Not Working

```
❌ All files in separate groups
→ Increase time window value (current setting too small)
→ Check file timestamps (might be too far apart)
```

### All Channels Removed?

```
❌ Too many similar channels detected
→ Increase similarity threshold (less strict)
→ Or disable "Remove Similar" to debug
```

## 📊 Understanding the Algorithm

### Levenshtein Distance

Used to find "nearly identical" channel names:

```
"IA" vs "I_A"     → 95% similar (1 char difference)
"Phase_A" vs "PA" → 35% similar (very different)
"IA" vs "IA"      → 100% identical (exact match)
```

### Similarity Score

Final score combines three factors:

- Type matching (30%): Digital vs Analog
- Unit matching (20%): Volts vs Amps
- Name similarity (50%): String distance

## 🚀 Next Steps

### When Ready to Integrate:

1. Copy `src/utils/combiner.js` and `fileParser.js` to main project
2. Import these in `src/main.js`
3. Add a "Combine Files" button to main UI
4. Call combiner functions from there

### For Now:

- Test different scenarios
- Modify threshold values
- Check algorithm correctness
- Get feedback from Sir

## ❓ Common Questions

**Q: Can I modify the threshold while analyzing?**
A: Yes! Change any setting and click "Analyze" again

**Q: Will this modify my original files?**
A: No! It only creates a preview. Nothing is exported yet.

**Q: How do I export the combined files?**
A: The export function is ready to implement. Currently shows preview only.

**Q: Can I use this with non-COMTRADE files?**
A: Currently COMTRADE only. Can be extended later.

**Q: Is this separate from the main viewer?**
A: Yes! Completely independent. Integration comes later.

## 📞 Support

If something doesn't work:

1. Check browser console (F12 → Console tab)
2. Check file pair matching first
3. Try with simpler test files
4. Reduce settings complexity (disable similar detection)

---

**Happy Testing! 🎉**

Once you're satisfied with the dummy implementation, we can integrate this into the main project.
