'use client';

import * as React from 'react';
import {
  ShapeUtil,
  HTMLContainer,
  TLBaseShape,
  TLShapeId,
  TLHandle,
  toDomPrecision,
  useEditor,
  Rectangle2d,
  createShapeId,
} from 'tldraw';

// ---- shape type ----
export type KArcTextShape = TLBaseShape<
  'k-arc-text',
  {
    text: string
    fontFamily: string
    fontWeight: number
    sizePx: number

    // arc geometry (in SHAPE LOCAL space; shape origin is its center)
    radius: number               // px
    startAngleDeg: number        // 0° = +X axis
    endAngleDeg: number          // sweep end
    upsideDown?: boolean         // flip baseline
    letterSpacing?: number       // px
    align?: 'start'|'middle'|'end'
    fill?: string                // text color
    stroke?: string              // stroke color
    strokeWidth?: number         // stroke width
  }
>

// ---- helper math ----
const deg2rad = (d: number) => (d * Math.PI) / 180
const rad2deg = (r: number) => (r * 180) / Math.PI
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))

function polarToPoint(r: number, aDeg: number) {
  const a = deg2rad(aDeg)
  return { x: r * Math.cos(a), y: r * Math.sin(a) }
}

function pointToAngleDeg(x: number, y: number) {
  return (rad2deg(Math.atan2(y, x)) + 360) % 360
}

/** Build an SVG arc path centered at (0,0) in local space */
function arcPath(radius: number, startDeg: number, endDeg: number, flipped = false) {
  // normalize sweep to the shorter/longer arc depending on order
  const start = polarToPoint(radius, startDeg)
  const end = polarToPoint(radius, endDeg)
  let sweep = (endDeg - startDeg + 360) % 360
  const largeArc = sweep > 180 ? 1 : 0
  // SVG y-axis points down; we invert Y for proper orientation inside our <svg> with transformed group
  const y = (v: number) => -v
  // direction: textPath uses path direction; we keep positive sweep (0..360)
  return `M ${toDomPrecision(start.x)} ${toDomPrecision(y(start.y))}
          A ${radius} ${radius} 0 ${largeArc} ${flipped ? 0 : 1}
            ${toDomPrecision(end.x)} ${toDomPrecision(y(end.y))}`
}

// ---- the Shape Util ----
export class KArcTextUtil extends ShapeUtil<KArcTextShape> {
  static type = 'k-arc-text' as const
  static props = {
    text: 'Your text here',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 700,
    sizePx: 48,
    radius: 220,
    startAngleDeg: -100,
    endAngleDeg: 100,
    upsideDown: false,
    letterSpacing: 0,
    align: 'middle' as const,
    fill: '#111111',
    stroke: undefined,
    strokeWidth: 0,
  }

  // ---- default bounds (editor can still rotate/scale the box) ----
  getDefaultProps(): KArcTextShape['props'] {
    return { ...KArcTextUtil.props }
  }

  getGeometry(shape: KArcTextShape) {
    // bounding box: simple square around circle
    const r = Math.max(40, shape.props.radius)
    return new Rectangle2d({
      width: 2 * r,
      height: 2 * r,
      isFilled: false,
    })
  }

  // ---- handles on the arc ----
  // TODO: Fix handle types for tldraw v4 API
  // getHandles(shape: KArcTextShape): TLHandle[] {
  //   const { radius, startAngleDeg, endAngleDeg } = shape.props
  //   const rPt = polarToPoint(radius, startAngleDeg + (endAngleDeg - startAngleDeg) / 2)
  //   const startPt = polarToPoint(radius, startAngleDeg)
  //   const endPt = polarToPoint(radius, endAngleDeg)
  //   return [
  //     { id: 'radius', type: 'vertex', x: rPt.x, y: rPt.y, index: 'a1' },
  //     { id: 'start', type: 'vertex', x: startPt.x, y: startPt.y, index: 'a2' },
  //     { id: 'end', type: 'vertex', x: endPt.x, y: endPt.y, index: 'a3' },
  //   ]
  // }

