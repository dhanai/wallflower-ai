/**
 * Paper.js Text-on-Path Renderer
 * Provides high-quality vector-based text transformations for Kittl-like effects
 * 
 * Note: Paper.js is only available client-side, so this module should only be imported
 * dynamically in client components
 */

// Store canvas-to-scope mapping for multiple canvases
const canvasScopes = new Map<HTMLCanvasElement, any>();

let paperModule: any = null;

function getPaper(): any {
  if (typeof window === 'undefined') {
    throw new Error('Paper.js is only available client-side');
  }
  if (!paperModule) {
    // Dynamic require only in browser - webpack will ignore this at build time
    // @ts-ignore - Paper.js is a dynamic import
    paperModule = typeof require !== 'undefined' ? require('paper') : null;
    if (!paperModule) {
      throw new Error('Paper.js library not available');
    }
  }
  return paperModule;
}

function getPaperScope(canvas: HTMLCanvasElement): any {
  const paperLib = getPaper();
  let scope = canvasScopes.get(canvas);
  
  if (!scope) {
    scope = new paperLib.PaperScope();
    scope.setup(canvas);
    canvasScopes.set(canvas, scope);
  }
  
  // Activate this scope
  scope.activate();
  
  return scope;
}

export interface BezierPathData {
  // For cubic Bezier curves: [start, control1, control2, end]
  points: Array<{
    x: number;
    y: number;
    handleIn?: { x: number; y: number }; // Handle pointing into this point
    handleOut?: { x: number; y: number }; // Handle pointing out from this point
  }>;
  closed?: boolean;
}

export interface TextRenderOptions {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right';
  fillColor: string;
  strokeEnabled?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  extrudeEnabled?: boolean;
  extrudeDepth?: number;
  extrudeDirection?: number;
  extrudeColor?: string;
  blendMode?: string;
}

/**
 * Renders text on a Bezier path using Paper.js
 */
