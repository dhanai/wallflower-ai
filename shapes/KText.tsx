// shapes/KText.tsx
import * as React from 'react';
import {
  HTMLContainer,
  Rectangle2d,
  RecordProps,
  ShapeUtil,
  T,
  TLBaseShape,
  useEditor,
  useIsEditing,
} from '@tldraw/editor';
import type { TextEffect } from '../types/textEffects';

// ---- Shape type & props ----
export type KTextShape = TLBaseShape<
  'ktext',
  {
    text: string
    fontFamily: string
    fontWeight: number
    sizePx: number
    letterSpacing: number // px
    lineHeight: number    // unitless (1.0 = 100%)
    align: 'start' | 'middle' | 'end'

    fill: string                  // solid fill
    gradient?: { from: string; to: string; angle: number } // optional

    stroke?: string               // outline color
    strokeWidth?: number

    shadow?: { dx: number; dy: number; blur: number; color: string; opacity: number }

    // Curve / arch
    curved: boolean
    radius: number   // px, distance from center to baseline
    arc: number      // degrees, sweep angle (e.g. 180 = semicircle)
    upsideDown: boolean
    
    // Transformation (Kittl-style)
    transformType: 'none' | 'arch' | 'rise' | 'wave' | 'flag' | 'circle' | 'angle' | 'distort' | 'custom'
    archCurve: number  // -100 to 100, percentage intensity for arch transformation

    // Simple 3D/extrude look
    extrude?: { depth: number; step: number; color: string; opacity: number }
    w: number // box width for wrapping when not curved
    
    // Kittl-style effects stack (new, optional for backward compatibility)
    effects?: TextEffect[]
  }
>

// ---- Defaults ----
const DEFAULTS: KTextShape['props'] = {
  text: 'Your text here',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontWeight: 700,
  sizePx: 96,
  letterSpacing: 0,
  lineHeight: 1.2,
  align: 'middle',
  fill: '#111111',
  gradient: undefined,
  stroke: '#000000',
  strokeWidth: 0,
  shadow: undefined,
  curved: false,
  radius: 250,
  arc: 180,
  upsideDown: false,
  transformType: 'none' as const,
  archCurve: 0,  // 0 = no arch, -100 = full arch down, 100 = full arch up
  extrude: undefined,
  w: 600,
}

// ---- Helper: build arc path ----
function buildArcPath(radius: number, arcDeg: number, upsideDown: boolean) {
  const sweep = Math.max(1, Math.min(359.9, arcDeg))
  const r = Math.max(1, radius)
  const startAngle = (Math.PI / 180) * (-sweep / 2)
  const endAngle = (Math.PI / 180) * (sweep / 2)

  const sx = r * Math.cos(startAngle)
  const sy = r * Math.sin(startAngle)
  const ex = r * Math.cos(endAngle)
  const ey = r * Math.sin(endAngle)
  const largeArc = sweep > 180 ? 1 : 0
  const sweepFlag = upsideDown ? 0 : 1
  return `M ${sx},${sy} A ${r},${r} 0 ${largeArc} ${sweepFlag} ${ex},${ey}`
}

// ---- The shape definition ----
export class KText extends ShapeUtil<KTextShape> {
  static override type = 'ktext' as const
  static override props: RecordProps<KTextShape> = {
    text: T.string,
    fontFamily: T.string,
    fontWeight: T.number,
    sizePx: T.number,
    letterSpacing: T.number,
    lineHeight: T.number,
    align: T.literalEnum('start', 'middle', 'end'),
    fill: T.string,
    gradient: T.object({
      from: T.string,
      to: T.string,
      angle: T.number,
    }).optional(),
    stroke: T.string.optional(),
    strokeWidth: T.number.optional(),
    shadow: T.object({
      dx: T.number,
      dy: T.number,
      blur: T.number,
      color: T.string,
      opacity: T.number,
    }).optional(),
    curved: T.boolean,
    radius: T.number,
    arc: T.number,
    upsideDown: T.boolean,
    transformType: T.literalEnum('none', 'arch', 'rise', 'wave', 'flag', 'circle', 'angle', 'distort', 'custom'),
    archCurve: T.number,
    extrude: T.object({
      depth: T.number,
      step: T.number,
      color: T.string,
      opacity: T.number,
    }).optional(),
    w: T.number,
  }

