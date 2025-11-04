# Kittl-Style Text Features Implementation Plan

## Overview
This document outlines a comprehensive plan to implement Kittl-style text editing features for the Wallflower AI t-shirt design editor. The focus is on making text editing as powerful and intuitive as Kittl's implementation.

## Current State Analysis

### ✅ Already Implemented
1. **Basic Text Shape (KText)**
   - Text content editing
   - Font family, weight, size
   - Letter spacing, line height
   - Text alignment (left, center, right)

2. **Fill Effects**
   - Solid color fill
   - Linear gradient (from, to, angle)

3. **Stroke/Outline**
   - Basic stroke color and width
   - SVG stroke rendering

4. **Shadow**
   - Basic drop shadow (dx, dy, blur, color, opacity)
   - SVG filter-based rendering

5. **Extrude/3D**
   - Basic depth effect (depth, step, color, opacity)
   - Stacked text copies for depth illusion

6. **Text Warping**
   - Basic arch transformation
   - Curved text along arc path
   - `textWarp.ts` library exists but not fully integrated

7. **Type System**
   - `TextEffect[]` types defined in `types/textEffects.ts`
   - Helper functions for legacy compatibility

### ❌ Needs Implementation

1. **Advanced Text Warping**
   - Wave/Flag warping (amplitude, frequency, phase)
   - Bulge warping (radial distortion)
   - Perspective warping (4-point envelope)
   - Integration of `textWarp.ts` library with KText

2. **Advanced Shadow System**
   - Multiple shadows (stack)
   - Shadow spread
   - Inner shadows
   - Shadow color stops/gradients
   - Better blur algorithms

3. **Advanced Stroke System**
   - Inside/outside/center alignment
   - Join types (miter, round, bevel)
   - Miter limit control
   - Offset outlines (outside offset)
   - Multiple stroke layers

4. **Enhanced Extrude/3D**
   - Better depth rendering (smooth gradients)
   - Angle control for perspective
   - Shadow integration with extrude
   - Multiple extrude directions

5. **Texture/Pattern Fills**
   - Image texture loading
   - Blend modes (multiply, screen, overlay, etc.)
   - Texture scaling and offset
   - Clip texture to text shape

6. **Font Templates/Presets**
   - Pre-defined style combinations
   - Save/load custom templates
   - Quick apply buttons
   - Common design presets (vintage, modern, etc.)

7. **Effects Stack System**
   - Migrate from legacy props to `TextEffect[]`
   - Layer-based effect system
   - Effect ordering (fill → stroke → shadow → extrude)
   - Effect enable/disable toggles

8. **UI/UX Improvements**
   - Visual effect previews
   - Better organized inspector panels
   - Real-time preview of effects
   - Drag-and-drop effect reordering

---

## Implementation Phases

### Phase 1: Core Warping System (Priority: HIGH)
**Goal**: Get text warping working properly with all modes

#### Tasks:
1. **Integrate textWarp.ts with KText shape**
   - [ ] Add `warpMode` and `warpParams` to KText props
   - [ ] Create canvas-based rendering path for warped text
   - [ ] Update KText component to use `renderWarpedText()` when warp is active
   - [ ] Handle SVG path text for curved mode vs canvas for warped mode

2. **Implement all warp modes**
   - [ ] Wave/Flag: amplitude, frequency, phase controls
   - [ ] Bulge: intensity, direction controls
   - [ ] Perspective: 4-point corner controls (interactive handles)
   - [ ] Arc: integrate existing arch system

3. **UI Controls for Warping**
   - [ ] Warp mode selector (dropdown or buttons)
   - [ ] Mode-specific parameter controls
   - [ ] Visual preview of warp effect
   - [ ] Reset to normal button

**Files to Modify:**
- `shapes/KText.tsx` - Add warping support
- `components/CanvasEditorTldraw.tsx` - Add warp controls to KTextInspector
- `lib/textWarp.ts` - Ensure all modes work correctly

**Estimated Time**: 2-3 days

---

### Phase 2: Enhanced Effects System (Priority: HIGH)
**Goal**: Migrate to effects stack and improve all effects

#### Tasks:
1. **Refactor to Effects Stack**
   - [ ] Update KText to use `effects?: TextEffect[]` as primary system
   - [ ] Keep legacy props for backward compatibility (convert on load)
   - [ ] Create effect management helpers (add, remove, reorder, update)
   - [ ] Ensure effects render in correct order

