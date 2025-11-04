# Text Warp Quality Improvement Plan

## Current Problem
The current implementation uses simple `warpOffset()` which just moves glyphs around. This produces:
- Poor quality transformations
- Inconsistent spacing
- No proper mesh/envelope distortion
- Limited to simple offset calculations

## Solution Options

### Option 1: Integrate Existing `textWarp.ts` (Recommended First Step)
**Pros:**
- Already written, just needs integration
- No new dependencies
- Better quality than current (glyph slicing approach)
- Fast enough for real-time editing

**Cons:**
- Still canvas-based (not vector)
- Limited compared to Paper.js

**Implementation:**
- Replace `warpOffset()` calls with `renderWarpedText()` from `textWarp.ts`
- Map new warp types to `textWarp.ts` modes
- Keep `arch` type for curved text (uses existing arc math)

### Option 2: Integrate Paper.js (Best Quality)
**Pros:**
- Vector-based transformations
- Professional quality (like Kittl)
- Proper mesh/envelope distortion
- Perspective warping
- Export to SVG/vector formats

**Cons:**
- New dependency (~200KB)
- More complex integration
- Performance considerations for real-time editing

**Implementation:**
- Install `paper` package
- Convert text to Paper.js paths
- Apply envelope/mesh transformations
- Render to canvas for preview
- Export vector data for final output

## Recommended Approach

**Phase 1: Quick Win (1-2 hours)**
1. Integrate `textWarp.ts` for non-arch warps
2. Map new warp types to appropriate modes:
   - `distort` → `bulge` mode
   - `circle` → custom (or `bulge` with radial)
   - `wave` → `flag` mode
   - `flag` → `flag` mode  
   - `rise` → custom vertical offset
   - `angle` → custom transform
   - `custom` → combination

**Phase 2: Paper.js (if needed, 4-8 hours)**
1. Install and configure Paper.js
2. Create text-to-path conversion
3. Implement envelope distortion
4. Integrate with existing rendering pipeline
5. Add export to SVG option

## Next Steps

Would you like me to:
1. **Integrate `textWarp.ts` now** (quick improvement)
2. **Set up Paper.js integration** (best quality)
3. **Both** (start with textWarp.ts, then Paper.js)

