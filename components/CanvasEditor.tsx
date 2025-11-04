'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tooltip } from '@base-ui-components/react/tooltip';
import { Menu } from '@base-ui-components/react/menu';
import { AlertDialog } from '@base-ui-components/react/alert-dialog';
import { Select } from '@base-ui-components/react/select';
import { TextLayerPropertiesPanel } from './TextLayerPropertiesPanel';
import { useToast } from '@/hooks/useToast';
import CollectionModal from '@/components/CollectionModal';
import { useMobileMenu } from '@/contexts/MobileMenuContext';

const tshirtColors = [
  { label: 'White', hex: '#ffffff' },
  { label: 'Black', hex: '#000000' },
  { label: 'Gray', hex: '#808080' },
  { label: 'Mustard', hex: '#D4A017' },
  { label: 'Blue', hex: '#1E3A8A' },
  { label: 'Green', hex: '#166534' },
  { label: 'Red', hex: '#B91C1C' },
  { label: 'Pink', hex: '#DB2777' },
];

const geminiStyles = [
  { label: 'No Style', value: '' },
  { label: 'Comic Book', value: 'Comic Book' },
  { label: 'Anime', value: 'Anime' },
  { label: 'Watercolor', value: 'Watercolor' },
  { label: 'Photograph', value: 'Photograph' },
  { label: 'Minimalist', value: 'Minimalist' },
  { label: 'Vintage', value: 'Vintage' },
  { label: 'Retro', value: 'Retro' },
  { label: 'Modern', value: 'Modern' },
  { label: 'Abstract', value: 'Abstract' },
  { label: '3D Render', value: '3D Render' },
  { label: 'Sketch', value: 'Sketch' },
  { label: 'Pop Art', value: 'Pop Art' },
  { label: 'Realistic', value: 'Realistic' },
  { label: 'Fantasy', value: 'Fantasy' },
  { label: 'Sci-Fi', value: 'Sci-Fi' },
  { label: 'Surrealist', value: 'Surrealist' },
  { label: 'Noir', value: 'Noir' },
  { label: 'Pastel', value: 'Pastel' },
  { label: 'Bold', value: 'Bold' },
  { label: 'Hand-drawn', value: 'Hand-drawn' },
];

const recraftStyles = [
  { label: 'No Style', value: '' },
  { label: 'Realistic Image', value: 'realistic_image' },
  { label: 'Digital Illustration', value: 'digital_illustration' },
  { label: 'Vector Illustration', value: 'vector_illustration' },
  { label: 'Pixel Art', value: 'digital_illustration/pixel_art' },
  { label: 'Hand Drawn', value: 'digital_illustration/hand_drawn' },
  { label: '2D Art Poster', value: 'digital_illustration/2d_art_poster' },
  { label: 'Bold Fantasy', value: 'digital_illustration/bold_fantasy' },
  { label: 'Pop Art', value: 'digital_illustration/pop_art' },
  { label: 'Street Art', value: 'digital_illustration/street_art' },
  { label: 'Noir', value: 'digital_illustration/noir' },
  { label: 'Pastel Gradient', value: 'digital_illustration/pastel_gradient' },
  { label: 'Bold Stroke', value: 'vector_illustration/bold_stroke' },
  { label: 'Contour Pop Art', value: 'vector_illustration/contour_pop_art' },
  { label: 'Editorial', value: 'vector_illustration/editorial' },
  { label: 'Infographical', value: 'vector_illustration/infographical' },
  { label: 'Line Art', value: 'vector_illustration/line_art' },
];

const models = [
  { label: 'Gemini 2.5 Flash', value: 'gemini-25' },
  { label: 'Recraft V3', value: 'recraft-v3' },
  { label: 'Seedream V4', value: 'seedream-v4' },
];

const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter', stack: 'Inter, sans-serif' },
  { label: 'Abril Fatface', value: 'Abril Fatface', stack: '"Abril Fatface", cursive' },
  { label: 'Alfa Slab One', value: 'Alfa Slab One', stack: '"Alfa Slab One", cursive' },
  { label: 'Creepster', value: 'Creepster', stack: '"Creepster", cursive' },
  { label: 'Permanent Marker', value: 'Permanent Marker', stack: '"Permanent Marker", cursive' },
  { label: 'Archivo', value: 'Archivo', stack: 'Archivo, sans-serif' },
];

type FillType = 'solid' | 'linear-gradient' | 'radial-gradient' | 'pattern';

type BlendMode =
  | 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference'
  | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';

type WarpType = 'none' | 'distort' | 'circle' | 'angle' | 'arch' | 'rise' | 'wave' | 'flag' | 'custom';

type TextLayer = {
  id: string;
  text: string;
  x: number; // 0-1 relative to canvas width
  y: number; // 0-1 relative to canvas height
  width: number; // 0-1 relative to canvas width
  height: number; // 0-1 relative to canvas height
  rotation: number; // degrees
  fontFamily: string;
  fontSize: number; // relative to canvas height
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  underline: boolean;
  textAlign: 'left' | 'center' | 'right';
  color: string; // kept for backward compatibility, maps to fillSolid
  letterSpacing: number; // relative to canvas width
  curve: number; // -1 (concave up) to 1 (concave down) - kept for backward compatibility, maps to warp.type='arc'

  // Fills
  fillType: FillType;
  fillSolid: string;
  fillGradient?: {
    type: 'linear' | 'radial';
    angleDeg?: number; // for linear
    stops: Array<{ offset: number; color: string; alpha?: number }>;
  };
  fillPattern?: {
    imageDataUrl: string;
    scale: number; // 0.1–5
    offsetX: number;
    offsetY: number;
  };

  // Stroke / Outline
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidthPx: number;
  strokeJoin: CanvasLineJoin;
  miterLimit: number;

  // Shadow / Glow
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlurPx: number;
  shadowOffsetX: number;
  shadowOffsetY: number;

  // Faux Extrude (3D stack)
  extrudeEnabled: boolean;
  extrudeDepthPx: number; // 0–80
  extrudeDirectionDeg: number; // 0–360
  extrudeColor: string;

  // Blend mode
  blendMode: BlendMode;

  // Warp (beyond "curve")
  warp: {
    type: WarpType;
    amount: number; // -1..1 typical
    frequency?: number; // for flag/wave
    perspective?: { // for perspective warp
      tl: { x: number; y: number };
      tr: { x: number; y: number };
      br: { x: number; y: number };
      bl: { x: number; y: number };
    };
  };

  // Transform UX options
  lockAspect: boolean;
  rotateSnapDeg: number; // e.g., 15
  scaleFromCenter: boolean;
};

type ResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

// Helper functions for advanced text rendering
function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function layerColor(hexOrRgba: string): string {
  return hexOrRgba;
}

function rgba(hexOrRgba: string, alpha: number): string {
  return hexOrRgba.startsWith('#') ? hexToRgba(hexOrRgba, alpha) : hexOrRgba;
}

function applyFill(ctx: CanvasRenderingContext2D, layer: TextLayer, widthPx: number, heightPx: number) {
  if (layer.fillType === 'solid') {
    ctx.fillStyle = layer.fillSolid || layer.color || '#1d1d1f';
    return;
  }

  if (layer.fillType === 'linear-gradient' || layer.fillType === 'radial-gradient') {
    const grad = layer.fillGradient?.type === 'radial'
      ? ctx.createRadialGradient(widthPx / 2, heightPx / 2, 0, widthPx / 2, heightPx / 2, Math.hypot(widthPx, heightPx) / 2)
      : (() => {
          const angle = ((layer.fillGradient?.angleDeg ?? 0) * Math.PI) / 180;
          const cx = widthPx / 2;
          const cy = heightPx / 2;
          const dx = Math.cos(angle) * (widthPx / 2);
          const dy = Math.sin(angle) * (heightPx / 2);
          return ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
        })();

    (layer.fillGradient?.stops ?? []).forEach(s => {
      grad.addColorStop(s.offset, s.alpha != null
        ? rgba(layerColor(s.color), s.alpha)
        : s.color
      );
    });
    ctx.fillStyle = grad;
    return;
  }

  if (layer.fillType === 'pattern' && layer.fillPattern?.imageDataUrl) {
    // Pattern fills require async image loading - for now, fallback to solid
    // In a production implementation, you'd cache loaded images and use them here
    ctx.fillStyle = layer.fillSolid || layer.color || '#1d1d1f'; // fallback for now
  }
}