export function renderTextOnPath(
  canvas: HTMLCanvasElement,
  pathData: BezierPathData,
  options: TextRenderOptions
): void {
  const paperLib = getPaper();
  const scope = getPaperScope(canvas);
  scope.activate();
  
  // Clear the canvas
  scope.project.clear();
  
  // Create path from Bezier data
  const path = new scope.Path();
  
  if (pathData.points.length < 2) {
    return; // Need at least 2 points
  }
  
  // Start with first point
  const firstPoint = pathData.points[0];
  path.moveTo(new paperLib.Point(firstPoint.x, firstPoint.y));
  
  // Add cubic Bezier segments
  for (let i = 1; i < pathData.points.length; i++) {
    const prevPoint = pathData.points[i - 1];
    const currPoint = pathData.points[i];
    
    // Use handles if available, otherwise create straight segment
    const handleOut = prevPoint.handleOut 
      ? new paperLib.Point(prevPoint.handleOut.x, prevPoint.handleOut.y)
      : new paperLib.Point(prevPoint.x, prevPoint.y);
    
    const handleIn = currPoint.handleIn
      ? new paperLib.Point(currPoint.handleIn.x, currPoint.handleIn.y)
      : new paperLib.Point(currPoint.x, currPoint.y);
    
    const point = new paperLib.Point(currPoint.x, currPoint.y);
    
    path.cubicCurveTo(handleOut, handleIn, point);
  }
  
  if (pathData.closed) {
    path.closePath();
  }
  
  // Create text item and place it on the path
  const textItem = new paperLib.PointText(new paperLib.Point(0, 0));
  textItem.content = options.text;
  textItem.fontFamily = options.fontFamily;
  textItem.fontSize = options.fontSize;
  textItem.fontWeight = options.fontWeight === 'bold' ? 'bold' : 'normal';
  // Paper.js PointText properties - using @ts-ignore for properties that exist at runtime
  // @ts-ignore - letterSpacing exists at runtime
  textItem.letterSpacing = options.letterSpacing;
  // @ts-ignore - justification exists at runtime
  textItem.justification = options.textAlign === 'left' ? 'left' : 
                           options.textAlign === 'right' ? 'right' : 'center';
  
  // Apply fill color
  if (options.fillColor.startsWith('#')) {
    textItem.fillColor = new paperLib.Color(options.fillColor);
  } else {
    // Handle rgba strings
    const rgbaMatch = options.fillColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1]);
      const g = parseInt(rgbaMatch[2]);
      const b = parseInt(rgbaMatch[3]);
      const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
      textItem.fillColor = new paperLib.Color(r / 255, g / 255, b / 255, a);
    } else {
      textItem.fillColor = new paperLib.Color(options.fillColor);
    }
  }
  
  // Apply stroke if enabled
  if (options.strokeEnabled && options.strokeWidth && options.strokeWidth > 0) {
    textItem.strokeColor = new paperLib.Color(options.strokeColor || '#000000');
    textItem.strokeWidth = options.strokeWidth;
  }
  
  // Apply text on path
  // Paper.js doesn't have native text-on-path, so we'll use a different approach:
  // For now, we'll position glyphs along the path manually
  // For a full implementation, we'd need to use opentype.js or similar to get glyph paths
  
  // Place text on path
  const pathLength = path.length;
  const textLength = textItem.content.length;
  const charSpacing = options.letterSpacing || 0;
  
  // Calculate total text width
  let totalWidth = 0;
  for (let i = 0; i < textLength; i++) {
    const charWidth = textItem.fontSize * 0.6; // Approximate
    totalWidth += charWidth + charSpacing;
  }
  
  // Position text along path based on alignment
  let startOffset = 0;
  if (options.textAlign === 'center') {
    startOffset = (pathLength - totalWidth) / 2;
  } else if (options.textAlign === 'right') {
    startOffset = pathLength - totalWidth;
  }
  
  // For now, render text at path start
  // Full glyph-on-path would require opentype.js integration
  const startPoint = path.getPointAt(startOffset);
  textItem.position = startPoint;
  
  // Apply transformations
  if (options.shadowEnabled) {
    // Paper.js shadow support
    textItem.shadowColor = new paperLib.Color(options.shadowColor || 'rgba(0,0,0,0.35)');
    textItem.shadowBlur = options.shadowBlur || 12;
    textItem.shadowOffset = new paperLib.Point(options.shadowOffsetX || 0, options.shadowOffsetY || 2);
  }
  
  // Blend mode
  if (options.blendMode && options.blendMode !== 'source-over') {
    // @ts-ignore - Paper.js blend modes
    textItem.blendMode = options.blendMode;
  }
  
  // Draw extrude effect
  if (options.extrudeEnabled && options.extrudeDepth) {
    const steps = Math.max(1, Math.round(options.extrudeDepth / 2));
    const rad = ((options.extrudeDirection || 315) * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    
    const extrudeColor = new paperLib.Color(options.extrudeColor || '#000000');
    
    for (let i = steps; i >= 1; i--) {
      const extrudeText = textItem.clone();
      extrudeText.position = new paperLib.Point(
        startPoint.x + dx * i,
        startPoint.y + dy * i
      );
      extrudeText.fillColor = extrudeColor;
      extrudeText.strokeColor = null;
      extrudeText.shadowColor = null;
    }
  }
  
  // Paper.js automatically renders to canvas when items are added/modified
}

/**
 * Renders text with warp transformations using Paper.js
 * This provides better quality than canvas-based warping
 */
