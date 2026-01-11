# COMTRADE Combiner - Complete Architecture & Implementation

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   COMTRADE File Combiner UI                      │
│                    (index.html + styles.css)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
      ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
      │  File   │      │ Analysis│      │  Report │
      │  Panel  │      │  Panel  │      │  Tabs   │
      └────┬────┘      └────┬────┘      └────┬────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                    ┌────────▼────────┐
                    │   Application   │
                    │   Logic (app.js)│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼──────┐      ┌─────▼─────┐      ┌──────▼──────┐
   │  File     │      │  Combine  │      │   Report    │
   │  Parser   │      │  Logic    │      │ Generator   │
   └────┬──────┘      └─────┬─────┘      └──────┬──────┘
        │                   │                   │
   ┌────▼──────┐      ┌─────▼─────┐      ┌──────▼──────┐
   │Parse CFG  │      │Group by   │      │Analyze &    │
   │Parse DAT  │      │Time Window│      │Format       │
   │Match Pairs│      │Duplicates │      │Generate HTML│
   │Extract Ch │      │Similar    │      │Export JSON  │
   └───────────┘      └─────┬─────┘      └──────┬──────┘
                            │
                    ┌───────▼──────┐
                    │ Data         │
                    │ Exporter     │
                    └───────┬──────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
        ┌─────▼──────┐             ┌─────▼──────┐
        │Generate    │             │Generate    │
        │CFG File    │             │DAT File    │
        │(COMTRADE   │             │(COMTRADE   │
        │ 2013)      │             │ 2013)      │
        └────────────┘             └────────────┘
```

## Module Dependencies

### fileParser.js

```
INPUTS:
  - File: .cfg file (text)
  - File: .dat file (binary/text)

PROCESSING:
  - Parse CFG metadata (station, device, channels)
  - Parse DAT data values
  - Match CFG/DAT pairs

OUTPUTS:
  - parsedCfg: {station, device, channels, frequency, ...}
  - parsedDat: {data: [[values], ...], times: [0.01, 0.02, ...]}

EXPORTS:
  - parseCFG(file)
  - parseDAT(file)
  - matchFilePairs(files)
```

### combiner.js

```
INPUTS:
  - parsedFiles: Array of {cfg, dat}
  - timeWindow: Number (seconds)
  - removeDuplicates: Boolean
  - removeSimilar: Boolean
  - threshold: Number (0-1)

PROCESSING:
  - groupByTimeWindow(): Sort files, group if within window
  - findDuplicateChannels(): Find same-name channels
  - findSimilarChannels(): Find similar channels by name/unit
  - calculateChannelSimilarity(): Levenshtein distance algorithm
  - prepareCombinedFile(): Merge channels for a group

OUTPUTS:
  - groups: Array of grouped files
  - duplicates: Map of duplicate channels
  - similar: Array of similar channel pairs

EXPORTS:
  - groupByTimeWindow(files, window)
  - findDuplicateChannels(files)
  - findSimilarChannels(files, threshold)
  - prepareCombinedFile(group, options)
```

### reportGenerator.js

```
INPUTS:
  - groups: File groups
  - parsedData: All files
  - options: {removeDuplicates, removeSimilar, threshold}

PROCESSING:
  - generateReport(): Orchestrate all analysis
  - analyzeGroup(): Detailed group analysis
  - removeDuplicateChannels(): Filter duplicates
  - removeSimilarChannels(): Filter similar
  - findAndReportDuplicates(): Collect duplicate info
  - findAndReportSimilarChannels(): Collect similar info
  - generateHTML(): Format as HTML
  - generateGroupHTML(): Format per-group HTML

OUTPUTS:
  - report: {summary, groups[], statistics, duplicates, similar}
  - htmlReport: Formatted HTML string

EXPORTS:
  - generateReport(groups, files, options)
  - generateHTML(report)
```

### dataExporter.js

```
INPUTS:
  - group: Single file group
  - mergedChannels: Final channel list
  - report: Generated report

PROCESSING:
  - exportGroup(): Orchestrate export
  - generateCFG(): Create CFG content (COMTRADE 2013)
  - generateDAT(): Create DAT content (ASCII)
  - mergeGroupData(): Align data across files
  - createChannelMapping(): Map channels
  - generateFilename(): Create output filename
  - downloadFile(): Trigger browser download
  - generateMetadata(): Create JSON metadata

OUTPUTS:
  - cfgContent: String (CFG file)
  - datContent: String (DAT file)
  - filenames: Export filenames