2. **Enhance Shadow System**
   - [ ] Support multiple shadows (array)
   - [ ] Add shadow spread property
   - [ ] Improve shadow rendering (better blur)
   - [ ] Add inner shadow option
   - [ ] Shadow color with opacity/alpha

3. **Enhance Stroke System**
   - [ ] Implement inside/outside/center alignment
   - [ ] Add join type controls (miter, round, bevel)
   - [ ] Add miter limit control
   - [ ] Support offset outlines
   - [ ] Multiple stroke layers (double stroke)

4. **Enhance Extrude System**
   - [ ] Better depth rendering (smooth color transitions)
   - [ ] Add angle control for perspective
   - [ ] Integrate shadow with extrude layers
   - [ ] Improve performance (optimize layer rendering)

**Files to Modify:**
- `shapes/KText.tsx` - Effects stack rendering
- `types/textEffects.ts` - Add missing effect properties
- `components/CanvasEditorTldraw.tsx` - Enhanced effect controls

**Estimated Time**: 3-4 days

---

### Phase 3: Texture & Pattern Fills (Priority: MEDIUM)
**Goal**: Add texture/pattern capabilities to text

#### Tasks:
1. **Texture Loading**
   - [ ] Add texture upload/browse functionality
   - [ ] Support image URLs and local files
   - [ ] Texture asset management

2. **Texture Rendering**
   - [ ] Implement canvas-based texture fill
   - [ ] Clip texture to text shape
   - [ ] Support scaling and offset
   - [ ] Pattern tiling options

3. **Blend Modes**
   - [ ] Implement blend modes (multiply, screen, overlay, soft-light, hard-light)
   - [ ] Canvas composite operations
   - [ ] Opacity control

4. **UI Controls**
   - [ ] Texture picker/uploader
   - [ ] Blend mode selector
   - [ ] Scale/offset controls
   - [ ] Texture preview thumbnail

**Files to Create/Modify:**
- `lib/textureRenderer.ts` - New texture rendering utilities
- `shapes/KText.tsx` - Add texture effect support
- `components/CanvasEditorTldraw.tsx` - Texture controls

**Estimated Time**: 2-3 days

---

### Phase 4: Font Templates & Presets (Priority: MEDIUM)
**Goal**: Create a template system for quick style application

#### Tasks:
1. **Template System Architecture**
   - [ ] Define template data structure
   - [ ] Template storage (localStorage or database)
   - [ ] Template loading/saving logic

2. **Pre-built Templates**
   - [ ] Create 10-15 common style templates
   - [ ] Categories: Vintage, Modern, Bold, Elegant, Playful, etc.
   - [ ] Template preview thumbnails

3. **Template UI**
   - [ ] Template gallery/picker
   - [ ] Quick apply button
   - [ ] Save current style as template
   - [ ] Edit/delete custom templates

4. **Template Application**
   - [ ] Apply all effects from template
   - [ ] Preserve text content
   - [ ] Handle missing fonts gracefully

**Files to Create/Modify:**
- `lib/textTemplates.ts` - Template management
- `components/TextTemplatePicker.tsx` - New component
- `components/CanvasEditorTldraw.tsx` - Integrate template picker

**Estimated Time**: 2 days

---

### Phase 5: UI/UX Enhancements (Priority: MEDIUM)
**Goal**: Improve the text editing experience

#### Tasks:
1. **Inspector Panel Improvements**
   - [ ] Reorganize into collapsible sections
   - [ ] Add visual effect previews (small thumbnails)
   - [ ] Better spacing and typography
   - [ ] Tooltips for all controls

2. **Real-time Preview**
   - [ ] Live preview of all effects
   - [ ] Smooth transitions when changing values
   - [ ] Performance optimization

3. **Effect Stacking UI**
   - [ ] Visual list of active effects
   - [ ] Drag to reorder effects
   - [ ] Enable/disable toggles
   - [ ] Edit effect button

4. **Better Warp Controls**
   - [ ] Interactive warp preview
   - [ ] Visual handles for perspective warp
   - [ ] Preset warp intensities

**Files to Modify:**
- `components/CanvasEditorTldraw.tsx` - Complete UI overhaul
- `components/EffectStackPanel.tsx` - New component for effect management

**Estimated Time**: 3-4 days

---

### Phase 6: Advanced Features (Priority: LOW)
**Goal**: Polish and advanced capabilities

#### Tasks:
1. **Performance Optimization**
   - [ ] Debounce effect updates
   - [ ] Canvas rendering optimization
   - [ ] Lazy loading of effects

2. **Accessibility**
   - [ ] Keyboard shortcuts for common actions
   - [ ] Screen reader support
   - [ ] Focus management