  onHandleChange = (shape: KArcTextShape, { handle, isPrecise, editor, ...rest }: any) => {
    const pt = editor.inputs.currentPagePoint
    // convert to local (shape) space for robust math
    const local = editor.getPointInShapeSpace(shape, pt)

    if (handle === 'radius') {
      const newR = clamp(Math.hypot(local.x, local.y), 30, 2000)
      editor.updateShapes([{
        id: shape.id,
        type: shape.type,
        props: { ...shape.props, radius: newR },
      }])
      return
    }

    if (handle === 'start') {
      const ang = pointToAngleDeg(local.x, local.y)
      editor.updateShapes([{
        id: shape.id,
        type: shape.type,
        props: { ...shape.props, startAngleDeg: ang },
      }])
      return
    }

    if (handle === 'end') {
      const ang = pointToAngleDeg(local.x, local.y)
      editor.updateShapes([{
        id: shape.id,
        type: shape.type,
        props: { ...shape.props, endAngleDeg: ang },
      }])
      return
    }
  }

  onDoubleClick = (shape: KArcTextShape) => {
    // focus the inline text editor (simple prompt for now; swap to your rich text editor if you have one)
    const next = window.prompt('Edit text:', shape.props.text)
    if (next != null) {
      // Use the editor from the shape context - this will need to be updated when we have editor context
      // For now, this is a placeholder
    }
  }

  component(shape: KArcTextShape) {
    const id = React.useId()
    const p = shape.props
    const path = arcPath(p.radius, p.startAngleDeg, p.endAngleDeg, !!p.upsideDown)

    // alignment: start/middle/end maps to text-anchor
    const textAnchor =
      p.align === 'middle' ? 'middle' : p.align === 'end' ? 'end' : 'start'

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          // expand a square that encloses the circle; lets you select easily
          width: toDomPrecision(p.radius * 2),
          height: toDomPrecision(p.radius * 2),
          transform: `translate(${-p.radius}px, ${-p.radius}px)`,
          pointerEvents: 'auto',
        }}
      >
        <svg
          width={p.radius * 2}
          height={p.radius * 2}
          viewBox={[-p.radius, -p.radius, p.radius * 2, p.radius * 2].join(' ')}
          style={{ overflow: 'visible', display: 'block' }}
        >
          <defs>
            <path id={id} d={path} />
          </defs>

          {/* optional: faint guide */}
          <path d={path} fill="none" stroke="currentColor" strokeOpacity={0.08} />

          <text
            dominantBaseline="middle"
            fontFamily={p.fontFamily}
            fontWeight={p.fontWeight}
            fontSize={p.sizePx}
            letterSpacing={p.letterSpacing ?? 0}
            textAnchor={textAnchor}
            fill={p.fill || '#111111'}
            stroke={p.stroke && p.strokeWidth ? p.stroke : 'none'}
            strokeWidth={p.strokeWidth || 0}
          >
            <textPath
              href={`#${id}`}
              startOffset={p.align === 'start' ? '0%' : p.align === 'middle' ? '50%' : '100%'}
            >
              {p.text}
            </textPath>
          </text>
        </svg>
      </HTMLContainer>
    )
  }

  indicator(_shape: KArcTextShape) {
    return null
  }
}

// ---- helper: insert shape centered in current view ----
export function insertKArcText(
  editor: ReturnType<typeof useEditor>,
  options?: {
    frameId?: TLShapeId | null
    text?: string
    x?: number
    y?: number
  }
) {
  if (!editor) return

  const { frameId, text = 'Your text here', x, y } = options || {}

  let finalX: number
  let finalY: number
  let parentId: TLShapeId | null = null

  if (frameId) {
    const frame = editor.getShape(frameId) as any
    if (frame) {
      parentId = frameId
      // Center in frame
      finalX = frame.props.w / 2
      finalY = frame.props.h / 2
    } else {
      const vp = editor.getViewportPageBounds()
      finalX = vp.x + vp.width / 2
      finalY = vp.y + vp.height / 2
    }
  } else if (x !== undefined && y !== undefined) {
    finalX = x
    finalY = y
  } else {
    const vp = editor.getViewportPageBounds()
    finalX = vp.x + vp.width / 2
    finalY = vp.y + vp.height / 2
  }

  const shapeId = createShapeId()
  editor.createShapes([
    {
      id: shapeId,
      type: 'k-arc-text',
      ...(parentId ? { parentId } : {}),
      x: finalX,
      y: finalY,
      rotation: 0,
      props: {
        ...KArcTextUtil.props,
        text,
      },
    },
  ])

  editor.setSelectedShapes([shapeId])
  editor.zoomToSelection()

  return shapeId
}

