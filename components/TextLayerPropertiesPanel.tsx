'use client';

import React from 'react';
import { Select } from '@base-ui-components/react/select';

// Type definitions (matching CanvasEditor.tsx)
type FillType = 'solid' | 'linear-gradient' | 'radial-gradient' | 'pattern';
type BlendMode =
  | 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
  | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference'
  | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';
type WarpType = 'none' | 'distort' | 'circle' | 'angle' | 'arch' | 'rise' | 'wave' | 'flag' | 'custom';

export type TextLayer = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  underline: boolean;
  textAlign: 'left' | 'center' | 'right';
  color: string;
  letterSpacing: number;
  curve: number;
  fillType: FillType;
  fillSolid: string;
  fillGradient?: {
    type: 'linear' | 'radial';
    angleDeg?: number;
    stops: Array<{ offset: number; color: string; alpha?: number }>;
  };
  fillPattern?: {
    imageDataUrl: string;
    scale: number;
    offsetX: number;
    offsetY: number;
  };
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidthPx: number;
  strokeJoin: CanvasLineJoin;
  miterLimit: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlurPx: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  extrudeEnabled: boolean;
  extrudeDepthPx: number;
  extrudeDirectionDeg: number;
  extrudeColor: string;
  blendMode: BlendMode;
  warp: {
    type: WarpType;
    amount: number;
    frequency?: number;
    perspective?: {
      tl: { x: number; y: number };
      tr: { x: number; y: number };
      br: { x: number; y: number };
      bl: { x: number; y: number };
    };
  };
  lockAspect: boolean;
  rotateSnapDeg: number;
  scaleFromCenter: boolean;
};

interface TextLayerPropertiesPanelProps {
  activeTextLayer: TextLayer;
  canvasSize: { width: number; height: number };
  activeFontSizePx: number;
  activeLetterSpacingPx: number;
  activeCurveValue: number;
  FONT_OPTIONS: Array<{ label: string; value: string; stack: string }>;
  TEXT_STYLE_PRESETS: Record<string, (base: TextLayer) => Partial<TextLayer>>;
  onUpdateTextLayer: (id: string, updates: Partial<TextLayer>) => void;
  onFontFamilyChange: (fontFamily: string) => void;
  onFontSizeChange: (sizePx: number) => void;
  onColorChange: (color: string) => void;
  onLetterSpacingChange: (spacingPx: number) => void;
  onCurvePresetClick: (curveValue: number) => void;
  onApplyTextPreset: (layerId: string, presetName: string) => void;
  onDeleteActiveText: () => void;
}

