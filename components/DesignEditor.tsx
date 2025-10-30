'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function DesignEditor() {
  const [mode, setMode] = useState<'generate' | 'upload' | 'template'>('generate');
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/designs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio: '1:1' }),
      });

      const data = await response.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setEditingImage(data.imageUrl);
        setMode('generate');
      }
    } catch (error) {
      console.error('Error generating design:', error);
      alert('Failed to generate design');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedImage(result);
        setEditingImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStyleTransfer = async () => {
    if (!uploadedImage || !prompt.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/designs/style-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceImageUrl: uploadedImage,
          prompt,
          aspectRatio: '1:1',
        }),
      });

      const data = await response.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setEditingImage(data.imageUrl);
      }
    } catch (error) {
      console.error('Error in style transfer:', error);
      alert('Failed to generate design in style');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingImage || !editPrompt.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/designs/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: editingImage,
          editPrompt,
          noiseLevel: 0.3,
        }),
      });

      const data = await response.json();
      if (data.imageUrl) {
        setEditingImage(data.imageUrl);
        setGeneratedImage(data.imageUrl);
      }
    } catch (error) {
      console.error('Error editing design:', error);
      alert('Failed to edit design');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!editingImage) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/designs/remove-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: editingImage }),
      });

      const data = await response.json();
      if (data.imageUrl) {
        setEditingImage(data.imageUrl);
        setGeneratedImage(data.imageUrl);
      }
    } catch (error) {
      console.error('Error removing background:', error);
      alert('Failed to remove background');
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = async () => {
    if (!editingImage) return;
    
    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: editingImage,
          title: prompt || 'Custom Design',
          price: '29.99',
        }),
      });

      const data = await response.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel - Controls */}
        <div className="space-y-6">
          {/* Mode Selection */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setMode('generate')}
              className={`px-6 py-3 font-medium transition-all ${
                mode === 'generate' 
                  ? 'border-b-2 border-[#1d1d1f] text-[#1d1d1f]' 
                  : 'text-gray-500 hover:text-[#1d1d1f]'
              }`}
            >
              Generate
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`px-6 py-3 font-medium transition-all ${
                mode === 'upload' 
                  ? 'border-b-2 border-[#1d1d1f] text-[#1d1d1f]' 
                  : 'text-gray-500 hover:text-[#1d1d1f]'
              }`}
            >
              Upload & Style
            </button>
          </div>

          {/* Generate Mode */}
          {mode === 'generate' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Describe your design
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., A minimalist geometric design with bold colors and abstract shapes"
                  className="w-full px-4 py-3 bg-white text-[#1d1d1f] border border-gray-200 rounded-xl resize-none h-32 focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/20 focus:border-[#1d1d1f]/30 transition-all placeholder:text-gray-400"
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="w-full bg-[#1d1d1f] text-white px-6 py-3 rounded-full hover:bg-[#2d2d2f] disabled:opacity-30 disabled:cursor-not-allowed font-medium tracking-tight transition-all"
              >
                {loading ? 'Generating...' : 'Generate Design'}
              </button>
            </div>
          )}

          {/* Upload & Style Mode */}
          {mode === 'upload' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Upload a design
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full px-4 py-3 bg-white text-[#1d1d1f] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/20 focus:border-[#1d1d1f]/30 transition-all"
                />
                {uploadedImage && (
                  <div className="mt-4 relative aspect-square w-full rounded-2xl overflow-hidden border border-gray-200">
                    <Image
                      src={uploadedImage}
                      alt="Uploaded design"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Describe the new design
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Create a similar design but with different colors and elements"
                  className="w-full px-4 py-3 bg-white text-[#1d1d1f] border border-gray-200 rounded-xl resize-none h-32 focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/20 focus:border-[#1d1d1f]/30 transition-all placeholder:text-gray-400"
                />
              </div>
              <button
                onClick={handleStyleTransfer}
                disabled={loading || !uploadedImage || !prompt.trim()}
                className="w-full bg-[#1d1d1f] text-white px-6 py-3 rounded-full hover:bg-[#2d2d2f] disabled:opacity-30 disabled:cursor-not-allowed font-medium tracking-tight transition-all"
              >
                {loading ? 'Generating...' : 'Create Design in Same Style'}
              </button>
            </div>
          )}

          {/* Editing Controls */}
          {editingImage && (
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h3 className="font-semibold">Edit Design</h3>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Edit prompt
                </label>
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="e.g., Make it more vibrant, change the colors to blue and white"
                  className="w-full px-4 py-3 bg-white text-[#1d1d1f] border border-gray-200 rounded-xl resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/20 focus:border-[#1d1d1f]/30 transition-all placeholder:text-gray-400"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleEdit}
                  disabled={loading || !editPrompt.trim()}
                  className="flex-1 bg-gray-100 px-4 py-3 rounded-full hover:bg-gray-200 disabled:opacity-30 font-medium text-[#1d1d1f] transition-all"
                >
                  Apply Edit
                </button>
                <button
                  onClick={handleRemoveBackground}
                  disabled={loading}
                  className="flex-1 bg-gray-100 px-4 py-3 rounded-full hover:bg-gray-200 disabled:opacity-30 font-medium text-[#1d1d1f] transition-all"
                >
                  Remove BG
                </button>
              </div>
              <button
                onClick={handleOrder}
                disabled={loading}
                className="w-full bg-[#007aff] text-white px-6 py-3 rounded-full hover:bg-[#0051d5] disabled:opacity-50 font-medium tracking-tight transition-all"
              >
                Order on T-Shirt
              </button>
            </div>
          )}
        </div>

        {/* Right Panel - Preview */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Preview</h2>
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
            {editingImage ? (
              <Image
                src={editingImage}
                alt="Design preview"
                fill
                className="object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                {loading ? 'Processing...' : 'Your design will appear here'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