function setShadow(ctx: CanvasRenderingContext2D, layer: TextLayer) {
  if (layer.shadowEnabled) {
    ctx.shadowColor = layer.shadowColor;
    ctx.shadowBlur = layer.shadowBlurPx;
    ctx.shadowOffsetX = layer.shadowOffsetX;
    ctx.shadowOffsetY = layer.shadowOffsetY;
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
}

function renderGlyph(ctx: CanvasRenderingContext2D, layer: TextLayer, x: number, y: number, char: string, widthEstimate: number, widthPx: number, heightPx: number) {
  // Blend mode
  // @ts-ignore
  ctx.globalCompositeOperation = layer.blendMode || 'source-over';

  // Faux extrude: draw the same glyph multiple times along a vector
  if (layer.extrudeEnabled && layer.extrudeDepthPx > 0) {
    const steps = Math.max(1, Math.round(layer.extrudeDepthPx / 2));
    const rad = (layer.extrudeDirectionDeg * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    ctx.save();
    setShadow(ctx, { ...layer, shadowEnabled: false });
    ctx.fillStyle = layer.extrudeColor;
    for (let i = steps; i >= 1; i--) {
      ctx.fillText(char, x + dx * i, y + dy * i);
    }
    ctx.restore();
  }

  // Stroke (outline)
  if (layer.strokeEnabled && layer.strokeWidthPx > 0) {
    ctx.lineJoin = layer.strokeJoin;
    ctx.miterLimit = layer.miterLimit;
    ctx.lineWidth = layer.strokeWidthPx;
    ctx.strokeStyle = layer.strokeColor;
    setShadow(ctx, { ...layer, shadowEnabled: false });
    ctx.strokeText(char, x, y);
  }

  // Fill (solid/gradient/pattern) with shadow/glow
  setShadow(ctx, layer);
  applyFill(ctx, layer, widthPx, heightPx);
  ctx.fillText(char, x, y);
}

function warpOffset(layer: TextLayer, xRatio: number, yBase: number, totalAdvance: number): { dx: number; dy: number } {
  const t = xRatio; // 0..1 across the text length
  // Use full amount with multiplier for stronger effects (was 0.5, now 2-3x for visibility)
  const A = (layer.warp.amount || 0) * 2.5; // Much stronger scaling
  const f = layer.warp.frequency ?? 1.0; // Default frequency

  switch (layer.warp.type) {
    case 'distort': {
      // Random-like distortion using sine waves at different frequencies
      const f1 = f * 1.5;
      const f2 = f * 2.3;
      return {
        dx: A * 15 * (Math.sin(2 * Math.PI * f1 * t) * 0.6 + Math.cos(2 * Math.PI * f2 * t) * 0.4),
        dy: A * 12 * (Math.cos(2 * Math.PI * f1 * t) * 0.5 + Math.sin(2 * Math.PI * f2 * t) * 0.5) * yBase * 0.01
      };
    }
    case 'circle': {
      // Circular motion - text follows a circular path
      const angle = t * 2 * Math.PI * f;
      const radius = A * yBase * 0.3;
      return {
        dx: radius * Math.cos(angle),
        dy: radius * Math.sin(angle)
      };
    }
    case 'angle': {
      // Diagonal angle/slant effect
      const angle = A * 0.8; // Angle multiplier
      return {
        dx: angle * (t - 0.5) * totalAdvance * 0.5,
        dy: angle * Math.abs(t - 0.5) * yBase * 0.4
      };
    }
    case 'rise': {
      // Text rises from left to right (or reverse)
      return {
        dx: 0,
        dy: -A * t * yBase * 0.6 // Strong vertical rise
      };
    }
    case 'wave': {
      // Wave motion with both X and Y components
      return {
        dx: A * 20 * Math.sin(2 * Math.PI * f * t),
        dy: A * 15 * Math.cos(2 * Math.PI * f * t) * yBase * 0.01
      };
    }
    case 'flag': {
      // Flag-like waving motion
      return {
        dx: A * 25 * Math.sin(2 * Math.PI * f * t) * (t * 0.5 + 0.5), // Amplifies toward end
        dy: A * 18 * Math.cos(2 * Math.PI * f * t) * yBase * 0.01
      };
    }
    case 'custom': {
      // Custom: combination of multiple effects
      const distort = A * 10 * Math.sin(2 * Math.PI * f * t * 1.3);
      const wave = A * 8 * Math.cos(2 * Math.PI * f * t * 0.7);
      return {
        dx: distort + wave,
        dy: (distort * 0.5 + wave * 0.3) * yBase * 0.01
      };
    }
    default:
      return { dx: 0, dy: 0 };
  }
}

// Style presets for instant Kittl-like looks
const TEXT_STYLE_PRESETS = {
  RetroPop: (base: TextLayer): Partial<TextLayer> => ({
    fillType: 'linear-gradient',
    fillGradient: {
      type: 'linear',
      angleDeg: 90,
      stops: [
        { offset: 0, color: '#FFD166' },
        { offset: 1, color: '#EF476F' },
      ],
    },
    strokeEnabled: true,
    strokeColor: '#073B4C',
    strokeWidthPx: 6,
    strokeJoin: 'round',
    shadowEnabled: true,
    shadowColor: 'rgba(0,0,0,0.25)',
    shadowBlurPx: 16,
    shadowOffsetX: 0,
    shadowOffsetY: 4,
    extrudeEnabled: true,
    extrudeDepthPx: 10,
    extrudeDirectionDeg: 315,
    extrudeColor: '#073B4C',
    blendMode: 'source-over',
    warp: { ...base.warp, type: 'arch', amount: 0.4 },
  }),
  NeonGlow: (base: TextLayer): Partial<TextLayer> => ({
    fillType: 'solid',
    fillSolid: '#39FF14',
    strokeEnabled: true,
    strokeColor: '#0F0',
    strokeWidthPx: 2,
    shadowEnabled: true,
    shadowColor: 'rgba(57,255,20,0.8)',
    shadowBlurPx: 30,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    extrudeEnabled: false,
    blendMode: 'screen',
    warp: { ...base.warp, type: 'none', amount: 0 },
  }),
  ClassicElegant: (base: TextLayer): Partial<TextLayer> => ({
    fillType: 'solid',
    fillSolid: '#1d1d1f',
    strokeEnabled: true,
    strokeColor: '#8B7355',
    strokeWidthPx: 3,
    strokeJoin: 'round',
    shadowEnabled: true,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowBlurPx: 8,
    shadowOffsetX: 0,
    shadowOffsetY: 2,
    extrudeEnabled: false,
    blendMode: 'source-over',
    warp: { ...base.warp, type: 'none', amount: 0 },
  }),
  Bold3D: (base: TextLayer): Partial<TextLayer> => ({
    fillType: 'solid',
    fillSolid: '#FFFFFF',
    strokeEnabled: false,
    shadowEnabled: false,
    extrudeEnabled: true,
    extrudeDepthPx: 20,
    extrudeDirectionDeg: 315,
    extrudeColor: '#000000',
    blendMode: 'source-over',
    warp: { ...base.warp, type: 'rise', amount: 0.3 },
  }),
  WaveVibe: (base: TextLayer): Partial<TextLayer> => ({
    fillType: 'linear-gradient',
    fillGradient: {
      type: 'linear',
      angleDeg: 45,
      stops: [
        { offset: 0, color: '#FF6B6B' },
        { offset: 0.5, color: '#4ECDC4' },
        { offset: 1, color: '#45B7D1' },
      ],
    },
    strokeEnabled: false,
    shadowEnabled: true,
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowBlurPx: 12,
    shadowOffsetX: 0,
    shadowOffsetY: 3,
    extrudeEnabled: false,
    blendMode: 'source-over',
    warp: { ...base.warp, type: 'wave', amount: 0.5, frequency: 1.0 },
  }),
};

type TransformSession =
  | {
    type: 'move';
    pointerId: number;
    layerId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    moved: boolean;
  }
  | {
    type: 'resize';
    pointerId: number;
    layerId: string;
    corner: ResizeCorner;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    initialFontSize: number;
    moved: boolean;
  }
  | {
    type: 'rotate';
    pointerId: number;
    layerId: string;
    center: { x: number; y: number };
    startAngle: number;
    initialRotation: number;
  };

const MIN_TEXT_WIDTH_PX = 40;
const MIN_TEXT_HEIGHT_PX = 24;
const SNAP_THRESHOLD_PX = 10;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const CURVE_THRESHOLD = 0.01;
const MAX_CURVE_RADIANS = Math.PI * 0.85; // ~153 degrees of bend

const CURVE_PRESETS: Array<{ label: string; value: number; description: string }> = [
  { label: 'U50', value: -0.6, description: 'Curve up 60%' },
  { label: 'U25', value: -0.3, description: 'Curve up 30%' },
  { label: 'Flat', value: 0, description: 'No curve' },
  { label: 'D25', value: 0.3, description: 'Curve down 30%' },
  { label: 'D50', value: 0.6, description: 'Curve down 60%' },
];

const createLayerCanvas = (layer: TextLayer, baseWidth: number, baseHeight: number): HTMLCanvasElement | null => {
  if (typeof document === 'undefined') return null;

  const widthPx = Math.max(1, Math.round(layer.width * baseWidth));
  const heightPx = Math.max(1, Math.round(layer.height * baseHeight));

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const text = layer.text || '';
  if (!text.trim()) {
    return canvas;
  }

  // Backward compatibility: map old fields to new if not present
  const fillType = layer.fillType || 'solid';
  const fillSolid = layer.fillSolid || layer.color || '#1d1d1f';
  // Map old 'arc' to new 'arch', and handle legacy curve mapping
  let warpType: WarpType = 'none';
  if (layer.warp?.type) {
    const existingType = layer.warp.type as string;
    // Handle backward compatibility: map old 'arc' to new 'arch'
    if (existingType === 'arc') {
      warpType = 'arch';
    } else if (existingType !== 'none' && ['none', 'distort', 'circle', 'angle', 'arch', 'rise', 'wave', 'flag', 'custom'].includes(existingType)) {
      warpType = existingType as WarpType;
    }
  } else if (layer.curve !== 0) {
    warpType = 'arch'; // Legacy curve maps to arch
  }
  const warpAmount = layer.warp?.amount ?? (layer.curve !== 0 ? layer.curve : 0);

  const fontSizePx = layer.fontSize * baseHeight;
  const letterSpacingPx = layer.letterSpacing * baseWidth;
  const fontParts = [
    layer.fontStyle === 'italic' ? 'italic' : '',
    layer.fontWeight === 'bold' ? 'bold' : '',
    `${fontSizePx}px`,
    getFontStack(layer.fontFamily),
  ].filter(Boolean);

  ctx.font = fontParts.join(' ');
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  const characters = Array.from(text);
  const glyphs = characters.map((char, index) => {
    const metrics = ctx.measureText(char);
    const advance = metrics.width + (index < characters.length - 1 ? letterSpacingPx : 0);
    return { char, metrics, advance };
  });

  const totalAdvance = glyphs.reduce((acc, glyph) => acc + glyph.advance, 0);
  if (totalAdvance <= 0) {
    return canvas;
  }

  // Determine warp type: arch uses curve math (renamed from arc), others use flat layout + warpOffset
  const isArch = warpType === 'arch';
  const doOtherWarp = warpType !== 'none' && warpType !== 'arch';
  const effectiveCurve = text.includes('\n') ? 0 : (isArch ? clamp(layer.curve, -0.95, 0.95) : 0);
  const curveRadians = effectiveCurve * MAX_CURVE_RADIANS;

  const needsVerticalPadding = Math.abs(curveRadians) >= CURVE_THRESHOLD || doOtherWarp;
  const paddingY = needsVerticalPadding ? fontSizePx * 0.8 : 0;
  const effectiveHeight = heightPx + paddingY * 2;

  if (canvas.height !== Math.max(1, Math.round(effectiveHeight))) {
    canvas.height = Math.max(1, Math.round(effectiveHeight));
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = fontParts.join(' ');
  ctx.textBaseline = 'alphabetic';

  // Prepare layer with defaults for backward compatibility
  const layerWithDefaults: TextLayer = {
    ...layer,
    fillType,
    fillSolid,
    fillGradient: layer.fillGradient || { type: 'linear', angleDeg: 0, stops: [{ offset: 0, color: '#fff' }, { offset: 1, color: '#000' }] },
    strokeEnabled: layer.strokeEnabled ?? false,
    strokeColor: layer.strokeColor || '#000000',
    strokeWidthPx: layer.strokeWidthPx ?? 2,
    strokeJoin: layer.strokeJoin || 'miter',
    miterLimit: layer.miterLimit ?? 4,
    shadowEnabled: layer.shadowEnabled ?? false,
    shadowColor: layer.shadowColor || 'rgba(0,0,0,0.35)',
    shadowBlurPx: layer.shadowBlurPx ?? 12,
    shadowOffsetX: layer.shadowOffsetX ?? 0,
    shadowOffsetY: layer.shadowOffsetY ?? 2,
    extrudeEnabled: layer.extrudeEnabled ?? false,
    extrudeDepthPx: layer.extrudeDepthPx ?? 12,
    extrudeDirectionDeg: layer.extrudeDirectionDeg ?? 315,
    extrudeColor: layer.extrudeColor || '#000000',
    blendMode: layer.blendMode || 'source-over',
    warp: layer.warp || { type: warpType, amount: warpAmount, frequency: 0.5 },
  };

  if (doOtherWarp) {
    // Non-arc warp: flat baseline with warp offset
    let startX: number;
    const startXAlignBase = layer.textAlign === 'left' ? 0 : layer.textAlign === 'right' ? widthPx - totalAdvance : (widthPx - totalAdvance) / 2;

    if (layer.textAlign === 'left') {
      startX = 0;
    } else if (layer.textAlign === 'right') {
      startX = Math.max(widthPx - totalAdvance, 0);
    } else {
      startX = (widthPx - totalAdvance) / 2;
    }

    const baselineY = paddingY + heightPx / 2;
    const positions: { glyph: typeof glyphs[number]; x: number; y: number }[] = [];
    let acc = 0;

    glyphs.forEach((g) => {
      const midX = startX + g.metrics.width / 2;
      const xRatio = (midX - startXAlignBase) / Math.max(1, totalAdvance);
      const off = warpOffset(layerWithDefaults, xRatio, fontSizePx, totalAdvance);
      positions.push({ glyph: g, x: midX + off.dx, y: baselineY + off.dy });
      startX += g.advance;
    });

    ctx.textAlign = 'center';
    positions.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      renderGlyph(ctx, layerWithDefaults, 0, 0, p.glyph.char, p.glyph.metrics.width, widthPx, heightPx);
      ctx.restore();
    });

    // Underline for warped text
    if (layer.underline) {
      ctx.fillStyle = layerWithDefaults.strokeEnabled ? layerWithDefaults.strokeColor : layerWithDefaults.fillSolid;
      positions.forEach(p => {
        const underlineY = p.y + (p.glyph.metrics.actualBoundingBoxDescent || fontSizePx * 0.1);
        const underlineHeight = Math.max(1, fontSizePx * 0.05);
        ctx.fillRect(p.x - p.glyph.metrics.width / 2, underlineY, p.glyph.metrics.width, underlineHeight);
      });
    }

    return canvas;
  }

  if (Math.abs(curveRadians) < CURVE_THRESHOLD) {
    // Flat baseline
    let startX: number;
    if (layer.textAlign === 'left') {
      startX = 0;
    } else if (layer.textAlign === 'right') {
      startX = Math.max(widthPx - totalAdvance, 0);
    } else {
      startX = (widthPx - totalAdvance) / 2;
    }

    const baselineY = paddingY + heightPx / 2;
    glyphs.forEach((glyph) => {
      renderGlyph(ctx, layerWithDefaults, startX, baselineY, glyph.char, glyph.metrics.width, widthPx, heightPx);
      if (layer.underline) {
        const underlineY = baselineY + (glyph.metrics.actualBoundingBoxDescent || fontSizePx * 0.1);
        const underlineHeight = Math.max(1, fontSizePx * 0.05);
        ctx.fillStyle = layerWithDefaults.strokeEnabled ? layerWithDefaults.strokeColor : layerWithDefaults.fillSolid;
        ctx.fillRect(startX, underlineY, glyph.metrics.width, underlineHeight);
      }
      startX += glyph.advance;
    });

    return canvas;
  }

  // Arc (curved) path
  const radius = totalAdvance / curveRadians;
  const baselineY = paddingY + heightPx / 2;
  const centerX = widthPx / 2;
  const centerY = baselineY + radius;

  const positions: { glyph: typeof glyphs[number]; midAngle: number; x: number; y: number }[] = [];
  let currentAngleOffset = 0;

  glyphs.forEach((glyph) => {
    const glyphAngle = glyph.advance / radius;
    const midAngle = -curveRadians / 2 + currentAngleOffset + glyphAngle / 2;
    const x = centerX + radius * Math.sin(midAngle);
    const y = centerY - radius * Math.cos(midAngle);
    positions.push({ glyph, midAngle, x, y });
    currentAngleOffset += glyphAngle;
  });

  let minX = Infinity;
  let maxX = -Infinity;
  positions.forEach(({ glyph, x }) => {
    const halfWidth = glyph.metrics.width / 2;
    minX = Math.min(minX, x - halfWidth);
    maxX = Math.max(maxX, x + halfWidth);
  });

  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return canvas;
  }

  let shiftX = 0;
  if (layer.textAlign === 'left') {
    shiftX = -minX;
  } else if (layer.textAlign === 'right') {
    shiftX = widthPx - maxX;
  } else {
    shiftX = widthPx / 2 - (minX + maxX) / 2;
  }

  ctx.textAlign = 'center';
  positions.forEach(({ glyph, midAngle, x, y }) => {
    ctx.save();
    ctx.translate(x + shiftX, y);
    ctx.rotate(midAngle);
    renderGlyph(ctx, layerWithDefaults, 0, 0, glyph.char, glyph.metrics.width, widthPx, heightPx);
    ctx.restore();
  });

  return canvas;
};

const getFontStack = (fontFamily: string) => {
  const option = FONT_OPTIONS.find((font) => font.value === fontFamily);
  return option?.stack || `${fontFamily}, sans-serif`;
};

// Calculate tight bounding box for curved text (like Kittl)
const calculateCurvedTextBounds = (
  layer: TextLayer,
  baseWidth: number,
  baseHeight: number
): { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number } | null => {
  if (typeof document === 'undefined') return null;

  const text = layer.text || '';
  if (!text.trim()) return null;

  const effectiveCurve = text.includes('\n') ? 0 : clamp(layer.curve, -0.95, 0.95);
  const curveRadians = effectiveCurve * MAX_CURVE_RADIANS;

  if (Math.abs(curveRadians) < CURVE_THRESHOLD) {
    // For flat text, return the standard bounds
    const widthPx = layer.width * baseWidth;
    const heightPx = layer.height * baseHeight;
    return {
      minX: 0,
      maxX: widthPx,
      minY: 0,
      maxY: heightPx,
      width: widthPx,
      height: heightPx,
    };
  }

  // Create temporary canvas to measure text
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const widthPx = layer.width * baseWidth;
  const heightPx = layer.height * baseHeight;
  const fontSizePx = layer.fontSize * baseHeight;
  const letterSpacingPx = layer.letterSpacing * baseWidth;
  const fontParts = [
    layer.fontStyle === 'italic' ? 'italic' : '',
    layer.fontWeight === 'bold' ? 'bold' : '',
    `${fontSizePx}px`,
    getFontStack(layer.fontFamily),
  ].filter(Boolean);

  ctx.font = fontParts.join(' ');
  ctx.textBaseline = 'alphabetic';

  const characters = Array.from(text);
  const glyphs = characters.map((char, index) => {
    const metrics = ctx.measureText(char);
    const advance = metrics.width + (index < characters.length - 1 ? letterSpacingPx : 0);
    return { char, metrics, advance };
  });

  const totalAdvance = glyphs.reduce((acc, glyph) => acc + glyph.advance, 0);
  if (totalAdvance <= 0) return null;

  const radius = totalAdvance / curveRadians;
  const paddingY = fontSizePx * 0.8;
  const baselineY = paddingY + heightPx / 2;
  const centerX = widthPx / 2;
  const centerY = baselineY + radius;

  const positions: { glyph: typeof glyphs[number]; midAngle: number; x: number; y: number }[] = [];
  let currentAngleOffset = 0;

  glyphs.forEach((glyph) => {
    const glyphAngle = glyph.advance / radius;
    const midAngle = -curveRadians / 2 + currentAngleOffset + glyphAngle / 2;
    const x = centerX + radius * Math.sin(midAngle);
    const y = centerY - radius * Math.cos(midAngle);
    positions.push({ glyph, midAngle, x, y });
    currentAngleOffset += glyphAngle;
  });

  // Calculate bounding box from all glyph positions
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  positions.forEach(({ glyph, midAngle, x, y }) => {
    // Account for rotated glyph bounding box
    const halfWidth = glyph.metrics.width / 2;
    const ascent = glyph.metrics.actualBoundingBoxAscent || fontSizePx * 0.8;
    const descent = glyph.metrics.actualBoundingBoxDescent || fontSizePx * 0.2;

    // Calculate corners of the rotated glyph
    const cos = Math.cos(midAngle);
    const sin = Math.sin(midAngle);

    const corners = [
      { x: -halfWidth, y: -ascent },
      { x: halfWidth, y: -ascent },
      { x: halfWidth, y: descent },
      { x: -halfWidth, y: descent },
    ].map((corner) => ({
      x: x + corner.x * cos - corner.y * sin,
      y: y + corner.x * sin + corner.y * cos,
    }));

    corners.forEach(({ x: cornerX, y: cornerY }) => {
      minX = Math.min(minX, cornerX);
      maxX = Math.max(maxX, cornerX);
      minY = Math.min(minY, cornerY);
      maxY = Math.max(maxY, cornerY);
    });
  });

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return null;
  }

  // Apply text alignment shift
  let shiftX = 0;
  if (layer.textAlign === 'left') {
    shiftX = -minX;
  } else if (layer.textAlign === 'right') {
    shiftX = widthPx - maxX;
  } else {
    shiftX = widthPx / 2 - (minX + maxX) / 2;
  }

  // Shift bounds
  minX += shiftX;
  maxX += shiftX;

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