export function TextLayerPropertiesPanel({
  activeTextLayer,
  canvasSize,
  activeFontSizePx,
  activeLetterSpacingPx,
  activeCurveValue,
  FONT_OPTIONS,
  TEXT_STYLE_PRESETS,
  onUpdateTextLayer,
  onFontFamilyChange,
  onFontSizeChange,
  onColorChange,
  onLetterSpacingChange,
  onCurvePresetClick,
  onApplyTextPreset,
  onDeleteActiveText,
}: TextLayerPropertiesPanelProps) {
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  return (
    <div className="p-5 space-y-5 bg-white">
      {/* Typography Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Typography</h3>
        
        {/* Font Family */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Font</label>
          <Select.Root
            items={FONT_OPTIONS.map((font) => ({ label: font.label, value: font.value }))}
            value={activeTextLayer.fontFamily}
            onValueChange={(value) => onFontFamilyChange(value as string)}
          >
            <Select.Trigger className="w-full inline-flex items-center gap-2 px-3 py-2 bg-white text-sm text-[#1d1d1f] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]/30">
              <Select.Value />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner side="bottom" align="start" sideOffset={4} className="z-[9999]">
                <Select.Popup className="bg-white border border-gray-200 rounded-lg shadow-lg py-2 max-h-60 overflow-auto min-w-[200px]">
                  <Select.List>
                    {FONT_OPTIONS.map((font) => (
                      <Select.Item
                        key={font.value}
                        value={font.value}
                        className="relative px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                      >
                        <Select.ItemText style={{ fontFamily: font.stack }}>{font.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </div>

        {/* Font Size Slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-gray-600">Size</label>
            <span className="text-xs text-gray-500 font-mono">{activeFontSizePx}px</span>
          </div>
          <input
            type="range"
            min={8}
            max={400}
            step={1}
            value={activeFontSizePx}
            onChange={(event) => onFontSizeChange(Number(event.target.value))}
            className="w-full accent-[#7c3aed] h-1.5"
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Color</label>
          <input
            type="color"
            value={activeTextLayer.fillSolid || activeTextLayer.color || '#1d1d1f'}
            onChange={(event) => {
              const color = event.target.value;
              onColorChange(color);
              onUpdateTextLayer(activeTextLayer.id, { fillSolid: color });
            }}
            className="w-full h-9 rounded-md border border-gray-200 cursor-pointer"
          />
        </div>

        {/* Letter Spacing */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-gray-600">Letter Spacing</label>
            <span className="text-xs text-gray-500 font-mono">{activeLetterSpacingPx}px</span>
          </div>
          <input
            type="range"
            min={-20}
            max={80}
            step={1}
            value={clamp(activeLetterSpacingPx, -20, 80)}
            onChange={(event) => onLetterSpacingChange(Number(event.target.value))}
            className="w-full accent-[#7c3aed] h-1.5"
          />
        </div>
      </div>

      <div className="border-t border-gray-100"></div>

      {/* Warp Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Warp</h3>
        
        {/* Warp Type Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Type</label>
          <div className="grid grid-cols-3 gap-2">
            {(['none', 'distort', 'circle', 'angle', 'arch', 'rise', 'wave', 'flag', 'custom'] as const).map((warpType) => (
              <button
                key={warpType}
                onClick={() => {
                  const currentWarp = activeTextLayer.warp || { type: 'none', amount: 0, frequency: 1.0 };
                  onUpdateTextLayer(activeTextLayer.id, {
                    warp: {
                      ...currentWarp,
                      type: warpType,
                      amount: warpType === 'none' ? 0 : currentWarp.amount || 0,
                    },
                    curve: warpType === 'arch' ? (currentWarp.amount || 0) : 0,
                  });
                }}
                className={`px-2 py-1.5 text-xs rounded-md border transition-colors ${
                  (activeTextLayer.warp?.type || 'none') === warpType
                    ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-[#7c3aed] font-medium'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {warpType === 'none' ? 'None' : warpType.charAt(0).toUpperCase() + warpType.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Curve Slider - Only show when arch is selected */}
        {activeTextLayer.warp?.type === 'arch' && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-gray-600">Curve</label>
              <span className="text-xs text-gray-500 font-mono">{Math.round(activeCurveValue * 100)}%</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              value={activeCurveValue * 100}
              onChange={(e) => {
                const sliderValue = Number(e.target.value);
                // Snap to nearest preset value: -75, -50, -25, 0, 25, 50, 75
                const snapPoints = [-75, -50, -25, 0, 25, 50, 75];
                let closestSnap = snapPoints[0];
                let minDiff = Math.abs(sliderValue - snapPoints[0]);

                snapPoints.forEach((point) => {
                  const diff = Math.abs(sliderValue - point);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestSnap = point;
                  }
                });

                // Only snap if within 5% of a snap point
                const snappedValue = minDiff <= 5 ? closestSnap : sliderValue;
                const normalizedCurve = clamp(snappedValue / 100, -1, 1);
                // Update both curve and warp to keep them in sync
                // Keep warp type as 'arch' even when curve is 0 (user can still adjust it)
                onUpdateTextLayer(activeTextLayer.id, {
                  curve: normalizedCurve,
                  warp: {
                    ...activeTextLayer.warp,
                    type: 'arch', // Always keep as 'arch' when sliding the curve slider
                    amount: normalizedCurve,
                  },
                });
              }}
              className="w-full accent-[#7c3aed] h-1.5"
            />
          </div>
        )}

        {/* Warp Amount - for all warps except none and arch (which uses curve slider) */}
        {activeTextLayer.warp?.type && 
         activeTextLayer.warp.type !== 'none' && 
         activeTextLayer.warp.type !== 'arch' && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-600">Amount</label>
                <span className="text-xs text-gray-500 font-mono">{Math.round((activeTextLayer.warp?.amount || 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                step={1}
                value={(activeTextLayer.warp?.amount || 0) * 100}
                onChange={(e) => {
                  const amount = Number(e.target.value) / 100;
                  onUpdateTextLayer(activeTextLayer.id, {
                    warp: {
                      ...(activeTextLayer.warp || { type: 'none', amount: 0, frequency: 1.0 }),
                      amount: clamp(amount, -1, 1),
                    },
                  });
                }}
                className="w-full accent-[#7c3aed] h-1.5"
              />
            </div>
            {/* Frequency slider for warps that use it */}
            {(activeTextLayer.warp?.type === 'distort' || 
              activeTextLayer.warp?.type === 'circle' || 
              activeTextLayer.warp?.type === 'flag' || 
              activeTextLayer.warp?.type === 'wave' ||
              activeTextLayer.warp?.type === 'custom') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-600">Frequency</label>
                  <span className="text-xs text-gray-500 font-mono">{(activeTextLayer.warp?.frequency || 1.0).toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={activeTextLayer.warp?.frequency || 1.0}
                  onChange={(e) => {
                    onUpdateTextLayer(activeTextLayer.id, {
                      warp: {
                        ...(activeTextLayer.warp || { type: 'none', amount: 0, frequency: 1.0 }),
                        frequency: Number(e.target.value),
                      },
                    });
                  }}
                  className="w-full accent-[#7c3aed] h-1.5"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100"></div>

      {/* Fill Type */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Fill</h3>
        <div className="grid grid-cols-2 gap-2">
          {(['solid', 'linear-gradient', 'radial-gradient'] as const).map((fillType) => (
            <button
              key={fillType}
              onClick={() => onUpdateTextLayer(activeTextLayer.id, { fillType })}
              className={`px-2 py-1.5 text-xs rounded-md border transition-colors ${
                (activeTextLayer.fillType || 'solid') === fillType
                  ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-[#7c3aed] font-medium'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {fillType === 'solid' ? 'Solid' : fillType === 'linear-gradient' ? 'Linear' : 'Radial'}
            </button>
          ))}
        </div>
        {(activeTextLayer.fillType === 'linear-gradient' || activeTextLayer.fillType === 'radial-gradient') && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-600">Angle</label>
                <span className="text-xs text-gray-500 font-mono">{activeTextLayer.fillGradient?.angleDeg || 0}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={activeTextLayer.fillGradient?.angleDeg || 0}
                onChange={(e) => {
                  const currentGradient = activeTextLayer.fillGradient || { type: 'linear', angleDeg: 0, stops: [{ offset: 0, color: '#fff' }, { offset: 1, color: '#000' }] };
                  onUpdateTextLayer(activeTextLayer.id, {
                    fillGradient: {
                      ...currentGradient,
                      angleDeg: Number(e.target.value),
                    },
                  });
                }}
                className="w-full accent-[#7c3aed] h-1.5"
              />
            </div>
            <div className="text-xs text-gray-500">
              Gradient stops: {activeTextLayer.fillGradient?.stops?.length || 2}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100"></div>

      {/* Stroke/Outline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Outline</h3>
          <button
            onClick={() => onUpdateTextLayer(activeTextLayer.id, { strokeEnabled: !activeTextLayer.strokeEnabled })}
            className={`text-xs px-3 py-1 rounded-md border transition-colors ${
              activeTextLayer.strokeEnabled
                ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-[#7c3aed] font-medium'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {activeTextLayer.strokeEnabled ? 'On' : 'Off'}
          </button>
        </div>
        {activeTextLayer.strokeEnabled && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Color</label>
              <input
                type="color"
                value={activeTextLayer.strokeColor || '#000000'}
                onChange={(e) => onUpdateTextLayer(activeTextLayer.id, { strokeColor: e.target.value })}
                className="w-full h-9 rounded-md border border-gray-200 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-600">Width</label>
                <span className="text-xs text-gray-500 font-mono">{activeTextLayer.strokeWidthPx || 2}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={activeTextLayer.strokeWidthPx || 2}
                onChange={(e) => onUpdateTextLayer(activeTextLayer.id, { strokeWidthPx: Number(e.target.value) })}
                className="w-full accent-[#7c3aed] h-1.5"
              />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100"></div>

      {/* Shadow/Glow */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Shadow</h3>
          <button
            onClick={() => onUpdateTextLayer(activeTextLayer.id, { shadowEnabled: !activeTextLayer.shadowEnabled })}
            className={`text-xs px-3 py-1 rounded-md border transition-colors ${
              activeTextLayer.shadowEnabled
                ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-[#7c3aed] font-medium'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {activeTextLayer.shadowEnabled ? 'On' : 'Off'}
          </button>
        </div>
        {activeTextLayer.shadowEnabled && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Color</label>
              <input
                type="color"
                value={activeTextLayer.shadowColor || 'rgba(0,0,0,0.35)'}
                onChange={(e) => onUpdateTextLayer(activeTextLayer.id, { shadowColor: e.target.value })}
                className="w-full h-9 rounded-md border border-gray-200 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-600">Blur</label>
                <span className="text-xs text-gray-500 font-mono">{activeTextLayer.shadowBlurPx || 12}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={activeTextLayer.shadowBlurPx || 12}
                onChange={(e) => onUpdateTextLayer(activeTextLayer.id, { shadowBlurPx: Number(e.target.value) })}
                className="w-full accent-[#7c3aed] h-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">X</label>
                <input
                  type="number"
                  min={-20}
                  max={20}
                  step={1}
                  value={activeTextLayer.shadowOffsetX || 0}
                  onChange={(e) => onUpdateTextLayer(activeTextLayer.id, { shadowOffsetX: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Y</label>
                <input
                  type="number"
                  min={-20}
                  max={20}
                  step={1}
                  value={activeTextLayer.shadowOffsetY || 2}
                  onChange={(e) => onUpdateTextLayer(activeTextLayer.id, { shadowOffsetY: Number(e.target.value) })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100"></div>

      {/* Extrude (3D) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">3D Extrude</h3>
          <button
            onClick={() => onUpdateTextLayer(activeTextLayer.id, { extrudeEnabled: !activeTextLayer.extrudeEnabled })}
            className={`text-xs px-3 py-1 rounded-md border transition-colors ${
              activeTextLayer.extrudeEnabled
                ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-[#7c3aed] font-medium'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {activeTextLayer.extrudeEnabled ? 'On' : 'Off'}
          </button>
        </div>
        {activeTextLayer.extrudeEnabled && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Color</label>
              <input
                type="color"
                value={activeTextLayer.extrudeColor || '#000000'}
                onChange={(e) => onUpdateTextLayer(activeTextLayer.id, { extrudeColor: e.target.value })}
                className="w-full h-9 rounded-md border border-gray-200 cursor-pointer"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-600">Depth</label>
                <span className="text-xs text-gray-500 font-mono">{activeTextLayer.extrudeDepthPx || 12}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={80}
                step={1}
                value={activeTextLayer.extrudeDepthPx || 12}
                onChange={(e) => onUpdateTextLayer(activeTextLayer.id, { extrudeDepthPx: Number(e.target.value) })}
                className="w-full accent-[#7c3aed] h-1.5"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-600">Direction</label>
                <span className="text-xs text-gray-500 font-mono">{activeTextLayer.extrudeDirectionDeg || 315}°</span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={activeTextLayer.extrudeDirectionDeg || 315}
                onChange={(e) => onUpdateTextLayer(activeTextLayer.id, { extrudeDirectionDeg: Number(e.target.value) })}
                className="w-full accent-[#7c3aed] h-1.5"
              />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100"></div>

      {/* Blend Mode */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Blend Mode</h3>
        <Select.Root
          items={[
            { label: 'Normal', value: 'source-over' },
            { label: 'Multiply', value: 'multiply' },
            { label: 'Screen', value: 'screen' },
            { label: 'Overlay', value: 'overlay' },
            { label: 'Darken', value: 'darken' },
            { label: 'Lighten', value: 'lighten' },
          ]}
          value={activeTextLayer.blendMode || 'source-over'}
          onValueChange={(value) => onUpdateTextLayer(activeTextLayer.id, { blendMode: value as BlendMode })}
        >
          <Select.Trigger className="w-full inline-flex items-center gap-2 px-3 py-2 bg-white text-sm text-[#1d1d1f] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]/30">
            <Select.Value />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner side="bottom" align="start" sideOffset={4} className="z-[9999]">
              <Select.Popup className="bg-white border border-gray-200 rounded-lg shadow-lg py-2 max-h-60 overflow-auto min-w-[200px]">
                <Select.List>
                  {[
                    { label: 'Normal', value: 'source-over' },
                    { label: 'Multiply', value: 'multiply' },
                    { label: 'Screen', value: 'screen' },
                    { label: 'Overlay', value: 'overlay' },
                    { label: 'Darken', value: 'darken' },
                    { label: 'Lighten', value: 'lighten' },
                  ].map((mode) => (
                    <Select.Item
                      key={mode.value}
                      value={mode.value}
                      className="relative px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <Select.ItemText>{mode.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>

      <div className="border-t border-gray-100"></div>

      {/* Style Presets */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Style Presets</h3>
        <Select.Root
          items={[
            { label: 'Retro Pop', value: 'RetroPop' },
            { label: 'Neon Glow', value: 'NeonGlow' },
            { label: 'Classic Elegant', value: 'ClassicElegant' },
            { label: 'Bold 3D', value: 'Bold3D' },
            { label: 'Wave Vibe', value: 'WaveVibe' },
          ]}
          value=""
          onValueChange={(value) => {
            if (value && value !== '') {
              onApplyTextPreset(activeTextLayer.id, value);
            }
          }}
        >
          <Select.Trigger className="w-full inline-flex items-center gap-2 px-3 py-2 bg-white text-sm text-[#1d1d1f] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]/30">
            <Select.Value />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner side="bottom" align="start" sideOffset={4} className="z-[9999]">
              <Select.Popup className="bg-white border border-gray-200 rounded-lg shadow-lg py-2 max-h-60 overflow-auto min-w-[200px]">
                <Select.List>
                  <Select.Item
                    key="retro"
                    value="RetroPop"
                    className="relative px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <Select.ItemText>Retro Pop</Select.ItemText>
                  </Select.Item>
                  <Select.Item
                    key="neon"
                    value="NeonGlow"
                    className="relative px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <Select.ItemText>Neon Glow</Select.ItemText>
                  </Select.Item>
                  <Select.Item
                    key="classic"
                    value="ClassicElegant"
                    className="relative px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <Select.ItemText>Classic Elegant</Select.ItemText>
                  </Select.Item>
                  <Select.Item
                    key="bold"
                    value="Bold3D"
                    className="relative px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <Select.ItemText>Bold 3D</Select.ItemText>
                  </Select.Item>
                  <Select.Item
                    key="wave"
                    value="WaveVibe"
                    className="relative px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <Select.ItemText>Wave Vibe</Select.ItemText>
                  </Select.Item>
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>

      <div className="border-t border-gray-100"></div>

      {/* Text Alignment */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Alignment</h3>
        <div className="flex gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => onUpdateTextLayer(activeTextLayer.id, { textAlign: align })}
              className={`flex-1 px-3 py-2 text-sm border rounded-md transition-colors ${activeTextLayer.textAlign === align
                ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-[#7c3aed] font-medium'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              {align.charAt(0).toUpperCase() + align.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Style Options */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Style</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onUpdateTextLayer(activeTextLayer.id, { fontWeight: activeTextLayer.fontWeight === 'bold' ? 'normal' : 'bold' })}
            className={`flex-1 px-3 py-2 text-sm border rounded-md transition-colors font-bold ${activeTextLayer.fontWeight === 'bold'
              ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-[#7c3aed]'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
          >
            Bold
          </button>
          <button
            onClick={() => onUpdateTextLayer(activeTextLayer.id, { fontStyle: activeTextLayer.fontStyle === 'italic' ? 'normal' : 'italic' })}
            className={`flex-1 px-3 py-2 text-sm border rounded-md transition-colors italic ${activeTextLayer.fontStyle === 'italic'
              ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-[#7c3aed]'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
          >
            Italic
          </button>
          <button
            onClick={() => onUpdateTextLayer(activeTextLayer.id, { underline: !activeTextLayer.underline })}
            className={`flex-1 px-3 py-2 text-sm border rounded-md transition-colors underline ${activeTextLayer.underline
              ? 'border-[#7c3aed] bg-[#7c3aed]/10 text-[#7c3aed]'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
          >
            Underline
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100"></div>

      {/* Position & Size */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Position & Size</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">X</label>
            <input
              type="number"
              value={Math.round(activeTextLayer.x * (canvasSize.width || 1))}
              onChange={(e) => {
                const newX = Number(e.target.value) / (canvasSize.width || 1);
                onUpdateTextLayer(activeTextLayer.id, { x: clamp(newX, 0, 1 - activeTextLayer.width) });
              }}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Y</label>
            <input
              type="number"
              value={Math.round(activeTextLayer.y * (canvasSize.height || 1))}
              onChange={(e) => {
                const newY = Number(e.target.value) / (canvasSize.height || 1);
                onUpdateTextLayer(activeTextLayer.id, { y: clamp(newY, 0, 1 - activeTextLayer.height) });
              }}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Width</label>
            <input
              type="number"
              value={Math.round(activeTextLayer.width * (canvasSize.width || 1))}
              onChange={(e) => {
                const newWidth = Number(e.target.value) / (canvasSize.width || 1);
                onUpdateTextLayer(activeTextLayer.id, { width: clamp(newWidth, 0.01, 1 - activeTextLayer.x) });
              }}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Height</label>
            <input
              type="number"
              value={Math.round(activeTextLayer.height * (canvasSize.height || 1))}
              onChange={(e) => {
                const newHeight = Number(e.target.value) / (canvasSize.height || 1);
                onUpdateTextLayer(activeTextLayer.id, { height: clamp(newHeight, 0.01, 1 - activeTextLayer.y) });
              }}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Rotation</label>
            <input
              type="number"
              min={0}
              max={360}
              value={Math.round(activeTextLayer.rotation)}
              onChange={(e) => onUpdateTextLayer(activeTextLayer.id, { rotation: Number(e.target.value) })}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100"></div>

      {/* Delete Button */}
      <div>
        <button
          onClick={onDeleteActiveText}
          className="w-full px-4 py-2.5 text-sm text-red-600 hover:text-white hover:bg-red-600 border border-red-200 rounded-md transition-colors font-medium"
        >
          Delete Text Layer
        </button>
      </div>
    </div>
  );
}

