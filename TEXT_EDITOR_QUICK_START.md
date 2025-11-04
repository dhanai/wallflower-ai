# Text Editor Quick Start Guide

## Getting Started in 30 Minutes

This guide will help you start building the new text editor from scratch.

---

## Step 1: Set Up Project Structure (5 min)

Create the folder structure:

```bash
mkdir -p lib/text-editor/{effects,warp,hooks,utils}
mkdir -p components/text-editor
```

**File: `lib/text-editor/types.ts`**
```typescript
// Start with core types
export interface TextLayer {
  id: string
  type: 'text'
  content: string
  font: {
    family: string
    weight: number
    size: number
    letterSpacing: number
    lineHeight: number
    align: 'left' | 'center' | 'right'
  }
  transform: {
    x: number
    y: number
    rotation: number
    scaleX: number
    scaleY: number
  }
  effects: TextEffect[]
}

export type TextEffect = FillEffect | StrokeEffect | ShadowEffect

export interface FillEffect {
  type: 'fill'
  mode: 'solid' | 'linear'
  color?: string
  gradient?: {
    stops: Array<{ offset: number; color: string }>
    angle: number
  }
}

export interface StrokeEffect {
  type: 'stroke'
  enabled: boolean
  color: string
  width: number
  align: 'inside' | 'center' | 'outside'
}

export interface ShadowEffect {
  type: 'shadow'
  enabled: boolean
  dx: number
  dy: number
  blur: number
  color: string
  opacity: number
}
```

---

## Step 2: Create Basic Renderer (10 min)

**File: `lib/text-editor/TextRenderer.tsx`**

```typescript
import React, { useRef, useEffect } from 'react'
import type { TextLayer } from './types'

interface TextRendererProps {
  layer: TextLayer
  width: number
  height: number
}

export function TextRenderer({ layer, width, height }: TextRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Set font
    ctx.font = `${layer.font.weight} ${layer.font.size}px ${layer.font.family}`
    ctx.textAlign = layer.font.align === 'left' ? 'left' : 
                    layer.font.align === 'center' ? 'center' : 'right'
    ctx.textBaseline = 'alphabetic'
    
    // Render fill
    const fillEffect = layer.effects.find(e => e.type === 'fill') as FillEffect
    if (fillEffect) {
      if (fillEffect.mode === 'solid' && fillEffect.color) {
        ctx.fillStyle = fillEffect.color
        ctx.fillText(layer.content, width / 2, height / 2)
      }
    }
    
    // Render stroke
    const strokeEffect = layer.effects.find(e => e.type === 'stroke') as StrokeEffect
    if (strokeEffect?.enabled) {
      ctx.strokeStyle = strokeEffect.color
      ctx.lineWidth = strokeEffect.width
      ctx.strokeText(layer.content, width / 2, height / 2)
    }
    
    // Render shadow
    const shadowEffect = layer.effects.find(e => e.type === 'shadow') as ShadowEffect
    if (shadowEffect?.enabled) {
      ctx.shadowColor = shadowEffect.color
      ctx.shadowBlur = shadowEffect.blur
      ctx.shadowOffsetX = shadowEffect.dx
      ctx.shadowOffsetY = shadowEffect.dy
      ctx.fillText(layer.content, width / 2, height / 2)
    }
  }, [layer, width, height])
  
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block' }}
    />
  )
}
```

---

## Step 3: Create Text Layer Component (10 min)

**File: `components/text-editor/TextLayer.tsx`**

```typescript
'use client'

import React from 'react'
import { TextRenderer } from '@/lib/text-editor/TextRenderer'
import type { TextLayer as TextLayerType } from '@/lib/text-editor/types'

interface TextLayerProps {
  layer: TextLayerType
  isSelected: boolean
  onSelect: () => void
  onDoubleClick: () => void
}

export function TextLayer({ 
  layer, 
  isSelected, 
  onSelect, 
  onDoubleClick 
}: TextLayerProps) {
  const width = 400 // Calculate from text
  const height = 100 // Calculate from text
  
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      style={{
        position: 'absolute',
        left: layer.transform.x,
        top: layer.transform.y,
        transform: `rotate(${layer.transform.rotation}deg) scale(${layer.transform.scaleX}, ${layer.transform.scaleY})`,
        cursor: 'pointer',
        border: isSelected ? '2px solid blue' : 'none',
      }}
    >
      <TextRenderer layer={layer} width={width} height={height} />
    </div>
  )
}
```