export function renderWarpedText(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  text: string,
  options: TextRenderOptions,
  warpType: 'none' | 'distort' | 'circle' | 'angle' | 'arch' | 'rise' | 'wave' | 'flag' | 'custom',
  warpAmount: number,
  warpFrequency?: number
): void {
  const paperLib = getPaper();
  const scope = getPaperScope(canvas);
  scope.activate();
  
  // Ensure canvas size matches
  if (scope.project.view.viewSize.width !== width || scope.project.view.viewSize.height !== height) {
    scope.project.view.viewSize = new paperLib.Size(width, height);
  }
  
  scope.project.clear();
  
  // Clamp warp amount to prevent extreme values that push text off-screen
  const clampedWarpAmount = Math.max(-1, Math.min(1, warpAmount));
  
  // Create a path based on warp type
  const path = new scope.Path();
  
  switch (warpType) {
    case 'arch': {
      // Create arch path (curved upward or downward)
      // Use a more conservative approach to keep text within bounds
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) * 0.4; // More conservative to keep in bounds
      const radius = Math.abs(clampedWarpAmount) * maxRadius;
      const arcSpan = Math.PI * 0.6; // 60 degree arc span
      const startAngle = -arcSpan / 2;
      const endAngle = arcSpan / 2;
      
      // Create arc path using cubic Bezier approximation
      // Ensure points stay within canvas bounds
      const startX = Math.max(0, Math.min(width, centerX - radius * Math.cos(startAngle)));
      const startY = Math.max(0, Math.min(height, centerY + radius * Math.sin(startAngle) * (clampedWarpAmount > 0 ? -1 : 1)));
      const endX = Math.max(0, Math.min(width, centerX + radius * Math.cos(endAngle)));
      const endY = Math.max(0, Math.min(height, centerY + radius * Math.sin(endAngle) * (clampedWarpAmount > 0 ? -1 : 1)));
      
      const startPoint = new paperLib.Point(startX, startY);
      const endPoint = new paperLib.Point(endX, endY);
      
      // Use cubic Bezier to approximate arc
      const controlOffset = radius * 0.552; // Magic number for cubic Bezier arc approximation
      const control1 = new paperLib.Point(
        Math.max(0, Math.min(width, startPoint.x + controlOffset)),
        Math.max(0, Math.min(height, startPoint.y - (clampedWarpAmount > 0 ? -controlOffset : controlOffset)))
      );
      const control2 = new paperLib.Point(
        Math.max(0, Math.min(width, endPoint.x - controlOffset)),
        Math.max(0, Math.min(height, endPoint.y - (clampedWarpAmount > 0 ? -controlOffset : controlOffset)))
      );
      
      path.moveTo(startPoint);
      path.cubicCurveTo(control1, control2, endPoint);
      break;
    }
    
    case 'wave': {
      // Create wave path
      const freq = warpFrequency || 1.0;
      const amplitude = clampedWarpAmount * height * 0.2; // More conservative
      const segments = 20;
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = t * width;
        const y = Math.max(0, Math.min(height, height / 2 + amplitude * Math.sin(2 * Math.PI * freq * t)));
        
        if (i === 0) {
          path.moveTo(new paperLib.Point(x, y));
        } else {
          path.lineTo(new paperLib.Point(x, y));
        }
      }
      break;
    }
    
    case 'flag': {
      // Create flag-like path
      const freq = warpFrequency || 1.0;
      const amplitude = clampedWarpAmount * height * 0.25; // More conservative
      const segments = 30;
      
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const x = t * width;
        // Amplify toward the end
        const waveAmplitude = amplitude * (t * 0.5 + 0.5);
        const y = Math.max(0, Math.min(height, height / 2 + waveAmplitude * Math.sin(2 * Math.PI * freq * t)));
        
        if (i === 0) {
          path.moveTo(new paperLib.Point(x, y));
        } else {
          path.lineTo(new paperLib.Point(x, y));
        }
      }
      break;
    }
    
    case 'rise': {
      // Simple rising path
      const riseAmount = clampedWarpAmount * height * 0.4; // More conservative
      const startY = Math.max(0, Math.min(height, height / 2));
      const endY = Math.max(0, Math.min(height, height / 2 - riseAmount));
      path.moveTo(new paperLib.Point(0, startY));
      path.lineTo(new paperLib.Point(width, endY));
      break;
    }
    
    case 'circle': {
      // Circular path
      const freq = warpFrequency || 1.0;
      const maxRadius = Math.min(width, height) * 0.25; // More conservative
      const radius = clampedWarpAmount * maxRadius;
      const centerX = width / 2;
      const centerY = height / 2;
      const segments = 32;
      
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI * freq;
        const x = Math.max(0, Math.min(width, centerX + radius * Math.cos(angle)));
        const y = Math.max(0, Math.min(height, centerY + radius * Math.sin(angle)));
        
        if (i === 0) {
          path.moveTo(new paperLib.Point(x, y));
        } else {
          path.lineTo(new paperLib.Point(x, y));
        }
      }
      break;
    }
    
    default: {
      // Flat baseline
      path.moveTo(new paperLib.Point(0, height / 2));
      path.lineTo(new paperLib.Point(width, height / 2));
      break;
    }
  }
  
  // Create text item
  const textItem = new paperLib.PointText(new paperLib.Point(0, 0));
  textItem.content = text;
  textItem.fontFamily = options.fontFamily;
  textItem.fontSize = options.fontSize;
  textItem.fontWeight = options.fontWeight === 'bold' ? 'bold' : 'normal';
  // Paper.js PointText properties - using @ts-ignore for properties that exist at runtime
  // @ts-ignore - letterSpacing exists at runtime
  textItem.letterSpacing = options.letterSpacing;
  // @ts-ignore - justification exists at runtime
  textItem.justification = options.textAlign === 'left' ? 'left' : 
                           options.textAlign === 'right' ? 'right' : 'center';
  
  // Apply colors
  if (options.fillColor.startsWith('#')) {
    textItem.fillColor = new paperLib.Color(options.fillColor);
  } else {
    const rgbaMatch = options.fillColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      const r = parseInt(rgbaMatch[1]);
      const g = parseInt(rgbaMatch[2]);
      const b = parseInt(rgbaMatch[3]);
      const a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
      textItem.fillColor = new paperLib.Color(r / 255, g / 255, b / 255, a);
    }
  }
  
  // Apply stroke
  if (options.strokeEnabled && options.strokeWidth && options.strokeWidth > 0) {
    textItem.strokeColor = new paperLib.Color(options.strokeColor || '#000000');
    textItem.strokeWidth = options.strokeWidth;
  }
  
  // Position text along path with proper alignment
  // Calculate text width to position it correctly
  const textMetrics = new paperLib.PointText(new paperLib.Point(0, 0));
  textMetrics.content = text;
  textMetrics.fontFamily = options.fontFamily;
  textMetrics.fontSize = options.fontSize;
  textMetrics.fontWeight = options.fontWeight === 'bold' ? 'bold' : 'normal';
  // @ts-ignore
  textMetrics.letterSpacing = options.letterSpacing;
  
  const textBounds = textMetrics.bounds;
  const textWidth = textBounds.width;
  const pathLength = path.length;
  
  // Position text along path based on alignment
  let pathOffset = 0;
  if (options.textAlign === 'center') {
    pathOffset = Math.max(0, (pathLength - textWidth) / 2);
  } else if (options.textAlign === 'right') {
    pathOffset = Math.max(0, pathLength - textWidth);
  }
  
  // Get point along path, ensuring it's within bounds
  const safeOffset = Math.max(0, Math.min(pathLength, pathOffset));
  const pathPoint = path.getPointAt(safeOffset);
  const pathTangent = path.getTangentAt(safeOffset);
  
  // Position text at path point, accounting for baseline
  // Get the angle for rotation
  const angle = pathTangent ? Math.atan2(pathTangent.y, pathTangent.x) : 0;
  
  textItem.position = pathPoint;
  
  // Rotate text to follow path (for non-arch types, this helps with alignment)
  if (warpType !== 'arch' && Math.abs(angle) > 0.01) {
    textItem.rotate(angle * (180 / Math.PI), pathPoint);
  }
  
  // Apply effects
  if (options.shadowEnabled) {
    textItem.shadowColor = new paperLib.Color(options.shadowColor || 'rgba(0,0,0,0.35)');
    textItem.shadowBlur = options.shadowBlur || 12;
    textItem.shadowOffset = new paperLib.Point(options.shadowOffsetX || 0, options.shadowOffsetY || 2);
  }
  
  if (options.blendMode && options.blendMode !== 'source-over') {
    // @ts-ignore
    textItem.blendMode = options.blendMode;
  }
  
  // Paper.js automatically renders to canvas when items are added/modified
}

/**
 * Convert a Paper.js path to SVG path data string
 */
export function pathToSVG(path: any): string {
  return path.pathData;
}

/**
 * Create a Bezier path from a simple curve value (for arch type)
 */
export function createArchPath(
  width: number,
  height: number,
  curveAmount: number // -1 to 1
): BezierPathData {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.abs(curveAmount) * Math.min(width, height) * 0.5;
  const direction = curveAmount > 0 ? -1 : 1;
  
  // Create a cubic Bezier curve approximating an arc
  const controlOffset = radius * 0.552; // Magic number for cubic Bezier arc approximation
  
  return {
    points: [
      {
        x: centerX - radius,
        y: centerY,
        handleOut: { x: centerX - radius, y: centerY - direction * controlOffset }
      },
      {
        x: centerX + radius,
        y: centerY,
        handleIn: { x: centerX + radius, y: centerY - direction * controlOffset }
      }
    ],
    closed: false
  };
}

