# Chart Container Overflow Fixes

## Problem Description
Charts and their containers were going outside the viewable area and getting cut off when the sidebar was opened or closed. The charts were not properly constrained within their parent containers.

## Root Causes Identified
1. **Missing `min-width: 0` on flex containers** - Flex items don't shrink below content size without this
2. **Excessive padding** - Chart containers had 20px padding that added to overflow
3. **Missing `box-sizing: border-box`** - Not all containers had proper sizing model
4. **Label and dragBar not fixed size** - They could expand/shrink unexpectedly
5. **uPlot charts not responsive to container changes** - Canvas elements weren't properly constrained
6. **Missing flex-shrink constraints** - Sidebar toggles weren't responsive

## Solutions Implemented

### 1. **#mainContent Container** (main.css lines 41-47)
```css
#mainContent {
  display: flex;
  flex-direction: column;
  min-width: 0;              /* ✅ Allow proper flex shrinking */
  box-sizing: border-box;    /* ✅ Include padding in width */
  overflow-x: hidden;        /* ✅ Prevent horizontal overflow */
}
```

### 2. **#charts Container** (main.css ~line 212)
```css
#charts {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  box-sizing: border-box;
  transition: width 0.3s ease, margin-left 0.3s ease, margin-right 0.3s ease;
  overflow: visible;         /* ✅ Allow content to show */
  min-width: 0;              /* ✅ Enforce flex shrinking */
}
```

### 3. **Chart Parent Container** (main.css lines 708-720)
```css
.chart-parent-container {
  display: flex;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  margin-bottom: 16px;
  overflow: hidden;          /* ✅ Clip overflowing content */
  transition: all 0.3s ease;
  height: 400px;
  resize: vertical;
  width: 100%;               /* ✅ Full width within parent */
  box-sizing: border-box;    /* ✅ Include border in width */
  min-width: 0;              /* ✅ Allow flex shrinking */
}
```

### 4. **Chart Label** (main.css lines 729-746)
```css
.chart-label {
  width: 100px;              /* ✅ Reduced from 120px */
  min-width: 100px;
  max-width: 100px;          /* ✅ Fixed size prevents growth */
  background: var(--bg-tertiary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 8px 4px;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  overflow-y: auto;          /* ✅ Vertical scrolling only */
  overflow-x: hidden;        /* ✅ Prevent horizontal overflow */
  word-wrap: break-word;
  gap: 4px;
  flex-shrink: 0;            /* ✅ Prevent from shrinking */
}
```

### 5. **Drag Bar** (main.css lines 752-768)
```css
.dragBar {
  width: 4px;
  background: var(--border-color);
  cursor: grab;
  display: flex;
  flex-direction: column;
  padding: 0;
  user-select: none;
  transition: all 0.2s ease;
  position: relative;
  flex-shrink: 0;            /* ✅ Fixed size prevents shrinking */
}

.dragBar:hover {
  background: var(--accent-cyan);
  width: 8px;
  margin-left: -2px;         /* ✅ Expand left to avoid pushing content */
}
```

### 6. **Chart Container** (main.css lines 777-787)
```css
.chart-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  padding: 12px;             /* ✅ Reduced from 20px */
  min-width: 0;              /* ✅ Allow flex shrinking */
  overflow: hidden;          /* ✅ Clip child overflow */
  box-sizing: border-box;    /* ✅ Include padding in sizing */
}
```

### 7. **uPlot Chart Elements** (main.css lines 819-835)
```css
.uplot {
  font-family: inherit;
  width: 100% !important;
  height: 100% !important;
  max-width: 100%;
  box-sizing: border-box;
}

.uplot .u-wrap {
  width: 100% !important;
  height: 100% !important;
  max-width: 100%;
  box-sizing: border-box;
}

.uplot canvas {
  width: 100% !important;
  height: 100% !important;
  max-width: 100%;
  display: block;
}
```

## Key CSS Principles Applied

1. **Flexbox min-width: 0** - Critical for flex shrinking. Without this, flex items won't shrink below their content size.

2. **box-sizing: border-box** - Ensures padding and borders are included in width/height calculations, preventing overflow surprises.

3. **flex-shrink: 0** - Applied to non-resizable elements (label, dragBar) to ensure they maintain their size while the chart shrinks.

4. **overflow handling** - Using `overflow: hidden` on containers to clip overflowing content, with `overflow-y: auto` on scrollable elements.

5. **100% width on flexible containers** - Ensures containers fill available space without causing overflow.

## Sidebar Behavior
When the sidebar opens/closes:
- `#mainContent` shrinks/expands due to `min-width: 0`
- `#charts` and `.chart-parent-container` respond due to `width: 100%` and `min-width: 0`
- Charts automatically resize via ResizeObserver in chartDomUtils.js
- All transitions are smooth (300ms) due to `transition` properties

## Testing Recommendations
1. Open/close the right sidebar (delta drawer) - charts should stay contained
2. Open/close the analysis sidebar - charts should resize smoothly
3. Resize the browser window - charts should remain within bounds
4. Check that no charts overflow horizontally or vertically
5. Verify that dragBar hover (width expansion) doesn't cause overflow
6. Test on different screen sizes

## Files Modified
- `c:\Users\shiva\OneDrive\Desktop\vite\random\styles\main.css`

## Lines Changed
- Lines 41-47: #mainContent styling
- Lines 708-720: .chart-parent-container styling
- Lines 729-746: .chart-label styling
- Lines 752-768: .dragBar styling
- Lines 777-787: .chart-container styling
- Lines 819-835: .uplot styling
- Line 212 area: #charts styling