3. **Advanced Text Features**
   - [ ] Text along custom paths
   - [ ] Text on shapes (circle, rectangle, etc.)
   - [ ] Multi-line text handling improvements

**Estimated Time**: 2-3 days

---

## Technical Architecture

### Rendering Strategy

**Option 1: Canvas-Based (Recommended for Warping)**
- Use HTML5 Canvas for warped text rendering
- Convert to image/svg when needed
- Better control over complex effects
- Performance considerations for many text layers

**Option 2: SVG-Based (Current)**
- Good for simple effects
- Scalable and crisp
- Limited warping capabilities
- Good performance

**Hybrid Approach (Recommended)**
- Use SVG for simple cases (no warp, basic effects)
- Use Canvas for complex warping
- Cache rendered results
- Fallback to SVG when canvas unavailable

### Data Structure

```typescript
// KText props structure (with effects stack)
{
  text: string
  fontFamily: string
  fontWeight: number
  sizePx: number
  letterSpacing: number
  lineHeight: number
  align: 'start' | 'middle' | 'end'
  
  // Warping
  warpMode: 'none' | 'arc' | 'bulge' | 'flag' | 'perspective'
  warpParams: WarpParams
  
  // Effects stack (primary system)
  effects?: TextEffect[]
  
  // Legacy props (for backward compatibility)
  fill?: string
  gradient?: {...}
  stroke?: string
  strokeWidth?: number
  shadow?: {...}
  extrude?: {...}
  
  // Geometry
  w: number
  curved?: boolean // legacy
  radius?: number // legacy
  arc?: number // legacy
}
```

### Effect Rendering Order

1. **Background Layer**: Extrude effect (behind)
2. **Shadow Layer**: All shadows (behind text)
3. **Stroke Layer**: Outline/stroke (on text edge)
4. **Fill Layer**: Solid/gradient/texture fill
5. **Foreground Effects**: Any overlay effects

---

## Implementation Details

### Warping Integration

```typescript
// In KText component
if (warpMode !== 'none') {
  // Use canvas-based rendering
  return <CanvasWarpedText {...props} />
} else if (curved) {
  // Use SVG textPath
  return <SVGCurvedText {...props} />
} else {
  // Use SVG text
  return <SVGText {...props} />
}
```

### Effects Stack Rendering

```typescript
function renderEffectsStack(
  ctx: CanvasRenderingContext2D,
  text: string,
  effects: TextEffect[]
) {
  // Sort effects by render order
  const sorted = sortEffectsByOrder(effects)
  
  // Render each effect layer
  for (const effect of sorted) {
    switch (effect.type) {
      case 'extrude':
        renderExtrude(ctx, text, effect)
        break
      case 'shadow':
        renderShadow(ctx, text, effect)
        break
      case 'stroke':
        renderStroke(ctx, text, effect)
        break
      case 'fill':
        renderFill(ctx, text, effect)
        break
      // ... etc
    }
  }
}
```

---

## Testing Checklist

- [ ] All warp modes work correctly
- [ ] Effects stack renders in correct order
- [ ] Multiple shadows render properly
- [ ] Stroke alignment works (inside/outside/center)
- [ ] Texture fills clip to text correctly
- [ ] Templates apply all effects correctly
- [ ] Performance is acceptable with many text layers
- [ ] Backward compatibility with legacy props
- [ ] Text editing (content changes) works smoothly
- [ ] Undo/redo works with all effects
- [ ] Export includes all effects

---

## Success Metrics

1. **Feature Completeness**: All Kittl text features implemented
2. **Performance**: < 100ms update time for effect changes
3. **User Experience**: Intuitive controls, clear visual feedback
4. **Code Quality**: Clean, maintainable, well-documented
5. **Compatibility**: Works with existing designs (backward compatible)

---

## Next Steps

1. **Start with Phase 1** (Warping System) - Highest priority
2. **Review and adjust plan** based on Phase 1 learnings
3. **Incremental implementation** - Test each phase before moving on
4. **User feedback** - Gather feedback after each major phase

---

## Resources & References

- Kittl Text Effects: https://www.kittl.com/features/text-effects
- Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- SVG Text: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/text
- Text Warping Algorithms: Research paper references in `lib/textWarp.ts`

---

## Notes

- Focus on getting warping working first - it's the most visually impactful feature
- Effects stack migration can happen gradually - keep legacy support during transition
- Performance is critical - optimize rendering early
- User experience matters more than feature completeness - prioritize polish over quantity

