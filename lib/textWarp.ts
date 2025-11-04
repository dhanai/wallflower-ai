// src/lib/textWarp.ts
// Non-TLDRAW Kittl-style text warps for your existing editor.
// Works with a per-layer <canvas> you already mount when showCurvedCanvas === true.

export type WarpMode =
  | 'none'
  | 'arc'
  | 'bulge'
  | 'flag'   // aka wave
  | 'perspective'; // 4-point envelope

export type WarpParams = {
  // shared
  intensity?: number;      // 0..1 (arc radius or bulge strength)
  direction?: 1 | -1;      // invert curvature
  // flag/wave
  amplitude?: number;      // 0..0.5 of height
  frequency?: number;      // waves across width (e.g., 1–5)
  phase?: number;          // radians
  // perspective envelope (normalized 0..1 in layer box)
  p00?: { x: number; y: number }; // top-left
  p10?: { x: number; y: number }; // top-right
  p01?: { x: number; y: number }; // bottom-left
  p11?: { x: number; y: number }; // bottom-right
};

export type TextPaint = {
  font: string;            // e.g. "700 64px Inter"
  fill: string;            // color
  align: CanvasTextAlign;  // 'left'|'center'|'right'
  letterSpacingPx: number; // px
  lineHeight: number;      // 1.0..2.0
  outline?: { width: number; color: string; join?: CanvasLineJoin; miterLimit?: number };
  shadow?: { blur: number; offsetX: number; offsetY: number; color: string };
  extrusion?: { depth: number; color: string; steps?: number }; // faux 3D
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp  = (a: number, b: number, t: number) => a + (b - a) * t;

function textToGlyphs(ctx: CanvasRenderingContext2D, text: string, letterSpacingPx: number) {
  const lines = text.split('\n');
  return lines.map(line => {
    const glyphs = [];
    let x = 0;
    for (const ch of line) {
      const w = ctx.measureText(ch).width;
      glyphs.push({ ch, x, w });
      x += w + letterSpacingPx;
    }
    return { glyphs, lineWidth: Math.max(0, x - letterSpacingPx) };
  });
}

// ---- Warps (normalized space [0..1]x[0..1]) ----

function warpArc(u: number, v: number, p: WarpParams) {
  const k = (p.intensity ?? 0) * (p.direction ?? 1); // curvature
  if (Math.abs(k) < 1e-5) return { x: u, y: v };
  // arc across X; offset Y by quadratic curve in [-0.5..0.5]
  const x = u;
  const yy = (u - 0.5);
  const y = v + k * (1 - (yy * yy) * 4) * 0.25; // nice-looking arc
  return { x, y };
}

function warpBulge(u: number, v: number, p: WarpParams) {
  const k = p.intensity ?? 0;
  if (Math.abs(k) < 1e-5) return { x: u, y: v };
  const cx = u - 0.5, cy = v - 0.5;
  const r2 = cx*cx + cy*cy;
  const scale = 1 + k * (1 - clamp(r2 * 4, 0, 1));
  return { x: 0.5 + cx * scale, y: 0.5 + cy * scale };
}

function warpFlag(u: number, v: number, p: WarpParams) {
  const amp = p.amplitude ?? 0.12;
  const freq = p.frequency ?? 2;
  const phase = p.phase ?? 0;
  const offset = Math.sin((u * Math.PI * 2 * freq) + phase) * amp;
  return { x: u, y: clamp(v + offset, 0, 1) };
}

function warpPerspective(u: number, v: number, p: WarpParams) {
  const p00 = p.p00 ?? { x: 0, y: 0 };
  const p10 = p.p10 ?? { x: 1, y: 0 };
  const p01 = p.p01 ?? { x: 0, y: 1 };
  const p11 = p.p11 ?? { x: 1, y: 1 };
  // bilinear
  const x = (1 - u) * (1 - v) * p00.x + u * (1 - v) * p10.x + (1 - u) * v * p01.x + u * v * p11.x;
  const y = (1 - u) * (1 - v) * p00.y + u * (1 - v) * p10.y + (1 - u) * v * p01.y + u * v * p11.y;
  return { x, y };
}

function applyWarp(u: number, v: number, mode: WarpMode, p: WarpParams) {
  switch (mode) {
    case 'arc': return warpArc(u, v, p);
    case 'bulge': return warpBulge(u, v, p);
    case 'flag': return warpFlag(u, v, p);
    case 'perspective': return warpPerspective(u, v, p);
    default: return { x: u, y: v };
  }
}

// ---- Main render ----
// Draws text into ctx within [0..width]x[0..height] box with warps.
// Each glyph is sampled at a few vertical slices then drawn to the warped pos.
// This is fast enough for live editing at typical sizes.

export function renderWarpedText(
  ctx: CanvasRenderingContext2D,
  box: { width: number; height: number },
  text: string,
  paint: TextPaint,
  warp: { mode: WarpMode; params: WarpParams }
) {
  const { width, height } = box;

  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.font = paint.font;
  ctx.fillStyle = paint.fill;
  ctx.textAlign = 'left';

  if (paint.shadow) {
    const s = paint.shadow;
    ctx.shadowBlur = s.blur;
    ctx.shadowOffsetX = s.offsetX;
    ctx.shadowOffsetY = s.offsetY;
    ctx.shadowColor = s.color;
  } else {
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = ctx.shadowOffsetY = 0;
  }

  const lines = textToGlyphs(ctx, text, paint.letterSpacingPx);
  const lineHeightPx = parseFloat(paint.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? '24') * paint.lineHeight;

  // horizontal alignment offset per line
  const alignOffset = (lineWidth: number) => {
    if (paint.align === 'center') return (width - lineWidth) / 2;
    if (paint.align === 'right') return (width - lineWidth);
    return 0;
  };

  let yCursor = 0;
  for (const { glyphs, lineWidth } of lines) {
    const baseX = alignOffset(lineWidth);

    for (const g of glyphs) {
      // sample vertical slices for each glyph and draw them shifted (cheap "mesh")
      const sliceCount = 6; // quality vs perf
      for (let s = 0; s < sliceCount; s++) {
        const t0 = s / sliceCount;
        const t1 = (s + 1) / sliceCount;
        const uh0 = (baseX + g.x) / width;
        const uh1 = (baseX + g.x + g.w) / width;
        const vv0 = (yCursor) / height;
        const vv1 = (yCursor + lineHeightPx) / height;

        const p0 = applyWarp(lerp(uh0, uh1, 0.5), lerp(vv0, vv1, t0), warp.mode, warp.params);
        const p1 = applyWarp(lerp(uh0, uh1, 0.5), lerp(vv0, vv1, t1), warp.mode, warp.params);

        const y0 = p0.y * height;
        const y1 = p1.y * height;

        // clip row, draw substring using clip rect
        ctx.save();
        ctx.beginPath();
        ctx.rect(baseX + g.x, yCursor + t0 * lineHeightPx, g.w, (t1 - t0) * lineHeightPx);
        ctx.clip();

        // outline/extrusion under fill
        if (paint.extrusion && paint.extrusion.depth > 0) {
          const steps = Math.max(1, paint.extrusion.steps ?? 6);
          const dx = (p1.x - p0.x) * width / steps;
          const dy = (y1 - y0) / steps;
          ctx.fillStyle = paint.extrusion.color;
          for (let i = steps; i > 0; i--) {
            ctx.fillText(g.ch, baseX + g.x + i * dx, y0 + i * dy);
          }
          ctx.fillStyle = paint.fill; // restore
        }

        if (paint.outline && paint.outline.width > 0) {
          ctx.lineWidth = paint.outline.width;
          ctx.strokeStyle = paint.outline.color;
          ctx.lineJoin = paint.outline.join ?? 'round';
          ctx.miterLimit = paint.outline.miterLimit ?? 2;
          ctx.strokeText(g.ch, baseX + g.x, y0);
        }

        ctx.fillText(g.ch, baseX + g.x, y0);
        ctx.restore();
      }
    }

    yCursor += lineHeightPx;
  }

  ctx.restore();
}
