# Building a Kittl-Style Text Editor From Scratch

## Philosophy

**Start fresh. Build it right. Make it maintainable.**

This plan outlines how to build a professional-grade text editor component from the ground up, learning from existing issues and designing for scalability, performance, and maintainability.

---

## Part 1: Architecture Decisions

### 1.1 Technology Stack

**Core Framework:**
- ✅ **tldraw** - Already chosen, excellent choice for canvas-based editors
- ✅ **React 18** - Component framework
- ✅ **TypeScript** - Type safety

**Rendering Strategy:**
- **Hybrid Approach** (Canvas + SVG)
  - **Canvas** for complex warping and effects (performance + flexibility)
  - **SVG** for simple text (crisp, scalable, lightweight)
  - **Cache rendered results** for performance

**State Management:**
- **tldraw's built-in state** for shape data
- **React Context** for editor-wide settings
- **Local component state** for UI-only concerns

### 1.2 Component Architecture

```
TextEditor/
├── core/
│   ├── TextRenderer.tsx        # Main rendering engine
│   ├── TextData.ts             # Data models & types
│   ├── TextEffects.ts          # Effect system
│   └── TextWarp.ts             # Warping engine
├── components/
│   ├── TextLayer.tsx           # Individual text layer component
│   ├── TextInspector.tsx       # Properties panel
│   ├── EffectStack.tsx         # Effect management UI
│   ├── WarpControls.tsx        # Warp parameter controls
│   └── FontPicker.tsx          # Font selection
├── hooks/
│   ├── useTextEditor.ts        # Main editor hook
│   ├── useTextEffects.ts      # Effect management
│   └── useTextWarp.ts          # Warp calculations
└── utils/
    ├── renderText.ts           # Rendering utilities
    ├── measureText.ts          # Text measurement
    └── exportText.ts           # Export utilities
```

### 1.3 Data Model Design

**Single Source of Truth: Clean, Extensible Data Structure**

```typescript
// Core text data model
interface TextLayer {
  id: string
  type: 'text'
  
  // Content
  content: string
  textCase?: 'normal' | 'uppercase' | 'lowercase' | 'title'
  
  // Typography
  font: {
    family: string
    weight: number | string
    size: number        // px
    letterSpacing: number  // px
    lineHeight: number     // unitless ratio
    align: 'left' | 'center' | 'right' | 'justify'
  }
  
  // Transform
  transform: {
    x: number
    y: number
    rotation: number    // degrees
    scaleX: number
    scaleY: number
  }
  
  // Warping
  warp: {
    mode: 'none' | 'arc' | 'wave' | 'bulge' | 'perspective'
    params: WarpParams
  }
  
  // Effects Stack (ordered array)
  effects: TextEffect[]
  
  // Geometry (calculated or explicit)
  bounds: {
    width: number
    height: number
  }
  
  // Metadata
  locked?: boolean
  visible?: boolean
  opacity?: number
  blendMode?: BlendMode
}

// Effect system (composable, stackable)
type TextEffect =
  | FillEffect
  | StrokeEffect
  | ShadowEffect
  | ExtrudeEffect
  | TextureEffect
  | OutlineEffect

interface FillEffect {
  type: 'fill'
  mode: 'solid' | 'linear' | 'radial' | 'pattern'
  color?: string
  gradient?: {
    stops: Array<{ offset: number; color: string }>
    angle?: number  // for linear
    center?: { x: number; y: number }  // for radial
  }
  pattern?: {
    src: string
    scale?: number
  }
}

interface StrokeEffect {
  type: 'stroke'
  enabled: boolean
  color: string
  width: number
  align: 'inside' | 'center' | 'outside'
  join: 'miter' | 'round' | 'bevel'
  miterLimit?: number
  dashArray?: number[]
}

interface ShadowEffect {
  type: 'shadow'
  enabled: boolean
  dx: number
  dy: number
  blur: number
  spread?: number
  color: string
  opacity: number
  inner?: boolean
}

interface ExtrudeEffect {
  type: 'extrude'
  enabled: boolean
  depth: number
  angle: number    // perspective angle (0-360)
  color: string
  opacity: number
  steps: number   // quality (more = smoother)
}

interface TextureEffect {
  type: 'texture'
  enabled: boolean
  src: string
  blend: BlendMode
  opacity: number
  scale: number
  offset: { x: number; y: number }
  clipToText: boolean
}

interface OutlineEffect {
  type: 'outline'
  enabled: boolean
  width: number
  color: string
  offset: number
  join: 'miter' | 'round' | 'bevel'
}

// Warp parameters
interface WarpParams {
  // Arc
  radius?: number
  sweep?: number
  direction?: 'up' | 'down'
  
  // Wave/Flag
  amplitude?: number
  frequency?: number
  phase?: number
  
  // Bulge
  intensity?: number
  center?: { x: number; y: number }
  
  // Perspective (4-point)
  corners?: {
    topLeft: { x: number; y: number }
    topRight: { x: number; y: number }
    bottomLeft: { x: number; y: number }
    bottomRight: { x: number; y: number }
  }
}
```