// Hotspot indicator component
function HotspotIndicator({ hotspot, imageUrl, containerRef }: { hotspot: { x: number; y: number }; imageUrl: string; containerRef: React.RefObject<HTMLDivElement> }) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current || !imageUrl) return;

    const img = new window.Image();
    img.onload = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const containerAspect = rect.width / rect.height;
      const imageAspect = img.naturalWidth / img.naturalHeight;

      let displayWidth: number;
      let displayHeight: number;
      let offsetX = 0;
      let offsetY = 0;

      if (imageAspect > containerAspect) {
        displayWidth = rect.width;
        displayHeight = rect.width / imageAspect;
        offsetY = (rect.height - displayHeight) / 2;
      } else {
        displayHeight = rect.height;
        displayWidth = rect.height * imageAspect;
        offsetX = (rect.width - displayWidth) / 2;
      }

      const relativeX = (hotspot.x / img.naturalWidth) * displayWidth + offsetX;
      const relativeY = (hotspot.y / img.naturalHeight) * displayHeight + offsetY;

      setPosition({ x: relativeX, y: relativeY });
    };
    img.src = imageUrl;
  }, [hotspot, imageUrl, containerRef]);

  if (!position) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)'
        }}
      >
        {/* Pulsing ring - centered */}
        <div
          className="absolute w-6 h-6 rounded-full border-2 border-[#7c3aed] animate-pulse-center"
          style={{
            left: '50%',
            top: '50%'
          }}
        />
        {/* Center dot - on top */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white bg-[#7c3aed] shadow-lg"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        />
      </div>
    </div>
  );
}

function useMobileMenuSafe() {
  try {
    return useMobileMenu();
  } catch {
    return null;
  }
}

