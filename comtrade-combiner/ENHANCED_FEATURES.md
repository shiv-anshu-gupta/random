# COMTRADE File Combiner - Enhanced Version

**Complete Independent Application for Merging Multiple COMTRADE 2013 Files**

## Overview

The COMTRADE File Combiner is a standalone web-based application that allows you to:

1. ✅ **Combine multiple COMTRADE files** based on configurable time windows
2. ✅ **Remove duplicate channels** (same names)
3. ✅ **Remove nearly identical channels** (based on similarity threshold)
4. ✅ **Generate comprehensive reports** with merge statistics
5. ✅ **Export combined files** as CFG/DAT pairs in COMTRADE 2013 format
6. ✅ **Interpolate values on-the-fly** for different sampling rates
7. ✅ **Preview merged data** with charts
8. ✅ **Download detailed reports** as JSON

## Key Features

### 1. Time Window Based Combination

- Configure window length in seconds (e.g., 2 seconds)
- All files with timestamps within the window are automatically grouped
- Files outside the window are placed in separate groups

### 2. Channel Management

- **Remove Duplicates**: Eliminates channels with identical names
- **Remove Similar**: Detects channels with nearly identical characteristics
- **Configurable Threshold**: Set similarity detection threshold (0.5 - 1.0)

### 3. Comprehensive Reporting

The system generates detailed reports showing:

- **Files Combined**: Which files were merged into each group
- **Time Information**: Min/max time window for each group
- **Channel Statistics**:
  - Original channel count
  - Channels removed (duplicates)
  - Channels removed (similar)
  - Final merged channel count
- **Channel Movement**: Lists all merged channels with sources
- **Removed Channels**: Details on why channels were removed

### 4. Interpolation Support

- Linear interpolation for different sampling rates
- On-the-fly value calculation for vertical lines
- Accurate position calculation across multiple rates

### 5. Export Functionality

- Export combined files as CFG/DAT pairs
- COMTRADE 2013 standard compliant format
- Download detailed JSON reports
- Preserve metadata and channel information

## File Structure

```
comtrade-combiner/
├── index.html                    # Main UI with tabs
├── styles.css                    # Enhanced styling
├── src/
│   ├── app.js                    # Main application logic
│   ├── utils/
│   │   ├── fileParser.js         # CFG/DAT parsing
│   │   ├── combiner.js           # Core combining logic
│   │   ├── reportGenerator.js    # Report generation
│   │   ├── dataExporter.js       # Export to CFG/DAT
│   │   └── interpolation.js      # Linear interpolation
│   ├── plugins/
│   │   └── verticalLinePluginEnhanced.js (optional)
│   └── components/
│       └── previewViewer.js      # Chart preview (optional)
```

## Usage Guide

### Step 1: Load Files

1. Click "Select COMTRADE Files" button
2. Choose multiple .cfg and .dat file pairs
3. Ensure file pairs are properly named (file.cfg + file.dat)

### Step 2: Configure Settings

- **Time Window**: Set window length (seconds) for grouping
- **Remove Duplicates**: Check to remove same-name channels
- **Remove Similar**: Check to detect similar channels
- **Similarity Threshold**: 0.95 = very similar, 0.5 = somewhat similar

### Step 3: Analyze

1. Click "🔍 Analyze Files" button
2. View analysis in the "Analysis" tab
3. Review group combinations in the "Groups" tab
4. Check which channels will be removed

### Step 4: Combine

1. Click "✅ Combine & Export" button
2. System processes all groups
3. Results appear in the "Report" tab
4. Review detailed combination report

### Step 5: Export

1. Review the report in the "Report" tab
2. Click "📥 Download Report (JSON)" for detailed data
3. CFG/DAT files are automatically generated for each group

## Configuration Examples

### Example 1: Strict Window (0.5 seconds)

```
Time Window: 0.5 seconds
Remove Duplicates: ✓
Remove Similar: ✓ (95% threshold)
Result: Only files very close in time are combined
```

### Example 2: Loose Window (5 seconds)

```
Time Window: 5 seconds
Remove Duplicates: ✓
Remove Similar: ✗
Result: Files within 5-second window are grouped, all channels kept
```

### Example 3: Clean Combination (Aggressive)

```
Time Window: 2 seconds
Remove Duplicates: ✓
Remove Similar: ✓ (80% threshold - more lenient)
Result: Maximum cleanup, fewer final channels but all unique
```

## Report Details

### Summary Section

- Total files processed
- Number of groups created
- Total channels before/after removal
- Channels removed count

### Settings Used

- Time window configuration
- Duplicate removal status
- Similar channel removal status
- Similarity threshold

### Per-Group Details

For each combined group:

- **Files Included**: List with timestamps
- **Time Span**: Duration of grouping
- **Channel Analysis**: Visual flow showing:
  - Original channels → After duplicates removed → After similar removed
