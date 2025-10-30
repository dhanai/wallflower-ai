'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Tooltip } from '@base-ui-components/react/tooltip';
import { Menu } from '@base-ui-components/react/menu';
import { AlertDialog } from '@base-ui-components/react/alert-dialog';
import { Select } from '@base-ui-components/react/select';

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
  { label: 'None', value: '' },
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
  { label: 'None', value: '' },
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

export default function CanvasEditor({ embedded = false }: { embedded?: boolean } = {}) {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasFileInputRef = useRef<HTMLInputElement>(null);

  // Prevent hydration mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleCanvasClick = () => {
    if (!generatedImage) {
      canvasFileInputRef.current?.click();
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
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
      if (data.imageUrl) {
        applyNewImage(data.imageUrl);
      }
      // Track last action for retry
      setLastPrompt(prompt);
      setLastMode(styleImage ? 'style' : 'generate');
      setLastStyleImage(styleImage);
      // Clear the prompt input after successful generation
      setPrompt('');
    } catch (error) {
      console.error('Error generating design:', error);
      alert('Failed to generate design');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!generatedImage || !prompt.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/designs/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: generatedImage,
          editPrompt: prompt,
          noiseLevel: 0.3,
          model: selectedModel,
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
      // Clear the prompt input after successful edit
      setPrompt('');
    } catch (error) {
      console.error('Error editing design:', error);
      alert('Failed to edit design');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!generatedImage && lastMode !== 'generate' && lastMode !== 'style') return;
    if (!lastMode) return;
    setLoading(true);
    try {
      if (lastMode === 'edit') {
        const res = await fetch('/api/designs/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            imageUrl: generatedImage, 
            editPrompt: lastPrompt, 
            noiseLevel: 0.3,
            model: lastModel,
          }),
        });
        const data = await res.json();
        if (data.imageUrl) applyNewImage(data.imageUrl);
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
          }
        : { 
            prompt: lastPrompt, 
            aspectRatio: '4:5',
            model: lastModel,
            style: lastArtStyle || undefined,
            styleId: customStyleId,
            backgroundColor,
          };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.imageUrl) applyNewImage(data.imageUrl);
    } catch (err) {
      console.error('Retry failed:', err);
      alert('Retry failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!generatedImage) return;
    
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
      alert('Failed to remove background');
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
      alert('Failed to prepare design for printing');
    } finally {
      setLoading(false);
    }
  };

  const handleKnockoutBackgroundColor = async () => {
    if (!generatedImage) return;
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
      alert('Failed to knock out background color');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewMockup = async () => {
    if (!generatedImage) return;
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
      alert('Failed to generate preview mockup');
    } finally {
      setPreviewLoading(false);
      setMockupLoading(false);
    }
  };

  const applyNewImage = (url: string) => {
    setGeneratedImage(url);
    setImageHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(url);
      return next;
    });
    setHistoryIndex((idx) => idx + 1);
  };

  const confirmStartOver = () => {
    setGeneratedImage(null);
    setPrompt('');
    setStyleImage(null);
    setImageHistory([]);
    setHistoryIndex(-1);
    setShowStartOverDialog(false);
  };

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

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <div className={`${embedded ? 'min-h-screen' : 'fixed inset-0'} bg-gradient-to-br from-white to-gray-50 flex flex-col`} style={{ overflow: 'hidden' }}>
      {/* Header - Fixed Top */}
      <div className="flex-shrink-0 grid grid-cols-3 items-center p-4 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          
        </div>
        {/* Centered iteration controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={goPrev}
            disabled={!canGoPrev || loading}
            className="px-2 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            title="Previous"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4">
              <path d="M41.4 342.6C28.9 330.1 28.9 309.8 41.4 297.3L169.4 169.3C178.6 160.1 192.3 157.4 204.3 162.4C216.3 167.4 224 179.1 224 192L224 256L560 256C586.5 256 608 277.5 608 304L608 336C608 362.5 586.5 384 560 384L224 384L224 448C224 460.9 216.2 472.6 204.2 477.6C192.2 482.6 178.5 479.8 169.3 470.7L41.3 342.7z"/>
            </svg>
          </button>
          <span className="text-sm text-gray-600 min-w-[72px] text-center">
            {historyIndex >= 0 ? `${historyIndex + 1} / ${imageHistory.length}` : '0 / 0'}
          </span>
          <button
            onClick={goNext}
            disabled={!canGoNext || loading}
            className="px-2 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            title="Next"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4">
              <path d="M598.6 297.4C611.1 309.9 611.1 330.2 598.6 342.7L470.6 470.7C461.4 479.9 447.7 482.6 435.7 477.6C423.7 472.6 416 460.9 416 448L416 384L80 384C53.5 384 32 362.5 32 336L32 304C32 277.5 53.5 256 80 256L416 256L416 192C416 179.1 423.8 167.4 435.8 162.4C447.8 157.4 461.5 160.2 470.7 169.3L598.7 297.3z"/>
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-end gap-2">
          {generatedImage && (
            <button
              onClick={() => {
                // Download functionality
                const link = document.createElement('a');
                link.href = generatedImage;
                link.download = `design-${Date.now()}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-white hover:bg-gray-900 transition-colors border border-gray-200 rounded-lg"
              title="Download"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span className="hidden sm:inline text-sm">Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area - Resizable */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-hidden">
        <div className="w-full max-w-4xl h-full flex items-center justify-center">
          {/* Canvas */}
          <div 
            className={`relative border-2 rounded-2xl overflow-hidden shadow-sm transition-all ${
              isDragging ? 'border-[#1d1d1f] border-dashed bg-gray-50' : 'border-gray-200'
            } ${!generatedImage ? 'cursor-pointer hover:border-gray-300' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleCanvasClick}
            style={{ 
              width: 'min(calc((100vh - 280px) * 4 / 5), 700px, 100%)',
              aspectRatio: '4 / 5',
              backgroundColor: backgroundColor,
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
                <Image
                  src={generatedImage}
                  alt="Generated design"
                  fill
                  className="object-cover"
                />
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
            ) : loading ? (
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
          </div>
        </div>
      </div>

      {/* Footer - Fixed Bottom */}
      <div className="relative flex-shrink-0 bg-white/80 backdrop-blur-xl">
        {/* Selectors */}
        {showSettings && (
        <div className="absolute left-0 right-0 -top-[220px] px-4 pt-4 pb-2 z-20">
          <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-2xl p-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
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

            {/* Background/T-Shirt Color Picker (right) */}
            <div className="flex items-center gap-2 pl-1">
              <label className="text-xs text-gray-600">Background color</label>
              <Select.Root
                items={tshirtColors.map(c => ({ label: c.label, value: c.hex }))}
                value={backgroundColor}
                onValueChange={(value) => setBackgroundColor(value as string)}
              >
                <div className="relative inline-block">
                  <Select.Trigger 
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-2 py-1.5 pr-7 bg-white text-xs text-[#1d1d1f] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/20 focus:border-[#1d1d1f]/30 transition-all hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block w-3.5 h-3.5 rounded" style={{ backgroundColor }} />
                      <Select.Value />
                    </span>
                  </Select.Trigger>
                  <Select.Icon className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </Select.Icon>
                </div>
                <Select.Portal>
                  <Select.Positioner side="top" align="end" alignItemWithTrigger={false} sideOffset={8}>
                    <Select.Popup className="bg-white border border-gray-200 rounded-lg shadow-lg py-1.5 max-h-60 overflow-auto min-w-[160px]">
                      <Select.List>
                        {tshirtColors.map((c, index) => (
                          <Select.Item 
                            key={`bg-${index}`} 
                            value={c.hex}
                            className="relative px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors flex items-center gap-2"
                          >
                            <span className="inline-block w-3.5 h-3.5 rounded" style={{ backgroundColor: c.hex }} />
                            <Select.ItemText>{c.label}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.List>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </div>
          </div>
          </div>
        </div>
        )}

        {/* Prompt Box */}
        <div className="p-4 pt-2">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <div className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus-within:border-[#1d1d1f] transition-colors shadow-sm">
              {/* Settings Toggle (left of +) */}
              <button
                onClick={() => setShowSettings((v) => !v)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                title={showSettings ? 'Hide settings' : 'Show settings'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5"><path d="M96 128C78.3 128 64 142.3 64 160C64 177.7 78.3 192 96 192L182.7 192C195 220.3 223.2 240 256 240C288.8 240 317 220.3 329.3 192L544 192C561.7 192 576 177.7 576 160C576 142.3 561.7 128 544 128L329.3 128C317 99.7 288.8 80 256 80C223.2 80 195 99.7 182.7 128L96 128zM96 288C78.3 288 64 302.3 64 320C64 337.7 78.3 352 96 352L342.7 352C355 380.3 383.2 400 416 400C448.8 400 477 380.3 489.3 352L544 352C561.7 352 576 337.7 576 320C576 302.3 561.7 288 544 288L489.3 288C477 259.7 448.8 240 416 240C383.2 240 355 259.7 342.7 288L96 288zM96 448C78.3 448 64 462.3 64 480C64 497.7 78.3 512 96 512L150.7 512C163 540.3 191.2 560 224 560C256.8 560 285 540.3 297.3 512L544 512C561.7 512 576 497.7 576 480C576 462.3 561.7 448 544 448L297.3 448C285 419.7 256.8 400 224 400C191.2 400 163 419.7 150.7 448L96 448z"/></svg>
              </button>

              {/* Style Image Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                title={selectedModel === 'recraft-v3' ? "Attach images to create a custom style" : "Attach style reference image"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                  <path d="M352 128C352 110.3 337.7 96 320 96C302.3 96 288 110.3 288 128L288 288L128 288C110.3 288 96 302.3 96 320C96 337.7 110.3 352 128 352L288 352L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 352L512 352C529.7 352 544 337.7 544 320C544 302.3 529.7 288 512 288L352 288L352 128z"/>
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
                      handleEdit();
                    } else {
                      handleGenerate();
                    }
                  }
                }}
                placeholder={generatedImage ? "Edit your design..." : "Describe your design..."}
                className="flex-1 outline-none bg-white text-[#1d1d1f] placeholder:text-gray-400 autofill:bg-white autofill:text-[#1d1d1f]"
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
                onClick={generatedImage ? handleEdit : handleGenerate}
                disabled={loading || !prompt.trim()}
                className="flex-shrink-0 p-2 rounded-lg bg-gradient-to-r from-[#1d1d1f] to-[#2d2d2f] text-white hover:from-[#2d2d2f] hover:to-[#3d3d3f] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title={generatedImage ? "Apply Edit" : "Generate design"}
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
                    <path d="M568.4 37.7C578.2 34.2 589 36.7 596.4 44C603.8 51.3 606.2 62.2 602.7 72L424.7 568.9C419.7 582.8 406.6 592 391.9 592C377.7 592 364.9 583.4 359.6 570.3L295.4 412.3C290.9 401.3 292.9 388.7 300.6 379.7L395.1 267.3C400.2 261.2 399.8 252.3 394.2 246.7C388.6 241.1 379.6 240.7 373.6 245.8L261.2 340.1C252.1 347.7 239.6 349.7 228.6 345.3L70.1 280.8C57 275.5 48.4 262.7 48.4 248.5C48.4 233.8 57.6 220.7 71.5 215.7L568.4 37.7z"/>
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
        <div className="px-4 pb-4">
          <Tooltip.Provider>
            <div className="flex items-center justify-center relative">
              <div className="inline-flex items-stretch bg-white border border-gray-200 rounded-lg overflow-hidden divide-x divide-gray-200">
                <Menu.Root>
                  <Menu.Trigger
                      disabled={loading || !generatedImage}
                      className="px-3 py-2 text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                          <path d="M210.5 480L333.5 480L398.8 414.7L225.3 241.2L98.6 367.9L210.6 479.9zM256 544L210.5 544C193.5 544 177.2 537.3 165.2 525.3L49 409C38.1 398.1 32 383.4 32 368C32 352.6 38.1 337.9 49 327L295 81C305.9 70.1 320.6 64 336 64C351.4 64 366.1 70.1 377 81L559 263C569.9 273.9 576 288.6 576 304C576 319.4 569.9 334.1 559 345L424 480L544 480C561.7 480 576 494.3 576 512C576 529.7 561.7 544 544 544L256 544z"/>
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

                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <button
                      onClick={handleRetry}
                      disabled={loading || !lastMode || !generatedImage}
                      className="px-3 py-2 text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                        <path d="M552 256L408 256C398.3 256 389.5 250.2 385.8 241.2C382.1 232.2 384.1 221.9 391 215L437.7 168.3C362.4 109.7 253.4 115 184.2 184.2C109.2 259.2 109.2 380.7 184.2 455.7C259.2 530.7 380.7 530.7 455.7 455.7C463.9 447.5 471.2 438.8 477.6 429.6C487.7 415.1 507.7 411.6 522.2 421.7C536.7 431.8 540.2 451.8 530.1 466.3C521.6 478.5 511.9 490.1 501 501C401 601 238.9 601 139 501C39.1 401 39 239 139 139C233.3 44.7 382.7 39.4 483.3 122.8L535 71C541.9 64.1 552.2 62.1 561.2 65.8C570.2 69.5 576 78.3 576 88L576 232C576 245.3 565.3 256 552 256z"/>
                      </svg>
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner>
                      <Tooltip.Popup className="bg-[#1d1d1f] text-white text-sm px-3 py-1.5 rounded-lg">
                        Retry
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>

              {/* Preview Button (3rd from left) */}
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <button
                    onClick={handlePreviewMockup}
                    disabled={loading || mockupLoading || !generatedImage}
                    className="px-3 py-2 text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Preview on T-Shirt"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                      <path d="M320 96C239.2 96 174.5 132.8 127.4 176.6C80.6 220.1 49.3 272 34.4 307.7C31.1 315.6 31.1 324.4 34.4 332.3C49.3 368 80.6 420 127.4 463.4C174.5 507.1 239.2 544 320 544C400.8 544 465.5 507.2 512.6 463.4C559.4 419.9 590.7 368 605.6 332.3C608.9 324.4 608.9 315.6 605.6 307.7C590.7 272 559.4 220 512.6 176.6C465.5 132.9 400.8 96 320 96zM176 320C176 240.5 240.5 176 320 176C399.5 176 464 240.5 464 320C464 399.5 399.5 464 320 464C240.5 464 176 399.5 176 320zM320 256C320 291.3 291.3 320 256 320C244.5 320 233.7 317 224.3 311.6C223.3 322.5 224.2 333.7 227.2 344.8C240.9 396 293.6 426.4 344.8 412.7C396 399 426.4 346.3 412.7 295.1C400.5 249.4 357.2 220.3 311.6 224.3C316.9 233.6 320 244.4 320 256z"/>
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

                {/* Add to Cart moved before Start Over */}
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <button
                      onClick={() => {
                        // TODO: Add to cart functionality
                        console.log('Add to cart clicked');
                      }}
                      disabled={loading || !generatedImage}
                      className="px-3 py-2 text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                        <path d="M0 72C0 58.7 10.7 48 24 48L69.3 48C96.4 48 119.6 67.4 124.4 94L124.8 96L537.5 96C557.5 96 572.6 114.2 568.9 133.9L537.8 299.8C532.1 330.1 505.7 352 474.9 352L171.3 352L176.4 380.3C178.5 391.7 188.4 400 200 400L456 400C469.3 400 480 410.7 480 424C480 437.3 469.3 448 456 448L200.1 448C165.3 448 135.5 423.1 129.3 388.9L77.2 102.6C76.5 98.8 73.2 96 69.3 96L24 96C10.7 96 0 85.3 0 72zM160 528C160 501.5 181.5 480 208 480C234.5 480 256 501.5 256 528C256 554.5 234.5 576 208 576C181.5 576 160 554.5 160 528zM384 528C384 501.5 405.5 480 432 480C458.5 480 480 501.5 480 528C480 554.5 458.5 576 432 576C405.5 576 384 554.5 384 528zM336 142.4C322.7 142.4 312 153.1 312 166.4L312 200L278.4 200C265.1 200 254.4 210.7 254.4 224C254.4 237.3 265.1 248 278.4 248L312 248L312 281.6C312 294.9 322.7 305.6 336 305.6C349.3 305.6 360 294.9 360 281.6L360 248L393.6 248C406.9 248 417.6 237.3 417.6 224C417.6 210.7 406.9 200 393.6 200L360 200L360 166.4C360 153.1 349.3 142.4 336 142.4z"/>
                      </svg>
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner>
                      <Tooltip.Popup className="bg-[#1d1d1f] text-white text-sm px-3 py-1.5 rounded-lg">
                        Add to Cart
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>

                {/* Start Over moved after Add to Cart */}
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <button
                      onClick={() => setShowStartOverDialog(true)}
                      disabled={loading || !generatedImage}
                      className="px-3 py-2 text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none"
                      title="Start Over"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                        <path d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"/>
                      </svg>
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Positioner>
                      <Tooltip.Popup className="bg-[#1d1d1f] text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
                        Start Over
                      </Tooltip.Popup>
                    </Tooltip.Positioner>
                  </Tooltip.Portal>
                </Tooltip.Root>

                <AlertDialog.Root open={showStartOverDialog} onOpenChange={setShowStartOverDialog}>
                  <AlertDialog.Portal>
                    <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
                    <AlertDialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 max-w-md">
                      <AlertDialog.Title className="text-xl font-semibold text-[#1d1d1f] mb-2">
                        Start Over?
                      </AlertDialog.Title>
                      <AlertDialog.Description className="text-gray-600 mb-6">
                        This will clear your current design and all history. This cannot be undone.
                      </AlertDialog.Description>
                      <div className="flex gap-3 justify-end">
                        <AlertDialog.Close className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                          Cancel
                        </AlertDialog.Close>
                        <AlertDialog.Close 
                          onClick={confirmStartOver}
                          className="px-4 py-2 text-sm text-white bg-[#1d1d1f] hover:bg-[#2d2d2f] rounded-lg transition-colors"
                        >
                          Clear & Start Over
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
              </div>
              </div>
            </Tooltip.Provider>
          </div>
      </div>
    </div>
  );
}