EXPORTS:
  - exportGroup(group, channels)
  - generateCFG(config)
  - generateDAT(config)
  - downloadFiles(cfg, dat, filename)
  - generateMetadata(report)
```

### interpolation.js

```
INPUTS:
  - xData: Array of X values (times)
  - yData: Array of Y values (measurements)
  - targetX: Target position for interpolation
  - nearestIdx: Nearest point index (optimization)

PROCESSING:
  - linearInterpolate(): Basic linear interpolation
  - getInterpolatedValue(): Find surrounding points and interpolate
  - findNearestIndex(): Binary search for nearest value
  - interpolateArray(): Interpolate entire array
  - resampleData(): Change sampling rate
  - getInterpolationStats(): Calculate accuracy metrics

OUTPUTS:
  - interpolated value at target position
  - resampled array at new rate
  - statistical analysis

EXPORTS:
  - linearInterpolate(x1, y1, x2, y2, x)
  - getInterpolatedValue(xData, yData, targetX, nearestIdx)
  - findNearestIndex(arr, target)
  - interpolateArray(sourceX, sourceY, targetX)
  - resampleData(times, values, origRate, newRate)
```

## Data Flow

### Scenario: User loads 3 files and combines them

```
1. USER LOADS FILES
   ├─ Selects: file1.cfg, file1.dat, file2.cfg, file2.dat, file3.cfg, file3.dat
   └─ app.js → handleFileSelect()

2. USER CLICKS "ANALYZE"
   ├─ app.js → analyzeFiles()
   ├─ For each file pair:
   │  ├─ fileParser.parseCFG() → { station, device, channels, ... }
   │  ├─ fileParser.parseDAT() → { data, times }
   │  └─ Combine into parsedFiles[]
   │
   ├─ app.js → combiner.groupByTimeWindow()
   │  ├─ Sort by timestamp
   │  ├─ Group files within time window
   │  └─ Return groups[]
   │
   ├─ app.js → reportGenerator.generateReport()
   │  ├─ For each group:
   │  │  ├─ Collect all channels
   │  │  ├─ Remove duplicates
   │  │  ├─ Remove similar channels
   │  │  └─ Generate statistics
   │  │
   │  └─ Return comprehensive report
   │
   └─ Display in Analysis, Groups, Report tabs

3. USER CLICKS "COMBINE & EXPORT"
   ├─ For each group in report:
   │  ├─ dataExporter.exportGroup()
   │  │  ├─ generateCFG() → Creates CFG string
   │  │  ├─ generateDAT() → Creates DAT string
   │  │  └─ Returns filenames
   │  │
   │  ├─ downloadFiles(cfg, dat, filename)
   │  │  ├─ Create Blob for CFG
   │  │  ├─ Create Blob for DAT
   │  │  └─ Trigger downloads
   │  │
   │  └─ Files available for download
   │
   └─ Show "Report" tab with results

4. USER DOWNLOADS REPORT
   └─ downloadReport() → JSON file with all metadata
```

## Configuration Flow

```
┌─────────────────────────────────────────────────┐
│          User Configuration Input                │
├─────────────────────────────────────────────────┤
│ • Time Window (seconds)                         │
│ • Remove Duplicates (boolean)                   │
│ • Remove Similar (boolean)                      │
│ • Similarity Threshold (0.5-1.0)               │
└────────────────┬────────────────────────────────┘
                 │
    ┌────────────▼────────────┐
    │   analyzeFiles()        │
    │   - Read settings       │
    │   - Parse files         │
    │   - Group by time       │
    │   - Generate report     │
    └────────────┬────────────┘
                 │
    ┌────────────▼────────────┐
    │   combineFiles()        │
    │   - Apply filters       │
    │   - Generate CFG/DAT    │
    │   - Download files      │
    └────────────┬────────────┘
                 │
    ┌────────────▼────────────┐
    │   downloadReport()      │
    │   - Serialize report    │
    │   - Trigger download    │
    └────────────────────────┘
```

## Algorithm: Levenshtein Distance (Similarity)

Used to detect similar channel names:

```javascript
calculateStringSimilarity("Phase A Voltage", "Phase B Voltage")
  ├─ Compare character by character
  ├─ Count differences (edit distance = 1)
  ├─ similarity = (length - distance) / length
  └─ Result: 14/15 = 93% similar