---

## Step 4: Create Simple Inspector (5 min)

**File: `components/text-editor/TextInspector.tsx`**

```typescript
'use client'

import React from 'react'
import type { TextLayer } from '@/lib/text-editor/types'

interface TextInspectorProps {
  layer: TextLayer
  onUpdate: (updates: Partial<TextLayer>) => void
}

export function TextInspector({ layer, onUpdate }: TextInspectorProps) {
  const fillEffect = layer.effects.find(e => e.type === 'fill') as FillEffect
  
  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Text</label>
        <textarea
          value={layer.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          className="w-full border rounded px-2 py-1"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Font Size</label>
        <input
          type="number"
          value={layer.font.size}
          onChange={(e) => onUpdate({
            font: { ...layer.font, size: Number(e.target.value) }
          })}
          className="w-full border rounded px-2 py-1"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Fill Color</label>
        <input
          type="color"
          value={fillEffect?.color || '#000000'}
          onChange={(e) => {
            const newEffects = layer.effects.filter(e => e.type !== 'fill')
            newEffects.push({
              type: 'fill',
              mode: 'solid',
              color: e.target.value
            })
            onUpdate({ effects: newEffects })
          }}
          className="w-full h-10 border rounded"
        />
      </div>
    </div>
  )
}
```

---

## Step 5: Integrate with Your Editor (10 min)

**In your main editor component:**

```typescript
import { TextLayer } from '@/components/text-editor/TextLayer'
import { TextInspector } from '@/components/text-editor/TextInspector'
import type { TextLayer as TextLayerType } from '@/lib/text-editor/types'

// Add state
const [textLayers, setTextLayers] = useState<TextLayerType[]>([])
const [selectedTextId, setSelectedTextId] = useState<string | null>(null)

// Add text function
function addText() {
  const newLayer: TextLayerType = {
    id: `text-${Date.now()}`,
    type: 'text',
    content: 'Your text here',
    font: {
      family: 'Inter, sans-serif',
      weight: 400,
      size: 48,
      letterSpacing: 0,
      lineHeight: 1.2,
      align: 'center'
    },
    transform: {
      x: 400,
      y: 500,
      rotation: 0,
      scaleX: 1,
      scaleY: 1
    },
    effects: [
      {
        type: 'fill',
        mode: 'solid',
        color: '#000000'
      }
    ]
  }
  setTextLayers([...textLayers, newLayer])
  setSelectedTextId(newLayer.id)
}

// Render text layers
{textLayers.map(layer => (
  <TextLayer
    key={layer.id}
    layer={layer}
    isSelected={selectedTextId === layer.id}
    onSelect={() => setSelectedTextId(layer.id)}
    onDoubleClick={() => {/* Start editing */}}
  />
))}

// Render inspector
{selectedTextId && (
  <TextInspector
    layer={textLayers.find(l => l.id === selectedTextId)!}
    onUpdate={(updates) => {
      setTextLayers(textLayers.map(l => 
        l.id === selectedTextId ? { ...l, ...updates } : l
      ))
    }}
  />
)}
```

---

## What You Have Now

✅ Basic text rendering
✅ Text editing (content, size, color)
✅ Simple inspector panel
✅ Clean architecture foundation

---

## Next Steps

1. **Add more effects** (stroke, shadow)
2. **Add typography controls** (font family, weight, spacing)
3. **Add warping** (integrate textWarp.ts)
4. **Improve rendering** (better text measurement, positioning)
5. **Add tldraw integration** (make it a tldraw shape)

---

## Common Issues

**Text not showing?**
- Check canvas size (width/height)
- Check font is loaded
- Check text color contrast

**Effects not applying?**
- Check effects array structure
- Check render order
- Check canvas context

**Performance issues?**
- Add canvas caching
- Debounce updates
- Only render visible layers

---

## Resources

- Full plan: `TEXT_EDITOR_FROM_SCRATCH_PLAN.md`
- tldraw docs: https://tldraw.dev
- Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

---

Start here, then expand feature by feature! 🚀