  override getDefaultProps(): KTextShape['props'] {
    return DEFAULTS
  }

  override getGeometry(shape: KTextShape): Rectangle2d {
    const w = shape.props.curved ? (shape.props.radius + shape.props.sizePx) * 2 : shape.props.w
    const h = shape.props.curved ? (shape.props.radius + shape.props.sizePx) * 2 : shape.props.sizePx * 1.5
    
    return new Rectangle2d({
      width: w,
      height: h,
      isFilled: false,
    })
  }

  override component(shape: KTextShape) {
    const editor = useEditor()
    if (!shape || !shape.id) {
      // Return a placeholder if shape is not fully initialized
      return <HTMLContainer>{null}</HTMLContainer>
    }
    const isEditing = useIsEditing(shape.id)
    const {
      text, fontFamily, fontWeight, sizePx, letterSpacing, lineHeight, align,
      fill, gradient, stroke, strokeWidth, shadow, curved, radius, arc, upsideDown, transformType, archCurve, extrude, w,
    } = shape.props

    // unique IDs per shape to scope defs
    const gid = `grad-${shape.id}`
    const pid = `path-${shape.id}`
    const fid = `filt-${shape.id}`

    // gradient fill
    const useGradient = !!gradient
    const gradientDef = useGradient ? (
      <linearGradient id={gid} gradientTransform={`rotate(${gradient!.angle})`}>
        <stop offset="0%" stopColor={gradient!.from} />
        <stop offset="100%" stopColor={gradient!.to} />
      </linearGradient>
    ) : null

    // shadow filter
    const useShadow = !!shadow
    const filterDef = useShadow ? (
      <filter id={fid} x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow
          dx={shadow!.dx}
          dy={shadow!.dy}
          stdDeviation={shadow!.blur / 2}
          floodColor={shadow!.color}
          floodOpacity={shadow!.opacity}
        />
      </filter>
    ) : null

    const fillPaint = useGradient ? `url(#${gid})` : fill

    // Extrude layers (simple: stacked copies behind main text)
    const extrudeLayers: React.ReactNode[] = []
    if (extrude && extrude.depth > 0 && extrude.step > 0) {
      for (let i = extrude.depth; i > 0; i -= extrude.step) {
        extrudeLayers.push(
          curved ? (
            <text key={`ex-${i}`} fontFamily={fontFamily} fontWeight={fontWeight}
              fontSize={sizePx} letterSpacing={letterSpacing} textAnchor={align === 'start' ? 'start' : align === 'end' ? 'end' : 'middle'}
              fill={extrude.color} fillOpacity={extrude.opacity}
              style={{ filter: useShadow ? `url(#${fid})` : undefined }}
            >
              <textPath href={`#${pid}`} startOffset="50%">
                {text}
              </textPath>
            </text>
          ) : (
            <text key={`ex-${i}`} fontFamily={fontFamily} fontWeight={fontWeight}
              fontSize={sizePx} letterSpacing={letterSpacing}
              textAnchor={align === 'start' ? 'start' : align === 'end' ? 'end' : 'middle'}
              x={0 + i} y={0 + i} // offset to create depth
              style={{ filter: useShadow ? `url(#${fid})` : undefined, whiteSpace: 'pre-wrap' }}
            >
              {text}
            </text>
          )
        )
      }
    }

    // Determine if we should use arch transformation
    const useArch = transformType === 'arch' && archCurve !== 0
    const effectiveCurved = curved || useArch
    
    // Calculate arch path if using arch transformation
    let archPath: string | null = null
    if (useArch) {
      // Convert archCurve (-100 to 100) to radius and arc
      // Positive = arch up, negative = arch down
      // More positive = more curve up = smaller radius
      // More negative = more curve down = smaller radius
      const intensity = Math.abs(archCurve) / 100 // 0 to 1
      // Estimate text width (approximate based on character count and font size)
      const estimatedWidth = text.length * sizePx * 0.6 || w
      // Calculate radius: high intensity = smaller radius (more curve)
      // Range: from textWidth/0.5 (very curved) to textWidth/2 (slight curve)
      const minRadius = estimatedWidth * 0.5 // very curved
      const maxRadius = estimatedWidth * 2 // slight curve
      const archRadius = minRadius + (1 - intensity) * (maxRadius - minRadius)
      // Sweep angle: higher intensity = wider arc
      const archArc = Math.max(30, Math.min(180, intensity * 180))
      archPath = buildArcPath(archRadius, archArc, archCurve < 0) // negative = upside down
    }

    // Main text (curved or straight)
    const mainText =
      effectiveCurved ? (
        <text
          fontFamily={fontFamily}
          fontWeight={fontWeight}
          fontSize={sizePx}
          letterSpacing={letterSpacing}
          textAnchor={align === 'start' ? 'start' : align === 'end' ? 'end' : 'middle'}
          style={{ filter: useShadow ? `url(#${fid})` : undefined }}
          stroke={strokeWidth ? stroke : 'none'}
          strokeWidth={strokeWidth || 0}
          fill={fillPaint}
        >
          <textPath href={useArch && archPath ? `#arch-${shape.id}` : `#${pid}`} startOffset="50%">
            {text}
          </textPath>
        </text>
      ) : (
        <text
          fontFamily={fontFamily}
          fontWeight={fontWeight}
          fontSize={sizePx}
          letterSpacing={letterSpacing}
          textAnchor={align === 'start' ? 'start' : align === 'end' ? 'end' : 'middle'}
          style={{
            filter: useShadow ? `url(#${fid})` : undefined,
            whiteSpace: 'pre-wrap',
            lineHeight: `${lineHeight}`,
          } as React.CSSProperties}
          x={align === 'start' ? -w/2 : align === 'end' ? w/2 : 0}
          y={sizePx * 0.8}
          stroke={strokeWidth && stroke ? stroke : 'none'}
          strokeWidth={strokeWidth || 0}
          fill={fillPaint || fill || '#111111'}
        >
          {text || 'Your text here'}
        </text>
      )

    // We draw in a centered local coord-space so rotation/scale is intuitive
    const svgWidth = effectiveCurved ? radius * 2 + sizePx * 2 : w
    const svgHeight = effectiveCurved ? radius * 2 + sizePx * 2 : sizePx * 2
    
    return (
      <HTMLContainer 
        style={{
          width: svgWidth,
          height: svgHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg 
          width={svgWidth} 
          height={svgHeight}
          viewBox={effectiveCurved ? `${-radius - sizePx} ${-radius - sizePx} ${(radius + sizePx) * 2} ${(radius + sizePx) * 2}` : `${-w/2} 0 ${w} ${sizePx * 2}`}
          style={{ overflow: 'visible', display: 'block' }}
        >
          <defs>
            {gradientDef}
            {filterDef}
            {effectiveCurved && (
              useArch && archPath ? (
                <path id={`arch-${shape.id}`} d={archPath} fill="none" stroke="transparent" />
              ) : (
                <path id={pid} d={buildArcPath(radius, arc, upsideDown)} />
              )
            )}
          </defs>

          {/* extrude behind */}
          {extrudeLayers}

          {/* main */}
          {mainText}
        </svg>

        {isEditing && (
          <div
            contentEditable
            suppressContentEditableWarning
            style={{
              position: 'absolute',
              left: 0, top: 0,
              transform: 'translate(-50%, -50%)',
              minWidth: 200,
              outline: '2px dashed #999',
              background: 'rgba(255,255,255,0.8)',
              padding: 6, borderRadius: 8,
              fontFamily, fontWeight, fontSize: sizePx, lineHeight,
              letterSpacing, textAlign: align === 'start' ? 'left' : align === 'end' ? 'right' : 'center',
            }}
            onInput={(e) => {
              const value = (e.currentTarget.textContent ?? '').replace(/\n{3,}/g, '\n\n')
              editor.updateShapes([{ id: shape.id, type: 'ktext', props: { ...shape.props, text: value } }])
            }}
          >
            {text}
          </div>
        )}
      </HTMLContainer>
    )
  }

  override indicator(_shape: KTextShape) {
    return null
  }
}
