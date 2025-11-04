# Kittl-Level Features Implementation Roadmap

## Sprint 1: Core Text Power (Current)

### ✅ Completed
- Custom KText shape with typography controls
- Curved/arch text support
- Basic gradient, shadow, extrude effects
- Right rail inspector with reactivity

### 🚧 In Progress
- [ ] Effects stack system (types created, migration in progress)
- [ ] Effects stack UI in inspector (reorderable, toggleable)
- [ ] Interactive handles for curved text (requires tldraw v4 API research)

### 📋 Pending
- [ ] Outline/offset path support
- [ ] Font upload and registry system

## Sprint 2: Advanced Typography

- [ ] Warp/envelope text (arc, flag, wave, bulge)
- [ ] Pattern/texture fills
- [ ] Elliptical arcs (rx, ry, tilt) for badge looks
- [ ] OpenType features (liga, salt, ss01)

## Sprint 3: Vector & Effects

- [ ] Boolean operations (union, subtract, intersect, exclude)
- [ ] Path shapes (rectangle, ellipse, star, polygon, banner)
- [ ] Distress/roughen effects
- [ ] Smart guides & snapping
- [ ] Grid overlays (4:5 print safe + bleed)

## Sprint 4: Export & Pro Features

- [ ] SVG export with full effects pipeline
- [ ] PDF export @ 300 DPI
- [ ] PNG export presets (300 DPI, 600 DPI, etc.)
- [ ] Mockup frames with 4-pt warp
- [ ] Spot colors & CMYK support

## Implementation Notes

### Effects Stack
The effects stack allows non-destructive, reorderable effects:
- Fill (solid/linear/radial)
- Stroke (inside/center/outside)
- Shadow
- Extrude
- Texture
- Outline

Effects are applied in order, allowing complex layered looks.

### Handles
Interactive handles for curved text require:
- `getHandles()` method in ShapeUtil
- `onHandleDrag()` or similar callback
- Handle rendering (tldraw may provide default styling)

Need to research tldraw v4 API for handle implementation.

### Performance
- Cache font metrics per {fontFamily, weight, sizePx}
- Cache glyph paths
- Debounce heavy recomputes with requestIdleCallback
- Use Workers for complex warp calculations