- **Merged Channels**: Full list of channels in final output
- **Removed Channels**: Details on why each channel was removed

### Duplicate Channels Section

- Lists all duplicate channel names found
- Shows which files contain duplicates

### Similar Channels Section

- Lists channel pairs with high similarity
- Shows similarity percentage
- Identifies which file each channel comes from

## Data Export Format

### CFG File Format (COMTRADE 2013)

```
MERGED,COMBINER,2013
n_analog,n_digital
ch_1,name_1,...
...
frequency
1
frequency,sample_count
timestamp
timestamp
ASCII
0
0

```

### DAT File Format (ASCII)

```
1,value1,value2,...
2,value1,value2,...
...
```

## Advanced Features

### Interpolation System

When combining files with different sampling rates:

- Automatically detects sampling rate differences
- Uses linear interpolation for smooth transitions
- Calculates exact values at any time point
- Works seamlessly with vertical line markers

**Formula Used:**

```
y = y1 + (x - x1) × (y2 - y1) / (x2 - x1)
```

Where:

- x1, x2 = time values at surrounding samples
- y1, y2 = values at those samples
- x = target time for interpolation
- y = interpolated value

### Similarity Detection Algorithm

Channels are compared using:

- **Type Match** (30% weight): Analog vs Digital
- **Unit Match** (20% weight): Same measurement unit
- **Name Similarity** (50% weight): Levenshtein distance algorithm

Final similarity = weighted average of all three

### Channel Mapping

- Preserves channel relationships during merge
- Maintains scale and offset information
- Preserves unit information
- Tracks source file for each channel

## Limitations & Notes

### Current Limitations

1. ASCII DAT files only (no binary support yet)
2. Simple time-based concatenation (no time interpolation)
3. Basic file naming conventions
4. No multi-rate resampling in export (yet)

### Future Enhancements

- [ ] Binary DAT file support
- [ ] Time interpolation/alignment
- [ ] Custom file naming patterns
- [ ] Pre-processing filters
- [ ] Tauri/Node integration for OS-specific file scanning
- [ ] Batch processing from directories
- [ ] Advanced visualization of merging decisions

## Integration with Main Project

### Connecting to Main COMTRADE Viewer

1. Export combined files from the combiner
2. Load exported CFG/DAT files in main viewer
3. Vertical lines use interpolation automatically
4. Delta calculations work across sampling rates

### Using Combined Files

- Combined files are valid COMTRADE 2013 files
- Compatible with any COMTRADE reader
- Interpolation works seamlessly in vertical line plugin
- No special processing needed

## Development Notes

### Key Modules

#### reportGenerator.js

- Analyzes combination results
- Generates detailed statistics
- Creates HTML-formatted reports
- Exports JSON metadata

#### interpolation.js

- Linear interpolation functions
- Array resampling
- Position calculations
- Error metrics

#### dataExporter.js

- CFG/DAT generation
- File download handling
- Channel mapping
- Metadata export

#### combiner.js

- Time window grouping
- Duplicate detection
- Similarity calculation
- Channel filtering

### Example: Using Interpolation

```javascript
import { linearInterpolate, getInterpolatedValue } from './utils/interpolation.js';

// Find value at time 0.5 seconds
const times = [0.0, 0.1, 0.2, ..., 1.0];
const values = [100, 110, 120, ..., 200];
const interpolatedValue = getInterpolatedValue(times, values, 0.5, 5);
// Returns interpolated value at time 0.5
```

### Example: Using Report Generator

```javascript
import ReportGenerator from "./utils/reportGenerator.js";

// Generate comprehensive report
const report = ReportGenerator.generateReport(groups, parsedData, {
  removeDuplicates: true,
  removeSimilar: true,
  similarityThreshold: 0.95,
  timeWindow: 2,
});

// Generate HTML
const html = ReportGenerator.generateHTML(report);
document.getElementById("reportDiv").innerHTML = html;

// Download as JSON
ComtradeDataExporter.downloadFile(
  JSON.stringify(report, null, 2),
  "report.json",
  "application/json"
);
```

## Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **File Processing**: FileReader API, Blob API
- **Data Structures**: Arrays, Objects, Maps
- **Algorithms**: Levenshtein distance, Linear interpolation
- **Standards**: COMTRADE 2013

## Future: Tauri/Node Integration

When converting to standalone application:

- Use Tauri or Node.js for OS-specific file scanning
- Watch directories for new COMTRADE files
- Batch processing capabilities
- System tray integration
- File association (double-click CFG to open)

## Support & Documentation

For detailed implementation guides:

- See `QUICK_START.md` for first-time users
- See `IMPLEMENTATION_SUMMARY.md` for architecture
- Check `TROUBLESHOOTING_GUIDE.md` for common issues

## License

Part of COMTRADEv1 project - Educational and research use

---

**Last Updated**: December 2025  
**Version**: 1.0 Enhanced  
**Status**: Production Ready