export default function CanvasEditor({ embedded = false, userRole = null }: { embedded?: boolean, userRole?: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const mobileMenu = useMobileMenuSafe();
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-25');
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const [lastMode, setLastMode] = useState<null | 'generate' | 'style' | 'edit'>(null);
  const [lastStyleImage, setLastStyleImage] = useState<string | null>(null);
  const [lastModel, setLastModel] = useState<string>('gemini-25');
  const [lastArtStyle, setLastArtStyle] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [showStartOverDialog, setShowStartOverDialog] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [mockupLoading, setMockupLoading] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<string>('#ffffff');
  const [showSettings, setShowSettings] = useState(false);
  const [showOrderDrawer, setShowOrderDrawer] = useState(false);
  const [orderProductType, setOrderProductType] = useState<'tshirt' | 'crewneck'>('tshirt');
  const [orderSize, setOrderSize] = useState<string>('lg');
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteDesignConfirm, setShowDeleteDesignConfirm] = useState(false);
  const [currentIterationId, setCurrentIterationId] = useState<string | null>(null);
  const [iterationIds, setIterationIds] = useState<(string | null)[]>([]); // Maps history index to variation ID
  const [hotspotMode, setHotspotMode] = useState(false);
  const [hotspot, setHotspot] = useState<{ x: number; y: number } | null>(null);
  const [loadingDesign, setLoadingDesign] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [hoveredTextId, setHoveredTextId] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const [snapGuides, setSnapGuides] = useState<{ horizontal: boolean; vertical: boolean }>({ horizontal: false, vertical: false });
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasFileInputRef = useRef<HTMLInputElement>(null);
  const textElementRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const textWrapperRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const textCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const canvasRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const transformSession = useRef<TransformSession | null>(null);
  const textLayersRef = useRef<TextLayer[]>(textLayers);
  const canvasSizeRef = useRef(canvasSize);
  const editingTextIdRef = useRef<string | null>(editingTextId);

  const updateCanvasDimensions = useCallback(() => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width && rect.height) {
      setCanvasSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    textLayersRef.current = textLayers;
  }, [textLayers]);

  useEffect(() => {
    canvasSizeRef.current = canvasSize;
  }, [canvasSize]);

  useEffect(() => {
    editingTextIdRef.current = editingTextId;
  }, [editingTextId]);


  useEffect(() => {
    if (typeof document === 'undefined') {
      setFontsReady(true);
      return;
    }

    let cancelled = false;
    const maybeFonts = (document as any).fonts;

    if (maybeFonts && typeof maybeFonts.ready === 'object' && typeof maybeFonts.ready.then === 'function') {
      (maybeFonts.ready as Promise<void>).then(() => {
        if (!cancelled) {
          setFontsReady(true);
        }
      }).catch(() => {
        if (!cancelled) {
          setFontsReady(true);
        }
      });
    } else {
      setFontsReady(true);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const updateTextLayer = useCallback(
    (id: string, updates: Partial<TextLayer>) => {
      setTextLayers((prev) =>
        prev.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer))
      );
    },
    []
  );

  // Apply text style preset
  const applyTextPreset = useCallback(
    (layerId: string, presetName: string) => {
      const layer = textLayers.find((l) => l.id === layerId);
      if (!layer) return;
      const preset = TEXT_STYLE_PRESETS[presetName as keyof typeof TEXT_STYLE_PRESETS];
      if (!preset) return;
      const patch = preset(layer);
      updateTextLayer(layerId, patch);
    },
    [textLayers, updateTextLayer]
  );

  const removeTextLayer = useCallback((id: string) => {
    setTextLayers((prev) => prev.filter((layer) => layer.id !== id));
    setActiveTextId((current) => (current === id ? null : current));
    setEditingTextId((current) => (current === id ? null : current));
  }, []);

  const addTextLayer = useCallback(() => {
    if (!canvasRef.current) return;
    updateCanvasDimensions();
    const { width, height } = canvasSizeRef.current;
    if (!width || !height) return;

    const id = crypto?.randomUUID ? crypto.randomUUID() : `text-${Date.now()}`;
    const layerWidth = Math.min(0.6, 320 / width);
    const layerHeight = Math.min(0.2, 120 / height);

    const newLayer: TextLayer = {
      id,
      text: 'Add text here',
      x: Math.max(0, (1 - layerWidth) / 2),
      y: Math.max(0, (1 - layerHeight) / 2),
      width: layerWidth,
      height: layerHeight,
      rotation: 0,
      fontFamily: 'Inter',
      fontSize: 0.08,
      fontWeight: 'normal',
      fontStyle: 'normal',
      underline: false,
      textAlign: 'center',
      color: '#1d1d1f',
      letterSpacing: 0,
      curve: 0,

      // New fields with defaults
      fillType: 'solid',
      fillSolid: '#1d1d1f',
      fillGradient: { type: 'linear', angleDeg: 0, stops: [{ offset: 0, color: '#fff' }, { offset: 1, color: '#000' }] },
      strokeEnabled: false,
      strokeColor: '#000000',
      strokeWidthPx: 2,
      strokeJoin: 'miter',
      miterLimit: 4,
      shadowEnabled: false,
      shadowColor: 'rgba(0,0,0,0.35)',
      shadowBlurPx: 12,
      shadowOffsetX: 0,
      shadowOffsetY: 2,
      extrudeEnabled: false,
      extrudeDepthPx: 12,
      extrudeDirectionDeg: 315,
      extrudeColor: '#000000',
      blendMode: 'source-over',
      warp: { type: 'none', amount: 0, frequency: 0.5 },
      lockAspect: true,
      rotateSnapDeg: 15,
      scaleFromCenter: false,
    };

    setTextLayers((prev) => [...prev, newLayer]);
    setActiveTextId(id);
    setEditingTextId(id);
    setHoveredTextId(id);
    setShowSettings(false);
    setHotspotMode(false);
  }, [updateCanvasDimensions, setShowSettings, setHotspotMode]);

  const startMoveSession = useCallback(
    (layerId: string, event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const { width, height } = canvasSizeRef.current;
      if (!width || !height) return;

      const layer = textLayersRef.current.find((item) => item.id === layerId);
      if (!layer) return;
      if (editingTextIdRef.current === layerId) return;

      event.preventDefault();
      event.stopPropagation();

      const initialX = layer.x * width;
      const initialY = layer.y * height;
      const initialWidth = layer.width * width;
      const initialHeight = layer.height * height;

      transformSession.current = {
        type: 'move',
        pointerId: event.pointerId,
        layerId,
        startX: event.clientX,
        startY: event.clientY,
        initialX,
        initialY,
        initialWidth,
        initialHeight,
        moved: false,
      };

      setActiveTextId(layerId);
      setEditingTextId((prev) => (prev && prev !== layerId ? null : prev));
      document.body.style.cursor = 'grab';
    },
    [setActiveTextId, setEditingTextId]
  );

  const startResizeSession = useCallback(
    (layerId: string, corner: ResizeCorner, event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const { width, height } = canvasSizeRef.current;
      if (!width || !height) return;
      const layer = textLayersRef.current.find((item) => item.id === layerId);
      if (!layer) return;

      const initialX = layer.x * width;
      const initialY = layer.y * height;
      const initialWidth = layer.width * width;
      const initialHeight = layer.height * height;

      transformSession.current = {
        type: 'resize',
        pointerId: event.pointerId,
        layerId,
        corner,
        startX: event.clientX,
        startY: event.clientY,
        initialX,
        initialY,
        initialWidth,
        initialHeight,
        initialFontSize: layer.fontSize,
        moved: false,
      };

      setActiveTextId(layerId);
      setEditingTextId(null);
      document.body.style.cursor = 'nwse-resize';
    },
    [setActiveTextId, setEditingTextId]
  );

  const startRotateSession = useCallback(
    (layerId: string, event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const layer = textLayersRef.current.find((item) => item.id === layerId);
      if (!layer) return;

      const wrapper = textWrapperRefs.current[layerId];
      if (!wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const startAngle = Math.atan2(event.clientY - center.y, event.clientX - center.x);

      transformSession.current = {
        type: 'rotate',
        pointerId: event.pointerId,
        layerId,
        center,
        startAngle,
        initialRotation: layer.rotation,
      };

      setActiveTextId(layerId);
      setEditingTextId(null);
      document.body.style.cursor = 'grab';
    },
    [setActiveTextId, setEditingTextId]
  );

  // Prevent hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!canvasRef.current) return;

    updateCanvasDimensions();

    const observer = new ResizeObserver(() => {
      updateCanvasDimensions();
    });
    observer.observe(canvasRef.current);

    return () => observer.disconnect();
  }, [mounted, updateCanvasDimensions, generatedImage]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const session = transformSession.current;
      if (!session) return;
      if (event.pointerId !== session.pointerId) return;

      const { width: canvasWidth, height: canvasHeight } = canvasSizeRef.current;
      if (!canvasWidth || !canvasHeight) return;

      if (session.type === 'move') {
        const deltaX = event.clientX - session.startX;
        const deltaY = event.clientY - session.startY;

        if (!session.moved && Math.hypot(deltaX, deltaY) > 2) {
          session.moved = true;
        }

        let newXpx = clamp(session.initialX + deltaX, 0, canvasWidth - session.initialWidth);
        let newYpx = clamp(session.initialY + deltaY, 0, canvasHeight - session.initialHeight);

        // Calculate layer center
        const layerCenterX = newXpx + session.initialWidth / 2;
        const layerCenterY = newYpx + session.initialHeight / 2;

        // Calculate canvas center
        const canvasCenterX = canvasWidth / 2;
        const canvasCenterY = canvasHeight / 2;

        // Check snap distances
        const snapXDistance = Math.abs(layerCenterX - canvasCenterX);
        const snapYDistance = Math.abs(layerCenterY - canvasCenterY);

        const shouldSnapX = snapXDistance < SNAP_THRESHOLD_PX;
        const shouldSnapY = snapYDistance < SNAP_THRESHOLD_PX;

        // Apply snapping
        if (shouldSnapX) {
          newXpx = canvasCenterX - session.initialWidth / 2;
          newXpx = clamp(newXpx, 0, canvasWidth - session.initialWidth);
        }
        if (shouldSnapY) {
          newYpx = canvasCenterY - session.initialHeight / 2;
          newYpx = clamp(newYpx, 0, canvasHeight - session.initialHeight);
        }

        // Update snap guide state
        setSnapGuides({
          horizontal: shouldSnapY,
          vertical: shouldSnapX,
        });

        const newX = newXpx / canvasWidth;
        const newY = newYpx / canvasHeight;

        setTextLayers((prev) =>
          prev.map((layer) =>
            layer.id === session.layerId
              ? {
                ...layer,
                x: newX,
                y: newY,
              }
              : layer
          )
        );
        document.body.style.cursor = 'grabbing';
      } else if (session.type === 'resize') {
        const deltaX = event.clientX - session.startX;
        const deltaY = event.clientY - session.startY;

        if (!session.moved && Math.hypot(deltaX, deltaY) > 2) {
          session.moved = true;
        }

        const layer = textLayersRef.current.find((l) => l.id === session.layerId);
        const keepAspect = layer?.lockAspect || event.shiftKey; // Shift forces aspect
        const fromCenter = layer?.scaleFromCenter || event.altKey || event.metaKey; // Alt/Option or Cmd for center scaling

        let widthPx = session.initialWidth;
        let heightPx = session.initialHeight;
        let xPx = session.initialX;
        let yPx = session.initialY;

        switch (session.corner) {
          case 'top-left':
            widthPx = session.initialWidth - deltaX;
            heightPx = session.initialHeight - deltaY;
            xPx = session.initialX + deltaX;
            yPx = session.initialY + deltaY;
            break;
          case 'top-right':
            widthPx = session.initialWidth + deltaX;
            heightPx = session.initialHeight - deltaY;
            yPx = session.initialY + deltaY;
            break;
          case 'bottom-left':
            widthPx = session.initialWidth - deltaX;
            heightPx = session.initialHeight + deltaY;
            xPx = session.initialX + deltaX;
            break;
          case 'bottom-right':
            widthPx = session.initialWidth + deltaX;
            heightPx = session.initialHeight + deltaY;
            break;
        }

        // Aspect lock
        if (keepAspect) {
          const aspect = session.initialWidth / session.initialHeight;
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            heightPx = widthPx / aspect;
            // Adjust position based on corner
            if (session.corner === 'top-left' || session.corner === 'top-right') {
              yPx = session.initialY + (session.initialHeight - heightPx);
            } else if (session.corner === 'bottom-left' || session.corner === 'bottom-right') {
              yPx = session.initialY;
            }
          } else {
            widthPx = heightPx * aspect;
            // Adjust position based on corner
            if (session.corner === 'top-left' || session.corner === 'bottom-left') {
              xPx = session.initialX + (session.initialWidth - widthPx);
            } else if (session.corner === 'top-right' || session.corner === 'bottom-right') {
              xPx = session.initialX;
            }
          }
        }

        // Center scaling
        if (fromCenter) {
          const centerX = session.initialX + session.initialWidth / 2;
          const centerY = session.initialY + session.initialHeight / 2;
          xPx = centerX - widthPx / 2;
          yPx = centerY - heightPx / 2;
        }

        // Clamp dimensions and position
        if (widthPx < MIN_TEXT_WIDTH_PX) {
          if (session.corner === 'top-left' || session.corner === 'bottom-left') {
            xPx += widthPx - MIN_TEXT_WIDTH_PX;
          }
          widthPx = MIN_TEXT_WIDTH_PX;
        }
        if (heightPx < MIN_TEXT_HEIGHT_PX) {
          if (session.corner === 'top-left' || session.corner === 'top-right') {
            yPx += heightPx - MIN_TEXT_HEIGHT_PX;
          }
          heightPx = MIN_TEXT_HEIGHT_PX;
        }

        xPx = clamp(xPx, 0, canvasWidth - widthPx);
        yPx = clamp(yPx, 0, canvasHeight - heightPx);
        widthPx = clamp(widthPx, MIN_TEXT_WIDTH_PX, canvasWidth - xPx);
        heightPx = clamp(heightPx, MIN_TEXT_HEIGHT_PX, canvasHeight - yPx);

        const widthRatio = widthPx / canvasWidth;
        const heightRatio = heightPx / canvasHeight;
        const xRatio = xPx / canvasWidth;
        const yRatio = yPx / canvasHeight;

        const heightScale = heightPx / session.initialHeight;
        // Better font size clamping (6px to 800px equivalent)
        const nextFontSize = clamp(session.initialFontSize * heightScale, 0.006, 1.2);

        setTextLayers((prev) =>
          prev.map((layer) =>
            layer.id === session.layerId
              ? {
                  ...layer,
                  x: xRatio,
                  y: yRatio,
                  width: widthRatio,
                  height: heightRatio,
                  fontSize: nextFontSize,
                  letterSpacing: keepAspect ? layer.letterSpacing * (widthPx / session.initialWidth) : layer.letterSpacing,
                }
              : layer
          )
        );
        document.body.style.cursor = 'nwse-resize';
      } else if (session.type === 'rotate') {
        const currentAngle = Math.atan2(event.clientY - session.center.y, event.clientX - session.center.x);
        const delta = currentAngle - session.startAngle;
        const rawDeg = ((session.initialRotation + (delta * 180) / Math.PI) % 360 + 360) % 360;
        
        const layer = textLayersRef.current.find((l) => l.id === session.layerId);
        const snap = layer?.rotateSnapDeg ?? 15;
        const snapped = snap ? Math.round(rawDeg / snap) * snap : rawDeg;
        
        updateTextLayer(session.layerId, { rotation: snapped });
        document.body.style.cursor = 'grabbing';
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      const session = transformSession.current;
      if (!session) return;
      if (event.pointerId !== session.pointerId) return;

      document.body.style.removeProperty('cursor');

      if (session.type === 'move') {
        setActiveTextId(session.layerId);
        if (!session.moved) {
          setEditingTextId(session.layerId);
        }
      } else if (session.type === 'resize' || session.type === 'rotate') {
        setActiveTextId(session.layerId);
      }

      // Clear snap guides when drag ends
      setSnapGuides({ horizontal: false, vertical: false });
      transformSession.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [updateTextLayer]);

  useEffect(() => {
    if (!editingTextId) return;
    const element = textElementRefs.current[editingTextId];
    if (!element) return;
    element.focus({ preventScroll: true });
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, [editingTextId]);

  const activeTextLayer = useMemo(() => textLayers.find((layer) => layer.id === activeTextId) ?? null, [textLayers, activeTextId]);

  const activeFontSizePx = useMemo(() => {
    if (!activeTextLayer) return 0;
    return Math.max(8, Math.round(activeTextLayer.fontSize * (canvasSize.height || 1)));
  }, [activeTextLayer, canvasSize.height]);

  const activeLetterSpacingPx = useMemo(() => {
    if (!activeTextLayer) return 0;
    return Math.round(activeTextLayer.letterSpacing * (canvasSize.width || 1));
  }, [activeTextLayer, canvasSize.width]);

  const activeCurveValue = useMemo(() => {
    if (!activeTextLayer) return 0;
    return clamp(activeTextLayer.curve, -1, 1);
  }, [activeTextLayer]);

  const activeCurvePreset = useMemo(() => {
    let closest = CURVE_PRESETS[0];
    let minDiff = Infinity;
    CURVE_PRESETS.forEach((preset) => {
      const diff = Math.abs(activeCurveValue - preset.value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = preset;
      }
    });
    return closest;
  }, [activeCurveValue]);

  const handleFontSizeChange = useCallback((sizePx: number) => {
    if (!activeTextId) return;
    const { height } = canvasSizeRef.current;
    if (!height) return;
    const ratio = clamp(sizePx / height, 0.01, 1);
    updateTextLayer(activeTextId, { fontSize: ratio });
  }, [activeTextId, updateTextLayer]);

  const handleLetterSpacingChange = useCallback((spacingPx: number) => {
    if (!activeTextId) return;
    const { width } = canvasSizeRef.current;
    if (!width) return;
    const ratio = spacingPx / width;
    updateTextLayer(activeTextId, { letterSpacing: ratio });
  }, [activeTextId, updateTextLayer]);

  const handleCurvePresetClick = useCallback((curveValue: number) => {
    if (!activeTextId) return;
    const normalized = clamp(curveValue, -1, 1);
    const layer = textLayers.find((l) => l.id === activeTextId);
    updateTextLayer(activeTextId, {
      curve: normalized,
      warp: {
        ...(layer?.warp || { type: 'none', amount: 0, frequency: 0.5 }),
        type: normalized !== 0 ? 'arch' : 'none',
        amount: normalized,
      },
    });
  }, [activeTextId, updateTextLayer, textLayers]);

  const drawCurvedTextLayer = useCallback((layer: TextLayer, canvasEl: HTMLCanvasElement) => {
    if (!canvasEl) return;

    const { width: canvasWidth, height: canvasHeight } = canvasSizeRef.current;
    if (!canvasWidth || !canvasHeight) return;

    const layerCanvas = createLayerCanvas(layer, canvasWidth, canvasHeight);
    const widthPx = layerCanvas ? layerCanvas.width : Math.max(1, Math.round(layer.width * canvasWidth));
    const heightPx = layerCanvas ? layerCanvas.height : Math.max(1, Math.round(layer.height * canvasHeight));
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    const pixelWidth = Math.max(1, Math.round(widthPx * dpr));
    const pixelHeight = Math.max(1, Math.round(heightPx * dpr));

    if (canvasEl.width !== pixelWidth) {
      canvasEl.width = pixelWidth;
    }
    if (canvasEl.height !== pixelHeight) {
      canvasEl.height = pixelHeight;
    }
    canvasEl.style.width = `${widthPx}px`;
    canvasEl.style.height = `${heightPx}px`;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.scale(dpr, dpr);

    if (layerCanvas) {
      ctx.drawImage(layerCanvas, 0, 0, widthPx, heightPx);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !fontsReady) return;
    const { width, height } = canvasSize;
    if (!width || !height) return;

    textLayers.forEach((layer) => {
      const canvasEl = textCanvasRefs.current[layer.id];
      if (!canvasEl) return;

      // Check if layer needs canvas rendering (curved or advanced features)
      const hasAdvancedFeatures = 
        layer.strokeEnabled ||
        layer.shadowEnabled ||
        layer.extrudeEnabled ||
        (layer.fillType && layer.fillType !== 'solid') ||
        (layer.warp?.type && layer.warp.type !== 'none' && layer.warp.type !== 'arch') ||
        (layer.blendMode && layer.blendMode !== 'source-over');
      const isCurved = Math.abs(layer.curve) >= CURVE_THRESHOLD && !layer.text.includes('\n');
      const needsCanvas = isCurved || hasAdvancedFeatures;

      if (!needsCanvas) {
        const ctx = canvasEl.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        }
        return;
      }

      drawCurvedTextLayer(layer, canvasEl);
    });
  }, [textLayers, canvasSize.width, canvasSize.height, fontsReady, mounted, drawCurvedTextLayer, editingTextId]);

  const handleFontFamilyChange = useCallback((fontFamily: string) => {
    if (!activeTextId) return;
    updateTextLayer(activeTextId, { fontFamily });
  }, [activeTextId, updateTextLayer]);

  const handleColorChange = useCallback((color: string) => {
    if (!activeTextId) return;
    updateTextLayer(activeTextId, { color });
  }, [activeTextId, updateTextLayer]);

  const handleDeleteActiveText = useCallback(() => {
    if (!activeTextId) return;
    removeTextLayer(activeTextId);
  }, [activeTextId, removeTextLayer]);

  const handleCanvasPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as Node | null;
    if (!target) return;

    // Check if click is on any text layer (wrapper, element, or toolbar)
    const clickedOnTextWrapper = Object.values(textWrapperRefs.current).some(el => el?.contains(target));
    const clickedOnTextElement = Object.values(textElementRefs.current).some(el => el?.contains(target));
    if (clickedOnTextWrapper || clickedOnTextElement) {
      return;
    }

    // Clear all text selection states when clicking outside
    setEditingTextId(null);
    setActiveTextId(null);
    setHoveredTextId(null);
  }, []);

  // Load design or template from query parameter
  useEffect(() => {
    if (!mounted) return;

    async function loadDesign() {
      const designId = searchParams?.get('design');
      const templateId = searchParams?.get('template');

      // If both parameters were removed from URL, clear workspace
      if (!designId && !templateId && currentDesignId) {
        setGeneratedImage(null);
        setPrompt('');
        setStyleImage(null);
        setImageHistory([]);
        setIterationIds([]);
        setHistoryIndex(-1);
        setCurrentDesignId(null);
        setCurrentIterationId(null);
        setHotspot(null);
        setHotspotMode(false);
        return;
      }

      // If no design ID or template ID, return (but don't clear if we're already cleared)
      if (!designId && !templateId) return;

      // Handle template copying
      if (templateId) {
        // If already loading this exact template, skip
        if (templateId === currentDesignId) return;

        setLoadingDesign(true);
        try {
          // Copy template to user's account
          const response = await fetch('/api/designs/copy-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateDesignId: templateId }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Error copying template:', errorData);
            toast.error(errorData.error || 'Failed to copy template');
            return;
          }

          const { design: newDesign } = await response.json();

          if (!newDesign) {
            console.error('Failed to create design from template');
            toast.error('Failed to create design from template');
            return;
          }

          // Set the new design ID
          setCurrentDesignId(newDesign.id);

          // Build image history with just the copied image (no variations)
          const history = [newDesign.image_url];
          const ids: (string | null)[] = [null];

          setImageHistory(history);
          setIterationIds(ids);
          setHistoryIndex(0);
          setGeneratedImage(history[0]);

          // Update URL to use the new design ID instead of template ID
          router.replace(`/editor?design=${newDesign.id}`, { scroll: false });

          toast.success('Template copied to your designs!');
        } catch (error) {
          console.error('Error copying template:', error);
          toast.error('Failed to copy template');
        } finally {
          setLoadingDesign(false);
        }
        return;
      }

      // Handle regular design loading
      // If already loading this exact design, skip
      if (designId === currentDesignId) return;

      setLoadingDesign(true);
      try {
        // Use API route instead of direct Supabase client to avoid hanging
        const response = await fetch(`/api/designs/load?designId=${designId}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error loading design:', errorData);

          if (errorData.error?.includes('Database tables not set up')) {
            toast.error('Database tables not set up. Please run the migration in Supabase SQL Editor. See DATABASE_SETUP.md for instructions.');
          } else if (response.status === 404) {
            console.error('Design not found');
          } else {
            console.error('Failed to load design:', errorData.error || 'Unknown error');
          }
          return;
        }

        const { design: designData, variations } = await response.json();

        if (!designData) {
          console.error('Design not found');
          return;
        }

        // Set design ID immediately to prevent duplicate loads
        setCurrentDesignId(designData.id);

        // Build image history: [design image, ...variations]
        // Also track iteration IDs: [null, ...variation IDs] (null for design image at index 0)
        const history = [designData.image_url];
        const ids: (string | null)[] = [null]; // Index 0 is the design, no variation ID
        if (variations && Array.isArray(variations) && variations.length > 0) {
          history.push(...variations.map((v: any) => v.image_url));
          ids.push(...variations.map((v: any) => v.id));
        }

        setImageHistory(history);
        setIterationIds(ids);

        // Find the index of the thumbnail_image_url if it exists, otherwise show latest
        let initialIndex = history.length - 1; // Default to latest
        if (designData.thumbnail_image_url) {
          const thumbnailIndex = history.findIndex(url => url === designData.thumbnail_image_url);
          if (thumbnailIndex >= 0) {
            initialIndex = thumbnailIndex;
          }
        }

        setHistoryIndex(initialIndex);
        setGeneratedImage(history[initialIndex]);

        // Don't populate the prompt input when loading a design
      } catch (error) {
        console.error('Error loading design:', error);
        // Reset currentDesignId on error if we had set it, so it can retry
        setCurrentDesignId(null);
      } finally {
        setLoadingDesign(false);
      }
    }

    loadDesign();
    // Use searchParams.toString() to detect any changes to query parameters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, searchParams?.toString()]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setStyleImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCanvasFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        applyNewImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        applyNewImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!generatedImage) {
      canvasFileInputRef.current?.click();
      return;
    }

    // If hotspot mode is active, capture coordinates
    if (hotspotMode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Get the actual image element to calculate real pixel coordinates
      const imgElement = canvasRef.current.querySelector('img');
      if (imgElement && generatedImage) {
        // Create an image to get its natural dimensions
        const img = new window.Image();
        img.onload = () => {
          // Calculate the image's display size within the container
          const containerAspect = rect.width / rect.height;
          const imageAspect = img.naturalWidth / img.naturalHeight;

          let displayWidth: number;
          let displayHeight: number;
          let offsetX = 0;
          let offsetY = 0;

          if (imageAspect > containerAspect) {
            // Image is wider - fit to width
            displayWidth = rect.width;
            displayHeight = rect.width / imageAspect;
            offsetY = (rect.height - displayHeight) / 2;
          } else {
            // Image is taller - fit to height
            displayHeight = rect.height;
            displayWidth = rect.height * imageAspect;
            offsetX = (rect.width - displayWidth) / 2;
          }

          // Convert click coordinates to image coordinates
          const relativeX = clickX - offsetX;
          const relativeY = clickY - offsetY;

          // Scale to actual image dimensions
          const x = Math.round((relativeX / displayWidth) * img.naturalWidth);
          const y = Math.round((relativeY / displayHeight) * img.naturalHeight);

          // Ensure coordinates are within image bounds
          const finalX = Math.max(0, Math.min(img.naturalWidth, x));
          const finalY = Math.max(0, Math.min(img.naturalHeight, y));

          // Store hotspot and deactivate hotspot mode
          setHotspot({ x: finalX, y: finalY });
          setHotspotMode(false);
        };
        img.onerror = () => {
          // Fallback to canvas coordinates if image load fails
          const x = Math.round(clickX);
          const y = Math.round(clickY);
          setHotspot({ x, y });
          setHotspotMode(false);
        };
        img.src = generatedImage;
      } else {
        // Fallback to canvas coordinates
        const x = Math.round(clickX);
        const y = Math.round(clickY);
        setHotspot({ x, y });
        setHotspotMode(false);
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setShowSettings(false); // Close settings when submitting generate
    setLoading(true);
    setLastPrompt(prompt);
    setLastStyleImage(styleImage);
    setLastMode(styleImage ? 'style' : 'generate');
    setLastModel(selectedModel);
    setLastArtStyle(selectedStyle);

    try {
      // For Recraft V3 with images, we need to create the style first
      let customStyleId: string | undefined;
      if (selectedModel === 'recraft-v3' && styleImage) {
        // Create custom style using Recraft
        const createStyleResponse = await fetch('/api/designs/create-recraft-style', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrls: [styleImage],
            baseStyle: selectedStyle || 'digital_illustration',
          }),
        });

        const styleData = await createStyleResponse.json();
        if (styleData.styleId) {
          customStyleId = styleData.styleId;
        }
      }

      const endpoint = styleImage && selectedModel !== 'recraft-v3'
        ? '/api/designs/style-transfer'
        : '/api/designs/generate';

      const body = styleImage && selectedModel !== 'recraft-v3'
        ? {
          referenceImageUrl: styleImage,
          prompt,
          aspectRatio: '4:5',
          artStyle: selectedStyle || undefined,
          model: selectedModel,
        }
        : {
          prompt,
          aspectRatio: '4:5',
          artStyle: selectedStyle || undefined,
          model: selectedModel,
          style: selectedStyle || undefined,
          styleId: customStyleId,
          backgroundColor,
        };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Generation failed:', data);
        throw new Error(data.error || 'Failed to generate design');
      }
      if (data.imageUrl) {
        applyNewImage(data.imageUrl);
        // Store design ID from response (if new design was created)
        if (data.design?.id) {
          setCurrentDesignId(data.design.id);
          console.log('Design saved with ID:', data.design.id);
        } else {
          console.warn('Design generated but no design ID returned:', data);
        }
      }
      // Track last action for retry
      setLastPrompt(prompt);
      setLastMode(styleImage ? 'style' : 'generate');
      setLastStyleImage(styleImage);
      // Clear the prompt input after successful generation
      setPrompt('');
    } catch (error) {
      console.error('Error generating design:', error);
      toast.error('Failed to generate design');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!generatedImage || !prompt.trim()) return;

    setShowSettings(false); // Close settings when submitting edit
    setLoading(true);
    try {
      // Use stored hotspot if available
      const editHotspot = hotspot;

      const response = await fetch('/api/designs/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId: currentDesignId,
          imageUrl: generatedImage,
          editPrompt: prompt,
          noiseLevel: 0.3,
          model: selectedModel,
          referenceImageUrl: styleImage || undefined,
          hotspot: editHotspot || undefined,
          // If we used a custom Recraft style, we need to save that ID
          // For now, we'll pass undefined as styleId for edits
        }),
      });

      const data = await response.json();
      if (data.imageUrl) {
        applyNewImage(data.imageUrl);
      }
      // Track last action for retry
      setLastPrompt(prompt);
      setLastMode('edit');
      // Clear the prompt input and hotspot after successful edit
      setPrompt('');
      setHotspot(null);
    } catch (error) {
      console.error('Error editing design:', error);
      toast.error('Failed to edit design');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!generatedImage && lastMode !== 'generate' && lastMode !== 'style') return;
    if (!lastMode) return;
    setShowSettings(false); // Close settings when clicking retry
    setLoading(true);
    try {
      if (lastMode === 'edit') {
        // For edits, retry from the previous image in history
        const baseImageIndex = Math.max(0, historyIndex - 1);
        const baseImage = imageHistory[baseImageIndex];
        if (!baseImage) {
          toast.error('Cannot retry edit: no base image found');
          return;
        }

        const res = await fetch('/api/designs/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            designId: currentDesignId,
            imageUrl: baseImage, // Use previous image as base
            editPrompt: lastPrompt,
            noiseLevel: 0.3,
            model: lastModel,
            referenceImageUrl: lastStyleImage || undefined,
          }),
        });
        const data = await res.json();
        if (data.imageUrl) {
          // Replace current iteration instead of adding new one
          replaceCurrentIteration(data.imageUrl);
        }
        return;
      }

      // For Recraft V3 with images, we need to create the style first
      let customStyleId: string | undefined;
      if (lastModel === 'recraft-v3' && lastStyleImage) {
        try {
          const createStyleResponse = await fetch('/api/designs/create-recraft-style', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrls: [lastStyleImage],
              baseStyle: lastArtStyle || 'digital_illustration',
            }),
          });

          const styleData = await createStyleResponse.json();
          if (styleData.styleId) {
            customStyleId = styleData.styleId;
          }
        } catch (err) {
          console.error('Failed to create Recraft style on retry:', err);
        }
      }

      const isStyle = lastMode === 'style' && lastStyleImage && lastModel !== 'recraft-v3';
      const endpoint = isStyle ? '/api/designs/style-transfer' : '/api/designs/generate';
      const body = isStyle
        ? {
          referenceImageUrl: lastStyleImage,
          prompt: lastPrompt,
          aspectRatio: '4:5',
          model: lastModel,
          artStyle: lastArtStyle,
          designId: currentDesignId || undefined, // Pass designId to update existing design when retrying
        }
        : {
          prompt: lastPrompt,
          aspectRatio: '4:5',
          model: lastModel,
          style: lastArtStyle || undefined,
          styleId: customStyleId,
          backgroundColor,
          designId: currentDesignId || undefined, // Pass designId to update existing design when retrying
        };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.imageUrl) {
        // Always replace the current iteration when retrying
        replaceCurrentIteration(data.imageUrl);
        // If updating an existing design (index 0), design ID stays the same
        // Otherwise store design ID from response if new design was created
        if (data.design?.id && historyIndex !== 0) {
          setCurrentDesignId(data.design.id);
        }
      }
    } catch (err) {
      console.error('Retry failed:', err);
      toast.error('Retry failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!generatedImage) return;

    setShowSettings(false); // Close settings when clicking remove background
    setLoading(true);
    try {
      const response = await fetch('/api/designs/remove-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: generatedImage,
        }),
      });

      const data = await response.json();
      if (data.imageUrl) {
        applyNewImage(data.imageUrl);
      }
    } catch (error) {
      console.error('Error removing background:', error);
      toast.error('Failed to remove background');
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareForPrint = async (knockoutType: 'black' | 'white' | 'auto' = 'auto') => {
    if (!generatedImage) return;

    setLoading(true);
    try {
      const response = await fetch('/api/designs/prepare-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: generatedImage,
          knockoutType,
        }),
      });

      const data = await response.json();
      if (data.imageUrl) {
        applyNewImage(data.imageUrl);
      }
    } catch (error) {
      console.error('Error preparing for print:', error);
      toast.error('Failed to prepare design for printing');
    } finally {
      setLoading(false);
    }
  };

  const handleKnockoutBackgroundColor = async () => {
    if (!generatedImage) return;
    setShowSettings(false); // Close settings when clicking knockout
    setLoading(true);
    try {
      const response = await fetch('/api/designs/knockout-color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: generatedImage, backgroundHex: backgroundColor, tolerance: 14 }),
      });
      const data = await response.json();
      if (data.imageUrl) {
        applyNewImage(data.imageUrl);
      }
    } catch (error) {
      console.error('Error knocking out background color:', error);
      toast.error('Failed to knock out background color');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewMockup = async () => {
    if (!generatedImage) return;
    setShowSettings(false); // Close settings when clicking preview
    setPreviewLoading(true);
    setMockupLoading(true);
    setPreviewImageUrl(null);
    try {
      const response = await fetch('/api/designs/mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: generatedImage, aspectRatio: '4:5', tShirtColor: backgroundColor }),
      });
      const data = await response.json();
      if (data.imageUrl) {
        setPreviewImageUrl(data.imageUrl);
        setShowPreviewModal(true);
      } else {
        throw new Error('No imageUrl returned');
      }
    } catch (err) {
      console.error('Mockup preview failed:', err);
      toast.error('Failed to generate preview mockup');
    } finally {
      setPreviewLoading(false);
      setMockupLoading(false);
    }
  };

  const applyNewImage = (url: string, variationId: string | null = null) => {
    setGeneratedImage(url);
    setImageHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(url);
      return next;
    });
    setIterationIds((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(variationId); // null for locally created iterations
      return next;
    });
    setHistoryIndex((idx) => idx + 1);
  };

  const replaceCurrentIteration = (url: string) => {
    setGeneratedImage(url);
    setImageHistory((prev) => {
      const newHistory = [...prev];
      if (historyIndex >= 0 && historyIndex < newHistory.length) {
        newHistory[historyIndex] = url;
      }
      return newHistory;
    });
    // Keep the same iteration ID - we're replacing, not creating new
  };

  const confirmStartOver = () => {
    setGeneratedImage(null);
    setPrompt('');
    setStyleImage(null);
    setImageHistory([]);
    setIterationIds([]);
    setHistoryIndex(-1);
    setCurrentDesignId(null);
    setCurrentIterationId(null);
    setTextLayers([]);
    setActiveTextId(null);
    setEditingTextId(null);
    setHoveredTextId(null);
    setShowStartOverDialog(false);

    // Remove design ID from URL if present
    if (searchParams?.get('design')) {
      router.push('/editor');
    }
  };

  const handleDeleteIteration = async () => {
    // Check if we're trying to delete an iteration (historyIndex > 0 means it's a variation)
    if (historyIndex <= 0) {
      // Can't delete the main design image, this should trigger delete design instead
      setShowDeleteDialog(false);
      return;
    }
    setShowSettings(false); // Close settings when clicking delete iteration

    if (!currentDesignId) {
      // If no design ID, just remove from local history (unsaved work)
      if (imageHistory.length <= 1) {
        confirmStartOver();
        setShowDeleteDialog(false);
        return;
      }

      const newHistory = [...imageHistory];
      const newIds = [...iterationIds];
      newHistory.splice(historyIndex, 1);
      newIds.splice(historyIndex, 1);
      setImageHistory(newHistory);
      setIterationIds(newIds);

      if (historyIndex >= newHistory.length) {
        setHistoryIndex(newHistory.length - 1);
        setGeneratedImage(newHistory[newHistory.length - 1]);
      } else {
        setGeneratedImage(newHistory[historyIndex]);
      }
      setShowDeleteDialog(false);
      return;
    }

    // If we have a design ID but no iteration ID, it means this iteration was never saved
    // Just remove it from local state
    if (!currentIterationId) {
      if (imageHistory.length <= 1) {
        confirmStartOver();
        setShowDeleteDialog(false);
        return;
      }

      const newHistory = [...imageHistory];
      const newIds = [...iterationIds];
      newHistory.splice(historyIndex, 1);
      newIds.splice(historyIndex, 1);
      setImageHistory(newHistory);
      setIterationIds(newIds);

      if (historyIndex >= newHistory.length) {
        setHistoryIndex(newHistory.length - 1);
        setGeneratedImage(newHistory[newHistory.length - 1]);
      } else {
        setGeneratedImage(newHistory[historyIndex]);
      }
      setShowDeleteDialog(false);
      return;
    }

    // Delete from database
    try {
      console.log('Deleting iteration:', { designId: currentDesignId, variationId: currentIterationId, historyIndex });

      const response = await fetch('/api/designs/delete-iteration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId: currentDesignId, variationId: currentIterationId }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Delete iteration API error:', responseData);
        toast.error(`Failed to delete iteration: ${responseData?.error || 'Unknown error'}`);
        throw new Error(responseData?.error || 'Failed to delete iteration');
      }

      console.log('Iteration deleted successfully from database');

      // Update local state immediately without reloading from database
      const newHistory = [...imageHistory];
      const newIds = [...iterationIds];
      newHistory.splice(historyIndex, 1);
      newIds.splice(historyIndex, 1);

      setImageHistory(newHistory);
      setIterationIds(newIds);

      // Adjust history index and displayed image
      if (historyIndex >= newHistory.length) {
        setHistoryIndex(newHistory.length - 1);
        setGeneratedImage(newHistory[newHistory.length - 1]);
      } else {
        setGeneratedImage(newHistory[historyIndex]);
      }

      setCurrentIterationId(null);
      setShowDeleteDialog(false);
    } catch (error: any) {
      console.error('Error deleting iteration:', error);
      toast.error(error?.message || 'Failed to delete iteration');
    }
  };


  const handleDeleteDesign = async () => {
    if (!currentDesignId) {
      confirmStartOver();
      setShowDeleteDialog(false);
      return;
    }

    try {
      const response = await fetch('/api/designs/delete-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId: currentDesignId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Failed to delete design');
      }

      // Clear everything
      confirmStartOver();
      setShowDeleteDialog(false);
      setShowDeleteDesignConfirm(false);

      // Redirect to designs page if we're viewing a design
      if (searchParams?.get('design')) {
        window.location.href = '/designs';
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete design');
    }
  };

  // Track if thumbnail column exists to avoid repeated failed requests
  const [thumbnailColumnExists, setThumbnailColumnExists] = useState<boolean | null>(null);

  // Update design thumbnail when history index changes
  useEffect(() => {
    async function updateDesignThumbnail() {
      if (!currentDesignId || historyIndex < 0 || imageHistory.length === 0) return;

      // Skip if we know the column doesn't exist
      if (thumbnailColumnExists === false) return;

      const thumbnailUrl = imageHistory[historyIndex];
      if (!thumbnailUrl) return;

      try {
        console.log('Updating thumbnail:', { designId: currentDesignId, historyIndex, thumbnailUrl });

        // Use API route instead of direct Supabase client
        const response = await fetch('/api/designs/update-thumbnail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            designId: currentDesignId,
            thumbnailUrl: thumbnailUrl
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Thumbnail update error:', errorData);

          // Check if it's a missing column error
          if (errorData.error?.includes('column') ||
            errorData.error?.includes('does not exist') ||
            errorData.error?.includes('thumbnail_image_url')) {
            // Column doesn't exist - mark as non-existent and skip future attempts
            setThumbnailColumnExists(false);
            return;
          }
          // Log other errors but don't stop future updates
          console.warn('Thumbnail update error (non-critical):', errorData.error);
        } else {
          // Success - column exists
          console.log('Thumbnail updated successfully');
          if (thumbnailColumnExists === null) {
            setThumbnailColumnExists(true);
          }
        }
      } catch (error: any) {
        console.error('Thumbnail update exception:', error);
        // Check if it's a missing column error
        if (error?.message?.includes('column') ||
          error?.message?.includes('does not exist')) {
          setThumbnailColumnExists(false);
          return;
        }
        // Ignore other errors
      }
    }

    // Only update if mounted and we have a valid design ID
    if (mounted && currentDesignId && thumbnailColumnExists !== false) {
      // Debounce updates to avoid too many database calls
      const timeoutId = setTimeout(() => {
        updateDesignThumbnail();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyIndex, currentDesignId, imageHistory, mounted, thumbnailColumnExists]);

  const canGoPrev = historyIndex > 0;
  const canGoNext = historyIndex >= 0 && historyIndex < imageHistory.length - 1;
  const goPrev = () => {
    if (!canGoPrev) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setGeneratedImage(imageHistory[newIndex]);
  };
  const goNext = () => {
    if (!canGoNext) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setGeneratedImage(imageHistory[newIndex]);
  };

  // Download current image as PNG (preserve alpha when available)
  const downloadCurrentAsPng = async () => {
    if (!generatedImage) return;
    const filename = `design-${Date.now()}.png`;
    try {
      if (generatedImage.startsWith('data:image/png')) {
        const a = document.createElement('a');
        a.href = generatedImage;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      const blobUrl: string = await new Promise((resolve, reject) => {
        img.onload = () => {
          const exportWidth = img.naturalWidth || img.width;
          const exportHeight = img.naturalHeight || img.height;
          const canvas = document.createElement('canvas');
          canvas.width = exportWidth;
          canvas.height = exportHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas not supported'));
            return;
          }
          ctx.drawImage(img, 0, 0, exportWidth, exportHeight);

          textLayers.forEach((layer) => {
            const layerCanvas = createLayerCanvas(layer, exportWidth, exportHeight);
            if (!layerCanvas) return;
            const layerWidthPx = layerCanvas.width;
            const layerHeightPx = layerCanvas.height;
            const originX = layer.x * exportWidth;
            const originY = layer.y * exportHeight;

            ctx.save();
            ctx.translate(originX + layerWidthPx / 2, originY + layerHeightPx / 2);
            ctx.rotate((layer.rotation * Math.PI) / 180);
            ctx.drawImage(layerCanvas, -layerWidthPx / 2, -layerHeightPx / 2, layerWidthPx, layerHeightPx);
            ctx.restore();
          });

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to create PNG'));
              return;
            }
            resolve(URL.createObjectURL(blob));
          }, 'image/png');
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = generatedImage;
      });
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      const a = document.createElement('a');
      a.href = generatedImage;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <div className={`${embedded ? 'min-h-screen' : 'fixed inset-0 md:left-60'} bg-[#f5f5f7] flex flex-col`} style={{ overflow: 'hidden' }}>
      {/* Main Content Area - Wrapper */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Editor - Header + Canvas + Footer */}
        <div className="flex-1 min-h-0 flex flex-col md:mr-64" style={{ transition: 'margin-right 200ms ease-out' }}>
          {/* Editor Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              {/* Hamburger button - show on mobile when menu context is available */}
              {mobileMenu && (
                <button
                  onClick={() => mobileMenu.openMenu()}
                  className="md:hidden inline-flex items-center justify-center px-2 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="Open menu"
                  title="Menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4" fill="currentColor">
                    <path d="M96 160C96 142.3 110.3 128 128 128L512 128C529.7 128 544 142.3 544 160C544 177.7 529.7 192 512 192L128 192C110.3 192 96 177.7 96 160zM96 320C96 302.3 110.3 288 128 288L512 288C529.7 288 544 302.3 544 320C544 337.7 529.7 352 512 352L128 352C110.3 352 96 337.7 96 320zM544 480C544 497.7 529.7 512 512 512L128 512C110.3 512 96 497.7 96 480C96 462.3 110.3 448 128 448L512 448C529.7 448 544 462.3 544 480z" />
                  </svg>
                </button>
              )}
              {generatedImage && (
                <button
                  onClick={() => setShowStartOverDialog(true)}
                  disabled={loading}
                  className="inline-flex items-center justify-center px-2 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Start Over"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4" fill="currentColor">
                    <path d="M88 256L232 256C241.7 256 250.5 250.2 254.2 241.2C257.9 232.2 255.9 221.9 249 215L202.3 168.3C277.6 109.7 386.6 115 455.8 184.2C530.8 259.2 530.8 380.7 455.8 455.7C380.8 530.7 259.3 530.7 184.3 455.7C174.1 445.5 165.3 434.4 157.9 422.7C148.4 407.8 128.6 403.4 113.7 412.9C98.8 422.4 94.4 442.2 103.9 457.1C113.7 472.7 125.4 487.5 139 501C239 601 401 601 501 501C601 401 601 239 501 139C406.8 44.7 257.3 39.3 156.7 122.8L105 71C98.1 64.2 87.8 62.1 78.8 65.8C69.8 69.5 64 78.3 64 88L64 232C64 245.3 74.7 256 88 256z" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              {generatedImage && (
                <>
                  <button
                    onClick={downloadCurrentAsPng}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                    title="Download"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4" fill="currentColor">
                      <path d="M352 96C352 78.3 337.7 64 320 64C302.3 64 288 78.3 288 96L288 306.7L246.6 265.3C234.1 252.8 213.8 252.8 201.3 265.3C188.8 277.8 188.8 298.1 201.3 310.6L297.3 406.6C309.8 419.1 330.1 419.1 342.6 406.6L438.6 310.6C451.1 298.1 451.1 277.8 438.6 265.3C426.1 252.8 405.8 252.8 393.3 265.3L352 306.7L352 96zM160 384C124.7 384 96 412.7 96 448L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 448C544 412.7 515.3 384 480 384L433.1 384L376.5 440.6C345.3 471.8 294.6 471.8 263.4 440.6L206.9 384L160 384zM464 440C477.3 440 488 450.7 488 464C488 477.3 477.3 488 464 488C450.7 488 440 477.3 440 464C440 450.7 450.7 440 464 440z" />
                    </svg>
                    <span className="hidden sm:inline">Download</span>
                  </button>
                  <button
                    onClick={() => setShowOrderDrawer(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-[#7c3aed] text-white rounded-lg hover:bg-[#6d28d9] transition-colors"
                    title="Order"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4" fill="currentColor">
                      <path d="M24 48C10.7 48 0 58.7 0 72C0 85.3 10.7 96 24 96L69.3 96C73.2 96 76.5 98.8 77.2 102.6L129.3 388.9C135.5 423.1 165.3 448 200.1 448L456 448C469.3 448 480 437.3 480 424C480 410.7 469.3 400 456 400L200.1 400C188.5 400 178.6 391.7 176.5 380.3L171.4 352L475 352C505.8 352 532.2 330.1 537.9 299.8L568.9 133.9C572.6 114.2 557.5 96 537.4 96L124.7 96L124.3 94C119.5 67.4 96.3 48 69.2 48L24 48zM208 576C234.5 576 256 554.5 256 528C256 501.5 234.5 480 208 480C181.5 480 160 501.5 160 528C160 554.5 181.5 576 208 576zM432 576C458.5 576 480 554.5 480 528C480 501.5 458.5 480 432 480C405.5 480 384 501.5 384 528C384 554.5 405.5 576 432 576z" />
                    </svg>
                    <span className="hidden sm:inline">Order</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Editor Canvas - Centered within left editor */}
          <div className="flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 overflow-auto">
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center">
              {/* Iteration Controls - Above Canvas */}
              {generatedImage && (
                <div className="flex items-center justify-center gap-3 mb-4">
                  <button
                    onClick={goPrev}
                    disabled={!canGoPrev || loading}
                    className="px-2 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                    title="Previous"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4">
                      <path d="M41.4 342.6C28.9 330.1 28.9 309.8 41.4 297.3L169.4 169.3C178.6 160.1 192.3 157.4 204.3 162.4C216.3 167.4 224 179.1 224 192L224 256L560 256C586.5 256 608 277.5 608 304L608 336C608 362.5 586.5 384 560 384L224 384L224 448C224 460.9 216.2 472.6 204.2 477.6C192.2 482.6 178.5 479.8 169.3 470.7L41.3 342.7z" />
                    </svg>
                  </button>
                  <span className="text-xs md:text-sm text-gray-600 min-w-[60px] md:min-w-[72px] text-center">
                    {historyIndex >= 0 ? `${historyIndex + 1} / ${imageHistory.length}` : '0 / 0'}
                  </span>
                  <button
                    onClick={goNext}
                    disabled={!canGoNext || loading}
                    className="px-2 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                    title="Next"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4">
                      <path d="M598.6 297.4C611.1 309.9 611.1 330.2 598.6 342.7L470.6 470.7C461.4 479.9 447.7 482.6 435.7 477.6C423.7 472.6 416 460.9 416 448L416 384L80 384C53.5 384 32 362.5 32 336L32 304C32 277.5 53.5 256 80 256L416 256L416 192C416 179.1 423.8 167.4 435.8 162.4C447.8 157.4 461.5 160.2 470.7 169.3L598.7 297.3z" />
                    </svg>
                  </button>
                </div>
              )}
              {/* Canvas */}
              <div
                ref={canvasRef}
                className={`relative border-2 rounded-2xl shadow-sm transition-all ${isDragging ? 'border-[#1d1d1f] border-dashed bg-gray-50' :
                  hotspotMode ? 'border-[#7c3aed] cursor-crosshair' :
                    'border-gray-200'
                  } ${!generatedImage && !hotspotMode ? 'cursor-pointer hover:border-gray-300' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleCanvasClick}
                onPointerDown={handleCanvasPointerDown}
                style={{
                  width: 'min(calc((100vh - 280px) * 4 / 5), 700px, 100%)',
                  aspectRatio: '4 / 5',
                  backgroundColor: backgroundColor,
                  maxWidth: '100%',
                }}
              >
                <input
                  ref={canvasFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCanvasFileSelect}
                  className="hidden"
                />
                {generatedImage ? (
                  <>
                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                      <Image
                        src={generatedImage}
                        alt="Generated design"
                        fill
                        className="object-cover"
                      />
                    </div>
                    {/* Hotspot indicator */}
                    {hotspot && !hotspotMode && (
                      <HotspotIndicator hotspot={hotspot} imageUrl={generatedImage} containerRef={canvasRef} />
                    )}
                    {(loading || mockupLoading) && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                        <svg
                          className="animate-spin h-8 w-8 text-[#1d1d1f]"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      </div>
                    )}
                  </>
                ) : loading || loadingDesign ? (
                  <div className="flex items-center justify-center h-full">
                    <svg
                      className="animate-spin h-8 w-8 text-[#1d1d1f]"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center px-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto mb-4 opacity-50">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <p className="text-lg font-light">Drop an image here or click to upload</p>
                      <p className="text-sm mt-2">Or enter a prompt below to generate</p>
                    </div>
                  </div>
                )}

                {/* Snap Guide Lines */}
                {(snapGuides.horizontal || snapGuides.vertical) && canvasSize.width > 0 && canvasSize.height > 0 && (
                  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
                    {snapGuides.horizontal && (
                      <div
                        className="absolute w-full border-t-2 border-dashed border-[#7c3aed]"
                        style={{
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                      />
                    )}
                    {snapGuides.vertical && (
                      <div
                        className="absolute h-full border-l-2 border-dashed border-[#7c3aed]"
                        style={{
                          left: '50%',
                          transform: 'translateX(-50%)',
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Text Layers */}
                {canvasSize.width > 0 && canvasSize.height > 0 && (
                  <>
                    {textLayers.map((layer) => {
                      const widthPx = layer.width * canvasSize.width;
                      const heightPx = layer.height * canvasSize.height;
                      const xPx = layer.x * canvasSize.width;
                      const yPx = layer.y * canvasSize.height;
                      const rotationDeg = layer.rotation;
                      const isActive = layer.id === activeTextId;
                      const isEditing = layer.id === editingTextId;
                      const isHover = hoveredTextId === layer.id;
                      // Always show selection when active (like Kittl/Figma), not just on hover
                      const selectionVisible = isActive || isEditing;
                      const hasMultiline = layer.text.includes('\n');
                      // Show canvas if curved text OR if any advanced features are enabled
                      const hasAdvancedFeatures = 
                        layer.strokeEnabled ||
                        layer.shadowEnabled ||
                        layer.extrudeEnabled ||
                        (layer.fillType && layer.fillType !== 'solid') ||
                        (layer.warp?.type && layer.warp.type !== 'none' && layer.warp.type !== 'arch') ||
                        (layer.blendMode && layer.blendMode !== 'source-over');
                      const isCurved = Math.abs(layer.curve) >= CURVE_THRESHOLD && !hasMultiline;
                      const showCurvedCanvas = (isCurved || hasAdvancedFeatures) && fontsReady;
                      const textOpacity = showCurvedCanvas && isEditing ? 0.2 : showCurvedCanvas ? 0 : 1;

                      // Calculate tight bounding box for curved text (like Kittl)
                      const tightBounds = showCurvedCanvas && selectionVisible
                        ? calculateCurvedTextBounds(layer, canvasSize.width, canvasSize.height)
                        : null;

                      // Use tight bounds if available, otherwise use full layer bounds
                      const selectionWidth = tightBounds ? tightBounds.width : widthPx;
                      const selectionHeight = tightBounds ? tightBounds.height : heightPx;
                      const selectionOffsetX = tightBounds ? tightBounds.minX : 0;
                      const selectionOffsetY = tightBounds ? tightBounds.minY : 0;

                      return (
                        <div
                          key={layer.id}
                          className="absolute"
                          style={{
                            left: xPx,
                            top: yPx,
                            width: widthPx,
                            height: heightPx,
                            zIndex: isEditing ? 20 : isActive ? 18 : 16,
                          }}
                          onPointerDown={(event) => startMoveSession(layer.id, event)}
                          onPointerEnter={() => setHoveredTextId(layer.id)}
                          onPointerLeave={() => setHoveredTextId((prev) => (prev === layer.id ? null : prev))}
                        >
                          <div
                            ref={(el) => {
                              if (!el) {
                                delete textWrapperRefs.current[layer.id];
                              } else {
                                textWrapperRefs.current[layer.id] = el;
                              }
                            }}
                            className="absolute inset-0"
                          >
                            {selectionVisible && (
                              <div
                                className="absolute"
                                style={{
                                  pointerEvents: 'none',
                                  left: `${selectionOffsetX}px`,
                                  top: `${selectionOffsetY}px`,
                                  width: `${selectionWidth}px`,
                                  height: `${selectionHeight}px`,
                                }}
                              >
                                {/* Figma-style selection box with smoother styling - tight bounds for curved text */}
                                <div
                                  className="absolute inset-0 border-2 transition-all duration-150 ease-out"
                                  style={{
                                    borderColor: isEditing ? '#7c3aed' : 'rgba(124,58,237,0.6)',
                                    borderRadius: 4,
                                    boxShadow: isEditing
                                      ? '0 0 0 2px rgba(124,58,237,0.1), 0 4px 12px rgba(0,0,0,0.1)'
                                      : '0 0 0 1px rgba(124,58,237,0.2)',
                                  }}
                                />
                                {/* Corner handles - larger and more visible like Figma */}
                                {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((corner) => {
                                  const positionClasses = {
                                    'top-left': '-left-2.5 -top-2.5 cursor-nwse-resize',
                                    'top-right': '-right-2.5 -top-2.5 cursor-nesw-resize',
                                    'bottom-left': '-left-2.5 -bottom-2.5 cursor-nesw-resize',
                                    'bottom-right': '-right-2.5 -bottom-2.5 cursor-nwse-resize',
                                  } as const;

                                  return (
                                    <div
                                      key={corner}
                                      className={`absolute w-4 h-4 bg-white border-2 border-[#7c3aed] rounded transition-all duration-150 ease-out shadow-md hover:scale-110 pointer-events-auto ${positionClasses[corner]}`}
                                      style={{
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                      }}
                                      onPointerDown={(event) => {
                                        event.stopPropagation();
                                        startResizeSession(layer.id, corner, event);
                                      }}
                                      onPointerEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)';
                                      }}
                                      onPointerLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                                      }}
                                    />
                                  );
                                })}
                                {/* Rotate handle - improved styling */}
                                <div
                                  className="absolute -top-8 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-[#7c3aed] bg-white shadow-md cursor-grab pointer-events-auto transition-all duration-150 ease-out hover:scale-110"
                                  style={{
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                  }}
                                  onPointerDown={(event) => {
                                    event.stopPropagation();
                                    startRotateSession(layer.id, event);
                                  }}
                                  onPointerEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.transform = 'translateX(-50%) scale(1.15)';
                                  }}
                                  onPointerLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.transform = 'translateX(-50%) scale(1)';
                                  }}
                                />
                              </div>
                            )}

                            {showCurvedCanvas && (
                              <canvas
                                ref={(el) => {
                                  if (!el) {
                                    delete textCanvasRefs.current[layer.id];
                                  } else {
                                    textCanvasRefs.current[layer.id] = el;
                                  }
                                }}
                                className="absolute inset-0"
                                style={{
                                  transform: `rotate(${rotationDeg}deg)`,
                                  transformOrigin: '50% 50%',
                                  pointerEvents: 'none',
                                }}
                              />
                            )}

                            <div
                              ref={(el) => {
                                if (!el) {
                                  delete textElementRefs.current[layer.id];
                                } else {
                                  textElementRefs.current[layer.id] = el;
                                }
                              }}
                              className="absolute inset-0 px-3 py-2"
                              contentEditable={isEditing}
                              suppressContentEditableWarning
                              onInput={(event) => {
                                const value = event.currentTarget.innerText.replace(/\u00a0/g, ' ');
                                updateTextLayer(layer.id, { text: value });
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  setEditingTextId(null);
                                }
                              }}
                              onPointerDown={(event) => {
                                if (isEditing) {
                                  event.stopPropagation();
                                }
                              }}
                              style={{
                                transform: `rotate(${rotationDeg}deg)`,
                                transformOrigin: '50% 50%',
                                fontFamily: getFontStack(layer.fontFamily),
                                fontWeight: layer.fontWeight,
                                fontStyle: layer.fontStyle,
                                textDecoration: layer.underline ? 'underline' : 'none',
                                textAlign: layer.textAlign,
                                fontSize: `${layer.fontSize * (canvasSize.height || 1)}px`,
                                color: layer.color,
                                letterSpacing: `${layer.letterSpacing * (canvasSize.width || 1)}px`,
                                lineHeight: 1.2,
                                whiteSpace: 'pre-wrap',
                                cursor: isEditing ? 'text' : 'move',
                                userSelect: isEditing ? 'text' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent:
                                  layer.textAlign === 'left'
                                    ? 'flex-start'
                                    : layer.textAlign === 'right'
                                      ? 'flex-end'
                                      : 'center',
                                opacity: textOpacity,
                                transition: 'opacity 120ms ease-in-out',
                                pointerEvents: isEditing ? 'auto' : 'none',
                              }}
                            >
                              {layer.text || ' '}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Editor Footer - Bottom toolbar and prompt area */}
          <div className="flex-shrink-0 backdrop-blur-xl z-[60] md:z-auto">
            <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
              {/* Selectors */}
              {showSettings && (
                <>
                  {/* Invisible backdrop - click outside to close */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSettings(false)}
                  />
                  <div className="absolute left-0 right-0 -top-[70px] px-2 sm:px-4 pt-2 pb-2 z-20" onClick={(e) => e.stopPropagation()}>
                    <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-xl p-2 sm:p-3">
                      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Select.Root items={models} value={selectedModel} onValueChange={(value) => {
                            setSelectedModel(value as string);
                            setSelectedStyle(''); // Clear style when switching models
                          }}>
                            <div className="relative inline-block">
                              <Select.Trigger
                                disabled={loading}
                                className="inline-flex items-center gap-2 px-3 py-1.5 pr-8 bg-white text-sm text-[#1d1d1f] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/20 focus:border-[#1d1d1f]/30 transition-all hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                              >
                                <Select.Value />
                              </Select.Trigger>
                              <Select.Icon className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                              </Select.Icon>
                            </div>
                            <Select.Portal>
                              <Select.Positioner side="top" align="start" alignItemWithTrigger={false} sideOffset={8}>
                                <Select.Popup className="bg-white border border-gray-200 rounded-lg shadow-lg py-2 max-h-60 overflow-auto min-w-[180px]">
                                  <Select.List className="divide-y divide-gray-100">
                                    {models.map((model, index) => (
                                      <Select.Item
                                        key={`model-${index}`}
                                        value={model.value}
                                        className="relative px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                      >
                                        <Select.ItemIndicator className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1d1d1f]">
                                          <svg fill="currentcolor" width="10" height="10" viewBox="0 0 10 10">
                                            <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
                                          </svg>
                                        </Select.ItemIndicator>
                                        <Select.ItemText className="ml-6">{model.label}</Select.ItemText>
                                      </Select.Item>
                                    ))}
                                  </Select.List>
                                </Select.Popup>
                              </Select.Positioner>
                            </Select.Portal>
                          </Select.Root>

                          {/* Style Selector - Only show when no image is generated yet */}
                          {!generatedImage && (
                            <Select.Root items={selectedModel === 'recraft-v3' ? recraftStyles : geminiStyles} value={selectedStyle} onValueChange={(value) => setSelectedStyle(value as string)}>
                              <div className="relative inline-block">
                                <Select.Trigger
                                  disabled={loading}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 pr-8 bg-white text-sm text-[#1d1d1f] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/20 focus:border-[#1d1d1f]/30 transition-all hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                                >
                                  <Select.Value />
                                </Select.Trigger>
                                <Select.Icon className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                  </svg>
                                </Select.Icon>
                              </div>
                              <Select.Portal>
                                <Select.Positioner side="top" align="start" alignItemWithTrigger={false} sideOffset={8}>
                                  <Select.Popup className="bg-white border border-gray-200 rounded-lg shadow-lg py-2 max-h-60 overflow-auto min-w-[200px]">
                                    <Select.List className="divide-y divide-gray-100">
                                      {(selectedModel === 'recraft-v3' ? recraftStyles : geminiStyles).map((style, index) => (
                                        <Select.Item
                                          key={`${selectedModel}-style-${index}`}
                                          value={style.value}
                                          className="relative px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                        >
                                          <Select.ItemIndicator className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1d1d1f]">
                                            <svg fill="currentcolor" width="10" height="10" viewBox="0 0 10 10">
                                              <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
                                            </svg>
                                          </Select.ItemIndicator>
                                          <Select.ItemText className="ml-6">{style.label}</Select.ItemText>
                                        </Select.Item>
                                      ))}
                                    </Select.List>
                                  </Select.Popup>
                                </Select.Positioner>
                              </Select.Portal>
                            </Select.Root>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Prompt Box */}
              <div className="p-2 sm:p-4 pt-2">
                <div className="max-w-2xl mx-auto">
                  <div className="relative">
                    {!showSettings && (<p className="absolute -top-[20px] left-0 text-xs text-gray-500 mb-2 hidden sm:block">{selectedModel} {selectedStyle ? `- ${selectedStyle}` : ''}</p>)}
                    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 bg-white border-2 border-gray-200 rounded-xl focus-within:border-[#1d1d1f] transition-colors shadow-sm">
                      {/* Settings Toggle (left of +) */}
                      <button
                        onClick={() => setShowSettings((v) => !v)}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                        title={showSettings ? 'Hide settings' : 'Show settings'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5"><path d="M96 128C78.3 128 64 142.3 64 160C64 177.7 78.3 192 96 192L182.7 192C195 220.3 223.2 240 256 240C288.8 240 317 220.3 329.3 192L544 192C561.7 192 576 177.7 576 160C576 142.3 561.7 128 544 128L329.3 128C317 99.7 288.8 80 256 80C223.2 80 195 99.7 182.7 128L96 128zM96 288C78.3 288 64 302.3 64 320C64 337.7 78.3 352 96 352L342.7 352C355 380.3 383.2 400 416 400C448.8 400 477 380.3 489.3 352L544 352C561.7 352 576 337.7 576 320C576 302.3 561.7 288 544 288L489.3 288C477 259.7 448.8 240 416 240C383.2 240 355 259.7 342.7 288L96 288zM96 448C78.3 448 64 462.3 64 480C64 497.7 78.3 512 96 512L150.7 512C163 540.3 191.2 560 224 560C256.8 560 285 540.3 297.3 512L544 512C561.7 512 576 497.7 576 480C576 462.3 561.7 448 544 448L297.3 448C285 419.7 256.8 400 224 400C191.2 400 163 419.7 150.7 448L96 448z" /></svg>
                      </button>

                      {/* Style Image Upload Button */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                        title={selectedModel === 'recraft-v3' ? "Attach images to create a custom style" : "Attach style reference image"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                          <path d="M352 128C352 110.3 337.7 96 320 96C302.3 96 288 110.3 288 128L288 288L128 288C110.3 288 96 302.3 96 320C96 337.7 110.3 352 128 352L288 352L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 352L512 352C529.7 352 544 337.7 544 320C544 302.3 529.7 288 512 288L352 288L352 128z" />
                        </svg>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple={selectedModel === 'recraft-v3'}
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      {/* Prompt Input */}
                      <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (generatedImage) {
                              if (hotspotMode) {
                                // If hotspot mode is active, user needs to click on image first
                                return;
                              }
                              handleEdit();
                            } else {
                              handleGenerate();
                            }
                          }
                        }}
                        placeholder={generatedImage ? "Edit your design..." : "Describe your design..."}
                        className="flex-1 outline-none bg-white text-sm sm:text-base text-[#1d1d1f] placeholder:text-gray-400 autofill:bg-white autofill:text-[#1d1d1f]"
                        style={{ backgroundColor: 'white', color: '#1d1d1f' }}
                        disabled={loading}
                      />

                      {/* Reference Image Preview */}
                      {styleImage && (
                        <div className="relative flex-shrink-0">
                          <img
                            src={styleImage}
                            alt="Reference"
                            className="w-8 h-8 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            onClick={() => setStyleImage(null)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                            title="Remove reference image"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        onClick={() => {
                          if (generatedImage) {
                            if (hotspotMode) {
                              // If hotspot mode is active, user needs to click on image first
                              return;
                            }
                            handleEdit();
                          } else {
                            handleGenerate();
                          }
                        }}
                        disabled={loading || !prompt.trim() || !!(generatedImage && hotspotMode)}
                        className="flex-shrink-0 p-2 rounded-lg bg-gradient-to-r from-[#1d1d1f] to-[#2d2d2f] text-white hover:from-[#2d2d2f] hover:to-[#3d3d3f] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        title={generatedImage && hotspotMode ? "Click on image to select area" : generatedImage ? "Apply Edit" : "Generate design"}
                      >
                        {loading ? (
                          <svg
                            className="animate-spin h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 text-white" fill="currentColor">
                            <path d="M568.4 37.7C578.2 34.2 589 36.7 596.4 44C603.8 51.3 606.2 62.2 602.7 72L424.7 568.9C419.7 582.8 406.6 592 391.9 592C377.7 592 364.9 583.4 359.6 570.3L295.4 412.3C290.9 401.3 292.9 388.7 300.6 379.7L395.1 267.3C400.2 261.2 399.8 252.3 394.2 246.7C388.6 241.1 379.6 240.7 373.6 245.8L261.2 340.1C252.1 347.7 239.6 349.7 228.6 345.3L70.1 280.8C57 275.5 48.4 262.7 48.4 248.5C48.4 233.8 57.6 220.7 71.5 215.7L568.4 37.7z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Style Image Preview Below Input */}
                    {styleImage && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <span>Style reference attached</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="px-2 sm:px-4 pb-2 sm:pb-4">
                <Tooltip.Provider>
                  <div className="flex items-center justify-center relative">
                    <div className="inline-flex items-stretch bg-white border border-gray-200 rounded-lg overflow-hidden divide-x divide-gray-200 overflow-x-auto max-w-2xl mx-auto">
                      {/* Retry/Try Again Button (1st) - Available on all iterations */}
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <button
                            onClick={handleRetry}
                            disabled={loading || !lastMode || !generatedImage}
                            className="px-2 sm:px-3 py-2 text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                              <path d="M552 256L408 256C398.3 256 389.5 250.2 385.8 241.2C382.1 232.2 384.1 221.9 391 215L437.7 168.3C362.4 109.7 253.4 115 184.2 184.2C109.2 259.2 109.2 380.7 184.2 455.7C259.2 530.7 380.7 530.7 455.7 455.7C463.9 447.5 471.2 438.8 477.6 429.6C487.7 415.1 507.7 411.6 522.2 421.7C536.7 431.8 540.2 451.8 530.1 466.3C521.6 478.5 511.9 490.1 501 501C401 601 238.9 601 139 501C39.1 401 39 239 139 139C233.3 44.7 382.7 39.4 483.3 122.8L535 71C541.9 64.1 552.2 62.1 561.2 65.8C570.2 69.5 576 78.3 576 88L576 232C576 245.3 565.3 256 552 256z" />
                            </svg>
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Positioner>
                            <Tooltip.Popup className="bg-[#1d1d1f] text-white text-sm px-3 py-1.5 rounded-lg">
                              Try Again
                            </Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>

                      {/* Crosshairs Button (2nd) */}
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <button
                            onClick={() => {
                              setShowSettings(false); // Close settings when clicking crosshair
                              if (hotspotMode) {
                                setHotspotMode(false);
                              } else {
                                setHotspotMode(true);
                                setHotspot(null);
                              }
                            }}
                            disabled={loading || !generatedImage}
                            className={`px-2 sm:px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${hotspotMode
                              ? 'text-[#7c3aed] bg-[#7c3aed]/10 hover:bg-[#7c3aed]/20'
                              : 'text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100'
                              }`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                              <path d="M320 48C337.7 48 352 62.3 352 80L352 98.3C450.1 112.3 527.7 189.9 541.7 288L560 288C577.7 288 592 302.3 592 320C592 337.7 577.7 352 560 352L541.7 352C527.7 450.1 450.1 527.7 352 541.7L352 560C352 577.7 337.7 592 320 592C302.3 592 288 577.7 288 560L288 541.7C189.9 527.7 112.3 450.1 98.3 352L80 352C62.3 352 48 337.7 48 320C48 302.3 62.3 288 80 288L98.3 288C112.3 189.9 189.9 112.3 288 98.3L288 80C288 62.3 302.3 48 320 48zM163.2 352C175.9 414.7 225.3 464.1 288 476.8L288 464C288 446.3 302.3 432 320 432C337.7 432 352 446.3 352 464L352 476.8C414.7 464.1 464.1 414.7 476.8 352L464 352C446.3 352 432 337.7 432 320C432 302.3 446.3 288 464 288L476.8 288C464.1 225.3 414.7 175.9 352 163.2L352 176C352 193.7 337.7 208 320 208C302.3 208 288 193.7 288 176L288 163.2C225.3 175.9 175.9 225.3 163.2 288L176 288C193.7 288 208 302.3 208 320C208 337.7 193.7 352 176 352L163.2 352zM320 272C346.5 272 368 293.5 368 320C368 346.5 346.5 368 320 368C293.5 368 272 346.5 272 320C272 293.5 293.5 272 320 272z" />
                            </svg>
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Positioner>
                            <Tooltip.Popup className="bg-[#1d1d1f] text-white text-sm px-3 py-1.5 rounded-lg">
                              {hotspotMode ? 'Click on image to select area' : 'Select edit area'}
                            </Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>

                      {/* Add Text Button */}
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <button
                            onClick={() => {
                              addTextLayer();
                            }}
                            disabled={loading || !generatedImage}
                            className="px-2 sm:px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100 flex-shrink-0"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                              <path d="M349.1 114.7C343.9 103.3 332.5 96 320 96C307.5 96 296.1 103.3 290.9 114.7L123.5 480L112 480C94.3 480 80 494.3 80 512C80 529.7 94.3 544 112 544L200 544C217.7 544 232 529.7 232 512C232 494.3 217.7 480 200 480L193.9 480L215.9 432L424.2 432L446.2 480L440.1 480C422.4 480 408.1 494.3 408.1 512C408.1 529.7 422.4 544 440.1 544L528.1 544C545.8 544 560.1 529.7 560.1 512C560.1 494.3 545.8 480 528.1 480L516.6 480L349.2 114.7zM394.8 368L245.2 368L320 204.8L394.8 368z" />
                            </svg>
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Positioner>
                            <Tooltip.Popup className="bg-[#1d1d1f] text-white text-sm px-3 py-1.5 rounded-lg">
                              Add text
                            </Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>

                      <Menu.Root>
                        <Menu.Trigger
                          disabled={loading || !generatedImage}
                          onClick={() => setShowSettings(false)} // Close settings when clicking eraser menu
                          className="px-2 sm:px-3 py-2 text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none flex-shrink-0"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                            <path d="M210.5 480L333.5 480L398.8 414.7L225.3 241.2L98.6 367.9L210.6 479.9zM256 544L210.5 544C193.5 544 177.2 537.3 165.2 525.3L49 409C38.1 398.1 32 383.4 32 368C32 352.6 38.1 337.9 49 327L295 81C305.9 70.1 320.6 64 336 64C351.4 64 366.1 70.1 377 81L559 263C569.9 273.9 576 288.6 576 304C576 319.4 569.9 334.1 559 345L424 480L544 480C561.7 480 576 494.3 576 512C576 529.7 561.7 544 544 544L256 544z" />
                          </svg>
                        </Menu.Trigger>
                        <Menu.Portal>
                          <Menu.Positioner side="top" align="center" sideOffset={8}>
                            <Menu.Popup className="bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[220px]">
                              <Menu.Item
                                onClick={() => handleRemoveBackground()}
                                disabled={loading}
                                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Remove Background
                              </Menu.Item>
                              <Menu.Item
                                onClick={handleKnockoutBackgroundColor}
                                disabled={loading}
                                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Knock Out Background Color
                              </Menu.Item>
                            </Menu.Popup>
                          </Menu.Positioner>
                        </Menu.Portal>
                      </Menu.Root>

                      {/* Upscale Button */}
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <button
                            onClick={async () => {
                              if (!generatedImage) return;
                              setShowSettings(false); // Close settings when clicking upscale
                              setLoading(true);
                              try {
                                const res = await fetch('/api/designs/upscale', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ designId: currentDesignId, imageUrl: generatedImage, upscaleMode: 'factor', upscaleFactor: 2, outputFormat: 'png' }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data?.error || 'Upscale failed');
                                if (data?.imageUrl) {
                                  applyNewImage(data.imageUrl);
                                }
                              } catch (e: any) {
                                toast.error(e?.message || 'Failed to upscale');
                              } finally {
                                setLoading(false);
                              }
                            }}
                            disabled={loading || !generatedImage}
                            className="px-2 sm:px-3 py-2 text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          >
                            {/* Upscale icon (SeedVR2) */}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" width="1em" height="1em">
                              <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5">
                                <path d="M16 3h5v5m-4 13h2a2 2 0 0 0 2-2m0-7v3m0-12l-5 5M3 7V5a2 2 0 0 1 2-2m0 18l4.144-4.144a1.21 1.21 0 0 1 1.712 0L13 19M9 3h3"></path>
                                <rect width="10" height="10" x="3" y="11" rx="1"></rect>
                              </g>
                            </svg>
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Positioner>
                            <Tooltip.Popup className="bg-[#1d1d1f] text-white text-sm px-3 py-1.5 rounded-lg">
                              Upscale 2×
                            </Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>

                      {/* Preview Button */}
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <button
                            onClick={handlePreviewMockup}
                            disabled={loading || mockupLoading || !generatedImage}
                            className="px-2 sm:px-3 py-2 text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            title="Preview on T-Shirt"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                              <path d="M320 96C239.2 96 174.5 132.8 127.4 176.6C80.6 220.1 49.3 272 34.4 307.7C31.1 315.6 31.1 324.4 34.4 332.3C49.3 368 80.6 420 127.4 463.4C174.5 507.1 239.2 544 320 544C400.8 544 465.5 507.2 512.6 463.4C559.4 419.9 590.7 368 605.6 332.3C608.9 324.4 608.9 315.6 605.6 307.7C590.7 272 559.4 220 512.6 176.6C465.5 132.9 400.8 96 320 96zM176 320C176 240.5 240.5 176 320 176C399.5 176 464 240.5 464 320C464 399.5 399.5 464 320 464C240.5 464 176 399.5 176 320zM320 256C320 291.3 291.3 320 256 320C244.5 320 233.7 317 224.3 311.6C223.3 322.5 224.2 333.7 227.2 344.8C240.9 396 293.6 426.4 344.8 412.7C396 399 426.4 346.3 412.7 295.1C400.5 249.4 357.2 220.3 311.6 224.3C316.9 233.6 320 244.4 320 256z" />
                            </svg>
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Positioner>
                            <Tooltip.Popup className="bg-[#1d1d1f] text-white text-sm px-3 py-1.5 rounded-lg">
                              Preview
                            </Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>

                      {/* Delete Button */}
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <button
                            onClick={() => {
                              // Set current iteration ID based on history index
                              // If historyIndex > 0, it's a variation (iteration), otherwise it's the main design
                              // iterationIds[0] is always null (main design), iterationIds[1+] are variation IDs
                              const iterationId = historyIndex > 0 && iterationIds.length > historyIndex && iterationIds[historyIndex] !== undefined
                                ? iterationIds[historyIndex]
                                : null;
                              setCurrentIterationId(iterationId);
                              setShowDeleteDialog(true);
                            }}
                            disabled={loading || !generatedImage}
                            className="px-3 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none"
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                              <path d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z" />
                            </svg>
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Positioner>
                            <Tooltip.Popup className="bg-[#1d1d1f] text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
                              Delete
                            </Tooltip.Popup>
                          </Tooltip.Positioner>
                        </Tooltip.Portal>
                      </Tooltip.Root>

                      {/* Save to Collection Button (Admin Only) */}
                      {userRole === 'admin' && (
                        <Tooltip.Root>
                          <Tooltip.Trigger>
                            <button
                              onClick={() => {
                                if (!currentDesignId) {
                                  toast.warning('Please save your design first before adding it to a collection');
                                  return;
                                }
                                setShowCollectionModal(true);
                              }}
                              disabled={loading || !generatedImage || !currentDesignId}
                              className="px-3 py-2 text-gray-700 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none"
                              title="Save to Collection"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                                <path d="M160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 237.3C544 220.3 537.3 204 525.3 192L448 114.7C436 102.7 419.7 96 402.7 96L160 96zM192 192C192 174.3 206.3 160 224 160L384 160C401.7 160 416 174.3 416 192L416 256C416 273.7 401.7 288 384 288L224 288C206.3 288 192 273.7 192 256L192 192zM320 352C355.3 352 384 380.7 384 416C384 451.3 355.3 480 320 480C284.7 480 256 451.3 256 416C256 380.7 284.7 352 320 352z" />
                              </svg>
                            </button>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Positioner>
                              <Tooltip.Popup className="bg-[#1d1d1f] text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
                                Save to Collection
                              </Tooltip.Popup>
                            </Tooltip.Positioner>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      )}

                      <AlertDialog.Root open={showStartOverDialog} onOpenChange={setShowStartOverDialog}>
                        <AlertDialog.Portal>
                          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                          <AlertDialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 max-w-md">
                            <AlertDialog.Title className="text-xl font-semibold text-[#1d1d1f] mb-2">
                              Start Over?
                            </AlertDialog.Title>
                            <AlertDialog.Description className="text-gray-600 mb-6">
                              This will clear your current workspace. Any saved designs will remain in your collection.
                            </AlertDialog.Description>
                            <div className="flex gap-3 justify-end">
                              <AlertDialog.Close className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                Cancel
                              </AlertDialog.Close>
                              <AlertDialog.Close
                                onClick={confirmStartOver}
                                className="px-4 py-2 text-sm text-white bg-[#1d1d1f] hover:bg-[#2d2d2f] rounded-lg transition-colors"
                              >
                                Clear Workspace
                              </AlertDialog.Close>
                            </div>
                          </AlertDialog.Popup>
                        </AlertDialog.Portal>
                      </AlertDialog.Root>

                      {/* Delete Dialog */}
                      <AlertDialog.Root open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <AlertDialog.Portal>
                          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                          <AlertDialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 max-w-md">
                            <AlertDialog.Title className="text-xl font-semibold text-[#1d1d1f] mb-2">
                              Delete?
                            </AlertDialog.Title>
                            <AlertDialog.Description className="text-gray-600 mb-6">
                              {currentIterationId && historyIndex > 0
                                ? 'Delete this iteration? This will remove it from your design history.'
                                : 'Delete this entire design? This will permanently remove the design and all its iterations.'}
                            </AlertDialog.Description>
                            <div className="flex gap-3 justify-end">
                              <AlertDialog.Close className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                Cancel
                              </AlertDialog.Close>
                              {historyIndex > 0 && imageHistory.length > 1 && (
                                <AlertDialog.Close
                                  onClick={handleDeleteIteration}
                                  className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                                >
                                  Delete Iteration
                                </AlertDialog.Close>
                              )}
                              <AlertDialog.Close
                                onClick={() => {
                                  setShowDeleteDialog(false);
                                  setShowDeleteDesignConfirm(true);
                                }}
                                className="px-4 py-2 text-sm text-white bg-[#1d1d1f] hover:bg-[#2d2d2f] rounded-lg transition-colors"
                              >
                                Delete Design
                              </AlertDialog.Close>
                            </div>
                          </AlertDialog.Popup>
                        </AlertDialog.Portal>
                      </AlertDialog.Root>

                      {/* Delete Design Confirmation Dialog */}
                      <AlertDialog.Root open={showDeleteDesignConfirm} onOpenChange={setShowDeleteDesignConfirm}>
                        <AlertDialog.Portal>
                          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                          <AlertDialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 max-w-md border-2 border-red-200">
                            <AlertDialog.Title className="text-xl font-semibold text-red-600 mb-2">
                              Delete Entire Design?
                            </AlertDialog.Title>
                            <AlertDialog.Description className="text-gray-600 mb-6">
                              This will permanently delete this design and <strong>all of its iterations</strong>. This action cannot be undone.
                            </AlertDialog.Description>
                            <div className="flex gap-3 justify-end">
                              <AlertDialog.Close
                                onClick={() => {
                                  setShowDeleteDesignConfirm(false);
                                  setShowDeleteDialog(true);
                                }}
                                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                Cancel
                              </AlertDialog.Close>
                              <AlertDialog.Close
                                onClick={handleDeleteDesign}
                                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                              >
                                Yes, Delete Design
                              </AlertDialog.Close>
                            </div>
                          </AlertDialog.Popup>
                        </AlertDialog.Portal>
                      </AlertDialog.Root>

                      {/* Preview Modal */}
                      <AlertDialog.Root open={showPreviewModal} onOpenChange={setShowPreviewModal}>
                        <AlertDialog.Portal>
                          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                          <AlertDialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-4 sm:p-5 inline-block max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between mb-3">
                              <AlertDialog.Title className="text-base sm:text-lg font-semibold text-[#1d1d1f]">T-Shirt Preview</AlertDialog.Title>
                              <AlertDialog.Close className="p-2 text-gray-600 hover:text-[#1d1d1f] hover:bg-gray-100 rounded-lg">✕</AlertDialog.Close>
                            </div>
                            <div className="relative flex-1 min-h-0 border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center" style={{ backgroundColor: backgroundColor }}>
                              {previewLoading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <svg
                                    className="animate-spin h-8 w-8 text-[#1d1d1f]"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                </div>
                              )}
                              {previewImageUrl && (
                                // Use native img for intrinsic sizing without fixed container
                                <img
                                  src={previewImageUrl}
                                  alt="T-shirt mockup"
                                  className="block w-auto h-auto max-w-[90vw] max-h-[calc(90vh-88px)] object-contain"
                                />
                              )}
                            </div>
                            {/* Footer removed to avoid reducing available image height; use the ✕ in header to close */}
                          </AlertDialog.Popup>
                        </AlertDialog.Portal>
                      </AlertDialog.Root>

                      {/* Collection Modal */}
                      <CollectionModal
                        open={showCollectionModal}
                        onOpenChange={setShowCollectionModal}
                        designId={currentDesignId}
                      />
                    </div>
                  </div>
                </Tooltip.Provider>
              </div>
            </div>
          </div>
        </div>

        {/* Right Properties Panel */}
        <div className="hidden md:block fixed right-0 top-0 bottom-0 w-64 bg-white border-l border-gray-200 z-30 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-[#1d1d1f]">
              {activeTextLayer ? 'Text Properties' : 'Properties'}
            </h2>
          </div>

          {activeTextLayer ? (
            <TextLayerPropertiesPanel
              activeTextLayer={activeTextLayer}
              canvasSize={canvasSize}
              activeFontSizePx={activeFontSizePx}
              activeLetterSpacingPx={activeLetterSpacingPx}
              activeCurveValue={activeCurveValue}
              FONT_OPTIONS={FONT_OPTIONS}
              TEXT_STYLE_PRESETS={TEXT_STYLE_PRESETS}
              onUpdateTextLayer={updateTextLayer}
              onFontFamilyChange={handleFontFamilyChange}
              onFontSizeChange={handleFontSizeChange}
              onColorChange={handleColorChange}
              onLetterSpacingChange={handleLetterSpacingChange}
              onCurvePresetClick={handleCurvePresetClick}
              onApplyTextPreset={applyTextPreset}
              onDeleteActiveText={handleDeleteActiveText}
            />
          ) : (
            <div className="p-4 space-y-6">
              {/* Background Color Picker */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Background Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    disabled={loading}
                    className="w-12 h-12 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 color-input"
                    title="Choose background color"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={backgroundColor.toUpperCase()}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9A-F]/gi, '').slice(0, 7);
                        if (value.length === 6 || value.length === 7) {
                          setBackgroundColor('#' + value.replace('#', ''));
                        }
                      }}
                      placeholder="#FFFFFF"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]/30 font-mono"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