```

Factors in similarity:

- **Type (30%)**: Analog vs Digital
- **Unit (20%)**: A vs V (ampere vs volt)
- **Name (50%)**: Levenshtein distance

## Algorithm: Time Window Grouping

Groups files based on timestamp proximity:

```javascript
groupByTimeWindow([file1, file2, file3], window=2)
  ├─ Sort all files by timestamp
  ├─ Start with file1, add to group
  ├─ For each subsequent file:
  │  ├─ Calculate time diff from group start
  │  ├─ If diff <= window: add to same group
  │  └─ Else: start new group
  └─ Return groups[]
```

Example with 2-second window:

```
File 1: 10:00:00.000
File 2: 10:00:00.500  ← Same group (0.5s < 2s)
File 3: 10:00:01.200  ← Same group (1.2s < 2s)
File 4: 10:00:02.500  ← NEW group (2.5s > 2s)
```

## Algorithm: Channel Deduplication

Simple name-based deduplication:

```
Input channels: [Phase A, Phase B, Phase A, Phase C]
  │
  ├─ Create lookup: {"Phase A": [], "Phase B": [], "Phase C": []}
  │
  ├─ First "Phase A": Add to Phase A list → output
  ├─ First "Phase B": Add to Phase B list → output
  ├─ Second "Phase A": Already in list → SKIP (duplicate)
  ├─ First "Phase C": Add to Phase C list → output
  │
  Output: [Phase A, Phase B, Phase C]
  Removed: 1 duplicate
```

## File Format Specifications

### CFG File (Text)

```
Line 1: STATION,DEVICE,VERSION
Line 2: n_analog,n_digital
Lines 3+: ch_num,name,phase,circuit,unit,a,b,skew,min,max,primary,secondary,ps
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

### DAT File (ASCII)

```
1,value1,value2,...
2,value1,value2,...
...
N,value1,value2,...
```

## Performance Considerations

### Time Complexity

- **Parse CFG**: O(n) where n = lines in file
- **Parse DAT**: O(m) where m = data samples
- **Group by time**: O(k log k) where k = files
- **Find duplicates**: O(k \* c²) where c = channels per file
- **Find similar**: O(k² \* c²) using Levenshtein

### Space Complexity

- **In-memory parsing**: O(m) for all samples
- **Report generation**: O(k \* c) for analysis data
- **Interpolation**: O(n) for new time points

### Optimization Tips

1. **Batch processing**: Process multiple files at once
2. **Caching**: Store parsed data for re-analysis
3. **Lazy loading**: Only interpolate when needed
4. **Streaming**: Parse large DAT files in chunks (future)

## Error Handling

```javascript
try {
  1. Validate file extensions (.cfg, .dat)
  2. Check file pair matching
  3. Parse CFG format validation
  4. DAT sample count verification
  5. Channel definition validation
  6. Time window parameter validation
} catch (error) {
  1. Display user-friendly error message
  2. Log detailed error to console
  3. Suggest corrective action
  4. Allow user to retry or reset
}
```

## Testing Considerations

### Unit Tests Needed

- [ ] fileParser: CFG/DAT parsing
- [ ] combiner: Time grouping, deduplication
- [ ] reportGenerator: Analysis accuracy
- [ ] dataExporter: CFG/DAT generation
- [ ] interpolation: Interpolation accuracy

### Integration Tests

- [ ] Multi-file combination workflow
- [ ] Report generation end-to-end
- [ ] File export and re-import
- [ ] Interpolation with vertical lines

### Sample Test Files

- Test files with 100, 1000, 10000 samples
- Different sampling rates (50Hz, 100Hz, 500Hz)
- Various channel counts (10, 100, 1000+)
- Edge cases (single channel, zero samples)

## Future Enhancements

### Phase 1: Core Features (Current)

- ✅ File combining
- ✅ Report generation
- ✅ Basic export
- ✅ Interpolation

### Phase 2: Advanced Features

- [ ] Binary DAT file support
- [ ] Time interpolation/alignment
- [ ] Custom naming patterns
- [ ] Batch processing UI
- [ ] Advanced visualization

### Phase 3: Integration

- [ ] Tauri/Node conversion
- [ ] File watching
- [ ] OS file dialogs
- [ ] System tray integration
- [ ] Command-line interface

### Phase 4: Enterprise

- [ ] Database storage
- [ ] Web API
- [ ] User accounts
- [ ] Audit logging
- [ ] Compliance reporting

---

**Architecture Version**: 1.0  
**Last Updated**: December 2025  
**Status**: Production Ready
