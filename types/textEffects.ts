// types/textEffects.ts
// Kittl-style effects stack for KText shapes

export type FillEffect = 
  | { type: 'fill'; mode: 'solid'; color: string }
  | { type: 'fill'; mode: 'linear'; from: string; to: string; angle: number }
  | { type: 'fill'; mode: 'radial'; from: string; to: string; cx: number; cy: number; r: number }

export type StrokeEffect = {
  type: 'stroke'
  color: string
  width: number
  align: 'inside' | 'center' | 'outside'
  join?: 'miter' | 'round' | 'bevel'
  miterLimit?: number
}

export type ShadowEffect = {
  type: 'shadow'
  dx: number
  dy: number
  blur: number
  color: string
  opacity: number
  spread?: number
}

export type ExtrudeEffect = {
  type: 'extrude'
  depth: number
  step: number
  color: string
  opacity: number
  angle?: number // angle in degrees for perspective
}

export type TextureEffect = {
  type: 'texture'
  src: string
  blend: 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light'
  opacity: number
  clipToText: boolean
  scale?: number
  offsetX?: number
  offsetY?: number
}

export type OutlineEffect = {
  type: 'outline'
  width: number
  color: string
  join: 'miter' | 'round' | 'bevel'
  miterLimit?: number
  offset?: number // outside offset in px
}

export type TextEffect = 
  | FillEffect
  | StrokeEffect
  | ShadowEffect
  | ExtrudeEffect
  | TextureEffect
  | OutlineEffect

// Helper to convert legacy props to effects stack
export function legacyPropsToEffects(props: {
  fill?: string
  gradient?: { from: string; to: string; angle: number }
  stroke?: string
  strokeWidth?: number
  shadow?: { dx: number; dy: number; blur: number; color: string; opacity: number }
  extrude?: { depth: number; step: number; color: string; opacity: number }
}): TextEffect[] {
  const effects: TextEffect[] = []
  
  // Fill (must be first)
  if (props.gradient) {
    effects.push({
      type: 'fill',
      mode: 'linear',
      from: props.gradient.from,
      to: props.gradient.to,
      angle: props.gradient.angle,
    })
  } else if (props.fill) {
    effects.push({
      type: 'fill',
      mode: 'solid',
      color: props.fill,
    })
  }
  
  // Stroke
  if (props.stroke && props.strokeWidth && props.strokeWidth > 0) {
    effects.push({
      type: 'stroke',
      color: props.stroke,
      width: props.strokeWidth,
      align: 'center', // default
      join: 'miter',
    })
  }
  
  // Shadow
  if (props.shadow) {
    effects.push({
      type: 'shadow',
      ...props.shadow,
    })
  }
  
  // Extrude
  if (props.extrude) {
    effects.push({
      type: 'extrude',
      ...props.extrude,
      angle: 0, // default
    })
  }
  
  return effects
}

// Helper to extract values from effects stack for backward compatibility
export function effectsToLegacyProps(effects: TextEffect[]): {
  fill?: string
  gradient?: { from: string; to: string; angle: number }
  stroke?: string
  strokeWidth?: number
  shadow?: { dx: number; dy: number; blur: number; color: string; opacity: number }
  extrude?: { depth: number; step: number; color: string; opacity: number }
} {
  const result: any = {}
  
  for (const effect of effects) {
    if (effect.type === 'fill') {
      if (effect.mode === 'solid') {
        result.fill = effect.color
      } else if (effect.mode === 'linear') {
        result.gradient = {
          from: effect.from,
          to: effect.to,
          angle: effect.angle,
        }
      }
    } else if (effect.type === 'stroke') {
      result.stroke = effect.color
      result.strokeWidth = effect.width
    } else if (effect.type === 'shadow') {
      result.shadow = {
        dx: effect.dx,
        dy: effect.dy,
        blur: effect.blur,
        color: effect.color,
        opacity: effect.opacity,
      }
    } else if (effect.type === 'extrude') {
      result.extrude = {
        depth: effect.depth,
        step: effect.step,
        color: effect.color,
        opacity: effect.opacity,
      }
    }
  }
  
  return result
}