---

## Part 2: Core Components

### 2.1 TextRenderer Component

**Purpose:** Single responsibility - render text with all effects

**Approach:**
1. Determine rendering path (SVG vs Canvas)
2. Apply effects in correct order
3. Cache results for performance

```typescript
// TextRenderer.tsx
interface TextRendererProps {
  layer: TextLayer
  viewport: Viewport
  isSelected: boolean
  isEditing: boolean
}

export function TextRenderer({ layer, viewport, isSelected, isEditing }: TextRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  
  // Determine rendering strategy
  const needsCanvas = layer.warp.mode !== 'none' || 
                      hasComplexEffects(layer.effects)
  
  useEffect(() => {
    if (needsCanvas) {
      renderToCanvas(canvasRef.current, layer)
    } else {
      renderToSVG(svgRef.current, layer)
    }
  }, [layer, needsCanvas])
  
  if (needsCanvas) {
    return <canvas ref={canvasRef} />
  } else {
    return <svg ref={svgRef} />
  }
}
```

### 2.2 Rendering Pipeline

**Effect Rendering Order (Critical):**
1. **Extrude** (behind, creates depth)
2. **Shadows** (behind, creates depth)
3. **Outline** (edge, creates definition)
4. **Stroke** (edge, creates definition)
5. **Fill** (main body)
6. **Texture** (overlay on fill)

**Implementation:**
```typescript
function renderTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer
) {
  ctx.save()
  
  // Apply transform
  applyTransform(ctx, layer.transform)
  
  // Render effects in order
  const sortedEffects = sortEffectsByOrder(layer.effects)
  
  for (const effect of sortedEffects) {
    if (!effect.enabled) continue
    
    switch (effect.type) {
      case 'extrude':
        renderExtrude(ctx, layer, effect)
        break
      case 'shadow':
        renderShadow(ctx, layer, effect)
        break
      case 'outline':
        renderOutline(ctx, layer, effect)
        break
      case 'stroke':
        renderStroke(ctx, layer, effect)
        break
      case 'fill':
        renderFill(ctx, layer, effect)
        break
      case 'texture':
        renderTexture(ctx, layer, effect)
        break
    }
  }
  
  ctx.restore()
}
```

### 2.3 Text Inspector Component

**Purpose:** Clean, organized UI for editing text properties

**Structure:**
```
TextInspector/
├── ContentSection      # Text input, case options
├── TypographySection   # Font, size, spacing, alignment
├── WarpSection        # Warp mode & parameters
├── EffectsSection     # Effect stack management
└── TransformSection   # Position, rotation, scale
```

**Design Principles:**
- **Collapsible sections** (reduce clutter)
- **Visual previews** (show effect thumbnails)
- **Smart defaults** (sensible presets)
- **Keyboard shortcuts** (power user friendly)

---

## Part 3: Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal:** Build core rendering system

**Tasks:**
1. ✅ Create clean data models (`TextLayer`, `TextEffect`)
2. ✅ Build basic `TextRenderer` component
3. ✅ Implement simple text rendering (no effects)
4. ✅ Add text editing (inline editing)
5. ✅ Basic transform handling (position, rotation, scale)

