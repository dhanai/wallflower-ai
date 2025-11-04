# Kittl Text Features - Quick Reference

## Current Status Checklist

### ✅ Working
- [x] Basic text editing (content, font, size, weight)
- [x] Solid color fill
- [x] Linear gradient fill
- [x] Basic stroke/outline
- [x] Basic shadow
- [x] Basic extrude/3D
- [x] Arch transformation (simple)
- [x] Curved text along arc

### 🚧 Partially Working
- [ ] Text warping (library exists, not integrated)
- [ ] Effects stack (types defined, not used)
- [ ] Advanced shadows (basic only)
- [ ] Advanced strokes (basic only)

### ❌ Not Implemented
- [ ] Wave/Flag/Bulge/Perspective warping
- [ ] Multiple shadows
- [ ] Stroke alignment (inside/outside/center)
- [ ] Texture/pattern fills
- [ ] Font templates/presets
- [ ] Effect stacking UI
- [ ] Advanced extrude (angle, perspective)

---

## Implementation Priority

### 🔴 HIGH PRIORITY (Do First)
1. **Text Warping Integration** (2-3 days)
   - Integrate `textWarp.ts` with KText
   - Wave, Flag, Bulge, Perspective modes
   - UI controls for warp parameters

2. **Effects Stack Migration** (3-4 days)
   - Migrate from legacy props to `TextEffect[]`
   - Enhanced shadows (multiple, spread)
   - Enhanced strokes (alignment, joins)
   - Enhanced extrude (angle, better rendering)

### 🟡 MEDIUM PRIORITY (Do Next)
3. **Texture Fills** (2-3 days)
   - Image texture loading
   - Blend modes
   - Clip to text

4. **Font Templates** (2 days)
   - Pre-built templates
   - Save/load system
   - Quick apply UI

5. **UI Improvements** (3-4 days)
   - Better inspector organization
   - Visual previews
   - Effect stacking UI

### 🟢 LOW PRIORITY (Polish)
6. **Advanced Features** (2-3 days)
   - Performance optimization
   - Accessibility
   - Advanced text paths

---

## Key Files

### Core Implementation
- `shapes/KText.tsx` - Main text shape component
- `lib/textWarp.ts` - Warping algorithms (needs integration)
- `types/textEffects.ts` - Effect type definitions

### UI Components
- `components/CanvasEditorTldraw.tsx` - Main editor (contains KTextInspector)
- `components/CanvasEditorTldraw.tsx:957` - KTextInspector component

### Utilities
- `utils/insertKText.ts` - Helper to insert text
- `utils/addTextAtCenter.ts` - Helper to center text

---

## Quick Start: Phase 1 (Warping)

### Step 1: Add Warp Props to KText
```typescript
// In shapes/KText.tsx
warpMode: 'none' | 'arc' | 'bulge' | 'flag' | 'perspective'
warpParams: {
  intensity?: number
  direction?: 1 | -1
  amplitude?: number
  frequency?: number
  // ... etc
}
```

### Step 2: Add Canvas Rendering Path
```typescript
// When warpMode !== 'none', use canvas
if (warpMode !== 'none') {
  return <CanvasTextRenderer {...props} />
}
```

### Step 3: Integrate textWarp.ts
```typescript
import { renderWarpedText } from '@/lib/textWarp'

// In canvas renderer
renderWarpedText(ctx, box, text, paint, { mode: warpMode, params: warpParams })
```

### Step 4: Add UI Controls
```typescript
// In KTextInspector
<select value={warpMode} onChange={...}>
  <option value="none">None</option>
  <option value="wave">Wave</option>
  <option value="bulge">Bulge</option>
  // ... etc
</select>
```

---

## Effect Rendering Order

1. **Extrude** (behind)
2. **Shadows** (behind)
3. **Stroke** (edge)
4. **Fill** (main)
5. **Foreground** (overlay)

---

## Data Flow

```
User Action (UI Control)
  ↓
Update Shape Props
  ↓
KText Component Re-renders
  ↓
Effects Stack Processed
  ↓
Canvas/SVG Rendering
  ↓
Visual Update
```

---

## Testing Priorities

1. ✅ Warping works for all modes
2. ✅ Effects render in correct order
3. ✅ Performance acceptable (< 100ms updates)
4. ✅ Backward compatibility maintained
5. ✅ Text editing smooth
6. ✅ Undo/redo works

---

## Common Issues & Solutions

### Issue: Warping not showing
- **Check**: Is warpMode set correctly?
- **Check**: Is canvas rendering path active?
- **Check**: Are warpParams valid?

### Issue: Effects not rendering
- **Check**: Effects array is non-empty
- **Check**: Render order is correct
- **Check**: Canvas context is valid

### Issue: Performance slow
- **Solution**: Debounce updates
- **Solution**: Cache rendered results
- **Solution**: Use requestAnimationFrame

---

## Next Steps

1. Read `KITTL_TEXT_FEATURES_PLAN.md` for full details
2. Start with Phase 1 (Warping Integration)
3. Test thoroughly before moving to Phase 2
4. Iterate based on user feedback