**Deliverables:**
- Text can be added to canvas
- Text can be edited inline
- Text can be moved/rotated/scaled
- Clean code structure

**Files to Create:**
```
lib/text-editor/
├── types.ts           # All TypeScript types
├── TextRenderer.tsx   # Core renderer
├── hooks/
│   └── useTextEditor.ts
└── utils/
    └── renderBasic.ts
```

### Phase 2: Typography System (Week 1-2)

**Goal:** Complete typography controls

**Tasks:**
1. ✅ Font family selection (with preview)
2. ✅ Font weight, size controls
3. ✅ Letter spacing, line height
4. ✅ Text alignment
5. ✅ Text case options

**Deliverables:**
- Full typography control panel
- Real-time preview
- Font loading system

**Files to Create:**
```
components/text-editor/
├── FontPicker.tsx
├── TypographyControls.tsx
└── hooks/
    └── useFonts.ts
```

### Phase 3: Fill & Stroke (Week 2)

**Goal:** Basic styling system

**Tasks:**
1. ✅ Solid color fill
2. ✅ Linear gradient fill
3. ✅ Radial gradient fill
4. ✅ Stroke (inside/center/outside)
5. ✅ Stroke styling (join, miter limit)

**Deliverables:**
- Complete fill system
- Complete stroke system
- Color picker integration

**Files to Create:**
```
components/text-editor/
├── FillControls.tsx
├── StrokeControls.tsx
└── GradientEditor.tsx
```

### Phase 4: Effects System (Week 2-3)

**Goal:** Build composable effects stack

**Tasks:**
1. ✅ Effect stack data structure
2. ✅ Shadow effect (single, multiple)
3. ✅ Outline effect
4. ✅ Extrude effect (basic)
5. ✅ Effect ordering system
6. ✅ Enable/disable effects

**Deliverables:**
- Effects stack working
- Multiple effects can be combined
- Effects render in correct order

**Files to Create:**
```
lib/text-editor/
├── effects/
│   ├── ShadowEffect.ts
│   ├── OutlineEffect.ts
│   ├── ExtrudeEffect.ts
│   └── index.ts
components/text-editor/
└── EffectStack.tsx
```

### Phase 5: Text Warping (Week 3)

**Goal:** Implement all warp modes

**Tasks:**
1. ✅ Integrate warping engine
2. ✅ Arc warping
3. ✅ Wave/Flag warping
4. ✅ Bulge warping
5. ✅ Perspective warping (4-point)
6. ✅ Warp parameter controls

**Deliverables:**
- All warp modes working
- Interactive warp controls
- Smooth performance

**Files to Create:**
```
lib/text-editor/
├── warp/
│   ├── WarpEngine.ts
│   ├── ArcWarp.ts
│   ├── WaveWarp.ts
│   ├── BulgeWarp.ts
│   └── PerspectiveWarp.ts
components/text-editor/
└── WarpControls.tsx
```

### Phase 6: Advanced Effects (Week 4)

**Goal:** Complete effect system

**Tasks:**
1. ✅ Enhanced shadows (spread, inner)
2. ✅ Enhanced extrude (angle, perspective)
3. ✅ Texture fills
4. ✅ Blend modes
5. ✅ Pattern fills

**Deliverables:**
- All advanced effects working
- Texture system complete
- Blend modes working

### Phase 7: UI Polish (Week 4-5)

**Goal:** Professional UI/UX

**Tasks:**
1. ✅ Reorganize inspector panel
2. ✅ Add visual previews
3. ✅ Effect thumbnails
4. ✅ Better spacing/typography
5. ✅ Keyboard shortcuts
6. ✅ Tooltips & help text

**Deliverables:**
- Polished, professional UI
- Great user experience
- Intuitive controls

### Phase 8: Font Templates (Week 5)

**Goal:** Template system

**Tasks:**
1. ✅ Template data structure
2. ✅ Pre-built templates (10-15)
3. ✅ Template picker UI
4. ✅ Save/load templates
5. ✅ Apply template system

**Deliverables:**
- Template system working
- Pre-built templates available
- Users can save custom templates

---

## Part 4: Technical Implementation Details

### 4.1 Rendering Strategy

**Decision Tree:**
```
Text needs warping?
  Yes → Use Canvas
  No → Text has complex effects?
    Yes → Use Canvas
    No → Use SVG
```

**Canvas Rendering:**
- Better for complex transformations
- Full control over rendering
- Can cache to image for performance
- Scales well for complex effects

**SVG Rendering:**
- Crisp at any scale
- Lightweight
- Good for simple text
- Easy to style with CSS

### 4.2 Performance Optimization

**Caching Strategy:**
```typescript
// Cache rendered text layers
const renderCache = new Map<string, HTMLCanvasElement>()

function getCachedRender(layer: TextLayer): HTMLCanvasElement | null {
  const key = generateCacheKey(layer)
  return renderCache.get(key) || null
}

function cacheRender(layer: TextLayer, canvas: HTMLCanvasElement) {
  const key = generateCacheKey(layer)
  renderCache.set(key, canvas)
}
```

**Debouncing:**
```typescript
// Debounce effect updates during dragging
const debouncedUpdate = useMemo(
  () => debounce((layer: TextLayer) => {
    updateLayer(layer)
  }, 16), // ~60fps
  []
)
```

**Virtualization:**
- Only render visible text layers
- Use intersection observer
- Lazy load off-screen layers

### 4.3 State Management

**Three-Tier State:**

1. **tldraw Shape State** (persistent)
   - Stored in tldraw document
   - Synced/exported
   - Undo/redo support

2. **React Component State** (temporary)
   - UI-only state
   - Editing state
   - Preview state

3. **Computed State** (derived)
   - Calculated bounds
   - Effect rendering results
   - Cache keys

### 4.4 Error Handling

**Defensive Programming:**
```typescript
function renderTextLayer(layer: TextLayer) {
  try {
    // Validate layer
    if (!layer.content || layer.content.length === 0) {
      return null
    }
    
    // Validate font
    if (!isFontLoaded(layer.font.family)) {
      loadFont(layer.font.family)
      return <FontLoadingPlaceholder />
    }
    
    // Render
    return <TextRenderer layer={layer} />
  } catch (error) {
    console.error('Text rendering error:', error)
    return <ErrorFallback layer={layer} />
  }
}
```

---

## Part 5: Code Organization

### 5.1 File Structure

```
lib/text-editor/
├── types.ts                    # All TypeScript interfaces
├── constants.ts                # Default values, limits
├── TextRenderer.tsx            # Main renderer component
├── TextRenderer.ts             # Rendering logic
├── effects/
│   ├── index.ts
│   ├── FillEffect.ts
│   ├── StrokeEffect.ts
│   ├── ShadowEffect.ts
│   ├── ExtrudeEffect.ts
│   ├── TextureEffect.ts
│   └── OutlineEffect.ts
├── warp/
│   ├── index.ts
│   ├── WarpEngine.ts
│   ├── ArcWarp.ts
│   ├── WaveWarp.ts
│   ├── BulgeWarp.ts
│   └── PerspectiveWarp.ts
├── hooks/
│   ├── useTextEditor.ts
│   ├── useTextEffects.ts
│   ├── useTextWarp.ts
│   └── useFonts.ts
└── utils/
    ├── render.ts
    ├── measure.ts
    ├── transform.ts
    └── export.ts

components/text-editor/
├── TextLayer.tsx               # Main text layer component
├── TextInspector.tsx           # Properties panel
├── ContentSection.tsx
├── TypographySection.tsx
├── WarpSection.tsx
├── EffectsSection.tsx
├── EffectStack.tsx
├── EffectItem.tsx
├── FontPicker.tsx
├── ColorPicker.tsx
├── GradientEditor.tsx
└── WarpControls.tsx
```

### 5.2 Code Style Guidelines

**Components:**
- One component per file
- Functional components with hooks
- Props interface at top
- Clear prop names

**Functions:**
- Single responsibility
- Pure functions where possible
- Clear naming
- Type everything

**Effects:**
- Separate rendering logic from UI
- Reusable across components
- Testable independently

**Example:**
```typescript
// ✅ Good: Clear, focused, typed
interface TextRendererProps {
  layer: TextLayer
  isSelected: boolean
}

export function TextRenderer({ layer, isSelected }: TextRendererProps) {
  // Implementation
}

// ❌ Bad: Unclear, untyped, does too much
export function TextRenderer(props: any) {
  // Everything mixed together
}
```

---

## Part 6: Testing Strategy

### 6.1 Unit Tests

**Test:**
- Effect rendering functions
- Warp calculations
- Text measurement
- Transform calculations

**Example:**
```typescript
describe('ShadowEffect', () => {
  it('renders shadow with correct offset', () => {
    const effect: ShadowEffect = {
      type: 'shadow',
      dx: 5,
      dy: 5,
      blur: 10,
      color: '#000',
      opacity: 0.5
    }
    const result = renderShadow(ctx, text, effect)
    expect(result).toMatchSnapshot()
  })
})
```

### 6.2 Integration Tests

**Test:**
- Component rendering
- Effect stacking
- Warp application
- State updates

### 6.3 Visual Regression Tests

**Test:**
- Rendering output matches expected
- Effects look correct
- Warping produces expected shapes

---

## Part 7: Migration Strategy

### 7.1 From Old System

**Phase 1: Parallel Implementation**
- Build new system alongside old
- Don't break existing functionality
- Use feature flag to switch

**Phase 2: Data Migration**
- Create migration script
- Convert old text shapes to new format
- Test thoroughly

**Phase 3: Switch Over**
- Enable new system
- Monitor for issues
- Keep old system as fallback

### 7.2 Backward Compatibility

**Support:**
- Loading old designs
- Converting old format
- Maintaining export compatibility

---

## Part 8: Success Criteria

### 8.1 Functional Requirements

- ✅ All Kittl text features implemented
- ✅ Performance: < 100ms update time
- ✅ Works with existing tldraw setup
- ✅ Export includes all effects
- ✅ Undo/redo works correctly

### 8.2 Code Quality

- ✅ Clean, maintainable code
- ✅ Well-documented
- ✅ Type-safe
- ✅ Tested
- ✅ Follows best practices

### 8.3 User Experience

- ✅ Intuitive controls
- ✅ Visual feedback
- ✅ Smooth interactions
- ✅ Fast performance
- ✅ Professional appearance

---

## Part 9: Timeline Estimate

**Total: 5-6 weeks**

- Week 1: Foundation + Typography
- Week 2: Fill/Stroke + Effects System
- Week 3: Warping
- Week 4: Advanced Effects + Polish
- Week 5: Templates + Final Polish
- Week 6: Buffer for testing/fixes

---

## Part 10: Next Steps

1. **Review this plan** - Make sure it aligns with goals
2. **Set up project structure** - Create folder structure
3. **Start Phase 1** - Build foundation
4. **Iterate** - Build, test, refine
5. **Migrate** - Move from old system when ready

---

## Key Principles

1. **Start Simple** - Build foundation first
2. **Add Complexity Gradually** - One feature at a time
3. **Test Frequently** - Don't let bugs accumulate
4. **Keep It Clean** - Maintainable code is key
5. **User First** - Prioritize UX over features

---

## Resources

- tldraw Documentation: https://tldraw.dev
- Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- SVG Text: https://developer.mozilla.org/en-US/docs/Web/SVG/Element/text
- React Best Practices: https://react.dev

---

## Questions to Answer Before Starting

1. Do we keep tldraw or build custom canvas?
   - **Answer: Keep tldraw** (already integrated, powerful)

2. Canvas vs SVG for rendering?
   - **Answer: Hybrid** (Canvas for complex, SVG for simple)

3. State management approach?
   - **Answer: tldraw state + React Context**

4. Performance requirements?
   - **Answer: < 100ms updates, 60fps interactions**

5. Browser support?
   - **Answer: Modern browsers (Chrome, Firefox, Safari, Edge)**

---

This plan provides a complete roadmap for building a professional text editor from scratch. Follow it step-by-step, and you'll have a maintainable, scalable solution.

