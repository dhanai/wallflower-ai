'use client';

import { Tldraw, useEditor, useValue, track, createShapeId, TLAssetId, TLShapeId, toRichText } from 'tldraw';
import 'tldraw/tldraw.css';
import React, { useState, useCallback, useEffect, useMemo, useReducer } from 'react';
import { useToast } from '@/hooks/useToast';
import { useSearchParams } from 'next/navigation';
import { Tooltip } from '@base-ui-components/react/tooltip';
import { Menu } from '@base-ui-components/react/menu';
import { AlertDialog } from '@base-ui-components/react/alert-dialog';
import CollectionModal from '@/components/CollectionModal';
import { useRouter } from 'next/navigation';
import { KText } from '@/shapes/KText'
import { KArcTextUtil } from '@/shapes/KArcText';
import { insertKText } from '@/utils/insertKText';
import { addTextAtCenter } from '@/utils/addTextAtCenter';
import { insertKArcText } from '@/shapes/KArcText';

const models = [
  { label: 'Gemini 2.5 Flash', value: 'gemini-25' },
  { label: 'Recraft V3', value: 'recraft-v3' },
  { label: 'Seedream V4', value: 'seedream-v4' },
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
];

const recraftStyles = [
  { label: 'No Style', value: '' },
  { label: 'Realistic Image', value: 'realistic_image' },
  { label: 'Digital Illustration', value: 'digital_illustration' },
  { label: 'Vector Illustration', value: 'vector_illustration' },
  { label: 'Pixel Art', value: 'digital_illustration/pixel_art' },
  { label: 'Hand Drawn', value: 'digital_illustration/hand_drawn' },
  { label: 'Pop Art', value: 'digital_illustration/pop_art' },
  { label: 'Pastel Gradient', value: 'digital_illustration/pastel_gradient' },
  { label: 'Bold Stroke', value: 'vector_illustration/bold_stroke' },
  { label: 'Line Art', value: 'vector_illustration/line_art' },
];

// 4:5 aspect ratio artboard
const ARTBOARD_WIDTH = 800;
const ARTBOARD_HEIGHT = 1000;

// Artboard helpers - module-level IDs we reuse
let ARTBOARD_FRAME_ID: TLShapeId | null = null;
let ARTBOARD_BG_ID: TLShapeId | null = null;

function makeSolidColorDataUrl(hex: string, w = ARTBOARD_WIDTH, h = ARTBOARD_HEIGHT) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, w, h);
  return c.toDataURL('image/png');
}

/** Create (or return) a single frame + locked bg image inside it */
function ensureArtboard(editor: ReturnType<typeof useEditor>, bgHex: string) {
  if (!ARTBOARD_FRAME_ID) {
    // center the frame
    const vp = editor.getViewportPageBounds();
    const x = vp.x + vp.width / 2 - ARTBOARD_WIDTH / 2;
    const y = vp.y + vp.height / 2 - ARTBOARD_HEIGHT / 2;

    const frameId = createShapeId();
    editor.createShapes([{
      id: frameId,
      type: 'frame',
      x, y,
      props: { w: ARTBOARD_WIDTH, h: ARTBOARD_HEIGHT, name: 'Artboard' }
    }]);
    ARTBOARD_FRAME_ID = frameId;
  }

  // (re)create bg shape if missing
  if (!ARTBOARD_BG_ID) {
    const frame = editor.getShape(ARTBOARD_FRAME_ID!) as any;
    if (!frame) return;

    const src = makeSolidColorDataUrl(bgHex);

    const assetId = `asset:${crypto.randomUUID()}` as TLAssetId;
    editor.createAssets([{
      id: assetId,
      typeName: 'asset',
      type: 'image',
      meta: {},
      props: { w: ARTBOARD_WIDTH, h: ARTBOARD_HEIGHT, mimeType: 'image/png', name: 'Background', src, isAnimated: false }
    }]);

    const bgId = createShapeId();
    editor.createShapes([{
      id: bgId,
      type: 'image',
      parentId: ARTBOARD_FRAME_ID!,   // clip to frame
      isLocked: true,                 // users can't grab it
      x: 0,                           // relative to frame (top-left)
      y: 0,
      props: { w: ARTBOARD_WIDTH, h: ARTBOARD_HEIGHT, assetId }
    }]);

    // ensure it's behind everything inside frame
    editor.sendToBack([bgId]);
    ARTBOARD_BG_ID = bgId;

    // zoom to the frame once
    editor.setSelectedShapes([ARTBOARD_FRAME_ID!]);
    editor.zoomToSelection();
  }
}

/** Update bg color without adding shapes */
function setArtboardBackground(editor: ReturnType<typeof useEditor>, hex: string) {
  if (!ARTBOARD_BG_ID) return;
  const src = makeSolidColorDataUrl(hex);
  const bg = editor.getShape(ARTBOARD_BG_ID) as any;
  if (!bg) return;

  const assetId = bg.props.assetId as TLAssetId;
  editor.updateAssets([{
    id: assetId,
    typeName: 'asset',
    type: 'image',
    props: { w: ARTBOARD_WIDTH, h: ARTBOARD_HEIGHT, mimeType: 'image/png', name: 'Background', src, isAnimated: false }
  }]);
}

/** Keep bg pinned to the frame even if the frame moves/resizes */
function pinBgToFrame(editor: ReturnType<typeof useEditor>) {
  if (!ARTBOARD_FRAME_ID || !ARTBOARD_BG_ID) return;
  const frame = editor.getShape(ARTBOARD_FRAME_ID) as any;
  const bg = editor.getShape(ARTBOARD_BG_ID) as any;
  if (!frame || !bg) return;

  // Since bg is a child of frame, coordinates should be relative (0, 0)
  // and dimensions should match the frame
  if (bg.x !== 0 || bg.y !== 0 || bg.props.w !== frame.props.w || bg.props.h !== frame.props.h) {
    editor.updateShapes([{
      id: ARTBOARD_BG_ID,
      type: 'image',
      x: 0,  // relative to frame
      y: 0,  // relative to frame
      props: { ...bg.props, w: frame.props.w, h: frame.props.h }
    }]);
  }
}

// Helper function to create image shape from URL
function createImageShapeFromUrl(editor: ReturnType<typeof useEditor>, imageUrl: string, x: number, y: number, width = ARTBOARD_WIDTH, height = ARTBOARD_HEIGHT, parentId?: TLShapeId | null) {
  const assetId = `asset:${crypto.randomUUID()}` as TLAssetId;
  
  editor.createAssets([{
    id: assetId,
    typeName: 'asset',
    type: 'image',
    meta: {},
    props: {
      w: width,
      h: height,
      name: 'Generated Design',
      mimeType: 'image/png',
      src: imageUrl,
      isAnimated: false,
    },
  }]);
  
  const shapeId = createShapeId();
  editor.createShapes([{
    id: shapeId,
    type: 'image',
    ...(parentId ? { parentId } : {}),
    x,
    y,
    props: {
      w: width,
      h: height,
      assetId: assetId,
    },
  }]);
  
  return shapeId;
}

// Safe getter so subcomponents don't explode during first render
function useEditorSafe() {
  try {
    return useEditor();
  } catch {
    return undefined;
  }
}

// 1) Non-destructive image swap
function swapImageOnShape(
  editor: ReturnType<typeof useEditor>,
  shapeId: TLShapeId,
  newImageUrl: string,
  nextSize?: { w: number; h: number }
) {
  const img = editor.getShape(shapeId) as any;
  if (!img) return;

  // Reuse the same asset id if present, otherwise create one.
  const assetId = (img.props?.assetId as TLAssetId) ?? (`asset:${crypto.randomUUID()}` as TLAssetId);

  // Create or update asset
  const existing = editor.getAsset(assetId as TLAssetId) as any;
  if (existing) {
    editor.updateAssets([{
      id: assetId,
      typeName: 'asset',
      type: 'image',
      props: {
        ...existing.props,
        src: newImageUrl,
        name: existing.props?.name ?? 'Image',
        isAnimated: false
      }
    }]);
  } else {
    editor.createAssets([{
      id: assetId,
      typeName: 'asset',
      type: 'image',
      meta: {},
      props: {
        w: nextSize?.w ?? (img.props?.w ?? ARTBOARD_WIDTH),
        h: nextSize?.h ?? (img.props?.h ?? ARTBOARD_HEIGHT),
        name: 'Image',
        mimeType: 'image/png',
        src: newImageUrl,
        isAnimated: false
      }
    }]);
  }

  // Update the same shape to point at the new asset & optional size
  editor.updateShapes([{
    id: shapeId,
    type: 'image',
    x: img.x,
    y: img.y,
    props: {
      ...img.props,
      assetId,
      ...(nextSize ? { w: nextSize.w, h: nextSize.h } : {})
    }
  }]);
}

// 4) Alignment helpers
function getBounds(editor: any, shape: any) {
  const w = shape?.props?.w ?? 0;
  const h = shape?.props?.h ?? 0;
  return { x: shape.x, y: shape.y, w, h, cx: shape.x + w/2, cy: shape.y + h/2 };
}

function alignSelected(editor: any, mode: 'left'|'center'|'right'|'top'|'middle'|'bottom', frameId: TLShapeId) {
  const ids = editor.getSelectedShapeIds();
  if (ids.length === 0) return;
  const frame = editor.getShape(frameId) as any;
  const fw = frame.props.w, fh = frame.props.h;

  editor.updateShapes(ids.map((id: TLShapeId) => {
    const s = editor.getShape(id) as any;
    const b = getBounds(editor, s);
    let x = s.x, y = s.y;
    
    // If shape is a child of frame, use relative coordinates (0-based)
    const isChild = s.parentId === frameId;
    if (isChild) {
      if (mode === 'left')   x = 0;
      if (mode === 'center') x = (fw - b.w) / 2;
      if (mode === 'right')  x = fw - b.w;
      if (mode === 'top')    y = 0;
      if (mode === 'middle') y = (fh - b.h) / 2;
      if (mode === 'bottom') y = fh - b.h;
    } else {
      // Absolute coordinates
      const fx = frame.x, fy = frame.y;
      if (mode === 'left')   x = fx;
      if (mode === 'center') x = fx + (fw - b.w) / 2;
      if (mode === 'right')  x = fx + fw - b.w;
      if (mode === 'top')    y = fy;
      if (mode === 'middle') y = fy + (fh - b.h) / 2;
      if (mode === 'bottom') y = fy + fh - b.h;
    }
    return { id, type: s.type, x, y };
  }));
}

function distributeHoriz(editor: any) {
  const ids = editor.getSelectedShapeIds();
  if (ids.length < 3) return;
  const shapes = ids.map((id: TLShapeId) => editor.getShape(id) as any);
  const sorted = shapes.sort((a: any, b: any) => a.x - b.x);
  const first = sorted[0], last = sorted[sorted.length-1];
  const totalWidth = sorted.reduce((sum: number, s: any) => sum + (s.props?.w ?? 0), 0);
  const span = (last.x + (last.props?.w ?? 0)) - first.x;
  const gap = (span - totalWidth) / (sorted.length - 1);
  let cursor = first.x + (first.props?.w ?? 0);

  const updates = sorted.slice(1, -1).map((s: any) => {
    const x = Math.round(cursor + gap);
    cursor = x + (s.props?.w ?? 0);
    return { id: s.id, type: s.type, x, y: s.y };
  });
  editor.updateShapes(updates);
}

// 7) Export artboard PNG
async function exportArtboardPng(editor: ReturnType<typeof useEditor>, frameId: TLShapeId, backgroundColor: string) {
  const frame = editor.getShape(frameId) as any;
  if (!frame) return;

  const { w, h } = frame.props;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;

  // Fill with artboard bg
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, w, h);

  // Collect children (images/text) in z-order
  const children = Array.from(editor.getPageShapeIds(editor.getCurrentPageId()))
    .map(id => editor.getShape(id) as any)
    .filter(s => s?.parentId === frameId && s?.type !== 'frame');

  // Draw images
  for (const s of children) {
    if (s.type === 'image' && s.props?.assetId) {
      const asset = editor.getAsset(s.props.assetId as TLAssetId) as any;
      if (!asset?.props?.src) continue;
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, Math.round(s.x - frame.x), Math.round(s.y - frame.y), s.props.w, s.props.h);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = asset.props.src;
      });
    }
  }

  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'artboard.png';
  a.click();
}

// Main component
export default function CanvasEditorTldraw({
  embedded = false,
  userRole = null,
}: {
  embedded?: boolean;
  userRole?: string | null;
} = {}) {
  // Shared state for all components
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [editor, setEditor] = useState<ReturnType<typeof useEditor> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDesign, setLoadingDesign] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-25');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentImageShapeId, setCurrentImageShapeId] = useState<TLShapeId | null>(null);
  const [lastPrompt, setLastPrompt] = useState('');
  const [lastMode, setLastMode] = useState<'generate' | 'edit' | null>(null);
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);
  const [designLoaded, setDesignLoaded] = useState(false);
  const [hotspotMode, setHotspotMode] = useState(false);
  const [hotspot, setHotspot] = useState<{ x: number; y: number } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteDesignConfirm, setShowDeleteDesignConfirm] = useState(false);
  const [currentIterationId, setCurrentIterationId] = useState<string | null>(null);
  const [iterationIds, setIterationIds] = useState<(string | null)[]>([]);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load design from URL parameter (v1 logic)
  useEffect(() => {
    if (!mounted || !editor || designLoaded) return;

    async function loadDesign() {
      const designId = searchParams?.get('design');
      const templateId = searchParams?.get('template');
      
      // If both parameters were removed from URL, clear workspace
      if (!designId && !templateId && currentDesignId) {
        // Clear canvas shapes
        if (editor) {
          const allShapeIds = editor.getPageShapeIds(editor.getCurrentPageId());
          if (allShapeIds.size > 0) {
            editor.deleteShapes(Array.from(allShapeIds));
          }
        }
        setImageHistory([]);
        setHistoryIndex(-1);
        setCurrentImageShapeId(null);
        setCurrentDesignId(null);
        setDesignLoaded(true); // Mark as loaded so we don't try to load again
        return;
      }
      
      // If no design ID or template ID, mark as loaded so empty artboard can be created
      if (!designId && !templateId) {
        setDesignLoaded(true);
        return;
      }
      
      // Handle template copying
      if (templateId) {
        if (templateId === currentDesignId) return;

        setLoadingDesign(true);
        try {
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
            toast.error('Failed to create design from template');
            return;
          }

          setCurrentDesignId(newDesign.id);
          
          // Use thumbnail_image_url if it exists and is different (it's the final saved iteration)
          // Otherwise use image_url
          const imageToUse = newDesign.thumbnail_image_url && 
                            newDesign.thumbnail_image_url !== newDesign.image_url
                            ? newDesign.thumbnail_image_url
                            : newDesign.image_url;
          
          const history = [imageToUse];
          setImageHistory(history);
          setHistoryIndex(0);

        // Load the image into tldraw
        if (editor) {
          // Clear all existing shapes first
          const allShapeIds = editor.getPageShapeIds(editor.getCurrentPageId());
          if (allShapeIds.size > 0) {
            editor.deleteShapes(Array.from(allShapeIds));
          }
          
          // Reset module-level artboard IDs for new design
          ARTBOARD_FRAME_ID = null;
          ARTBOARD_BG_ID = null;
          
          // Ensure artboard exists first
          ensureArtboard(editor, backgroundColor);
          
          // Create image inside the frame (coordinates are relative to frame)
          const shapeId = createImageShapeFromUrl(
            editor,
            imageToUse, // Use the correct image (prefer thumbnail if different)
            0, // x relative to frame
            0, // y relative to frame
            ARTBOARD_WIDTH,
            ARTBOARD_HEIGHT,
            ARTBOARD_FRAME_ID // parent to frame
          );
          setCurrentImageShapeId(shapeId);
          
          // Lock the image to prevent accidental deletion/movement
          const s = editor.getShape(shapeId);
          if (s && !s.isLocked) {
            editor.updateShapes([{ id: shapeId, type: 'image', isLocked: true }]);
          }
          
          // Send image to back so text appears above it
          editor.sendToBack([shapeId]);
          
          editor.setSelectedShapes([shapeId]);
          editor.zoomToSelection();
        }
          
        toast.success('Template copied to your designs!');
        } catch (error) {
          console.error('Error copying template:', error);
          toast.error('Failed to copy template');
        } finally {
          setLoadingDesign(false);
          setDesignLoaded(true);
        }
        return;
      }
      
      // Handle regular design loading
      if (designId === currentDesignId) return;

      setLoadingDesign(true);
      try {
        const response = await fetch(`/api/designs/load?designId=${designId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error loading design:', errorData);
          if (response.status === 404) {
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

        setCurrentDesignId(designData.id);

        // Build image history: [design image, ...variations]
        const history = [designData.image_url];
        if (variations && Array.isArray(variations) && variations.length > 0) {
          history.push(...variations.map((v: any) => v.image_url));
        }

        setImageHistory(history);
        
        // Find the index of the thumbnail_image_url if it exists
        // Priority: thumbnail_image_url > design.image_url (index 0) > latest variation
        let initialIndex = 0; // Default to design.image_url (index 0)
        if (designData.thumbnail_image_url) {
          const thumbnailIndex = history.findIndex(url => url === designData.thumbnail_image_url);
          if (thumbnailIndex >= 0) {
            initialIndex = thumbnailIndex;
          } else {
            // If thumbnail doesn't match, check if it matches design.image_url
            // Otherwise stick with index 0 (design.image_url)
            if (designData.thumbnail_image_url === designData.image_url) {
              initialIndex = 0;
            }
          }
        }
        
        setHistoryIndex(initialIndex);

        // Load the image into tldraw
        if (editor) {
          // Clear all existing shapes first
          const allShapeIds = editor.getPageShapeIds(editor.getCurrentPageId());
          if (allShapeIds.size > 0) {
            editor.deleteShapes(Array.from(allShapeIds));
          }
          
          // Reset module-level artboard IDs for new design
          ARTBOARD_FRAME_ID = null;
          ARTBOARD_BG_ID = null;
          
          // Ensure artboard exists first
          ensureArtboard(editor, backgroundColor);
          
          // Create image inside the frame (coordinates are relative to frame)
          const shapeId = createImageShapeFromUrl(
            editor,
            history[initialIndex],
            0, // x relative to frame (centered)
            0, // y relative to frame (centered)
            ARTBOARD_WIDTH,
            ARTBOARD_HEIGHT,
            ARTBOARD_FRAME_ID // parent to frame
          );
          setCurrentImageShapeId(shapeId);
          
          // Lock the image to prevent accidental deletion/movement
          const s = editor.getShape(shapeId);
          if (s && !s.isLocked) {
            editor.updateShapes([{ id: shapeId, type: 'image', isLocked: true }]);
          }
          
          // Send image to back so text appears above it
          editor.sendToBack([shapeId]);
          
          editor.setSelectedShapes([shapeId]);
          editor.zoomToSelection();
        }

      } catch (error) {
        console.error('Error loading design:', error);
        setCurrentDesignId(null);
      } finally {
        setLoadingDesign(false);
        setDesignLoaded(true);
      }
    }

    loadDesign();
  }, [mounted, editor, designLoaded, searchParams, currentDesignId, toast]);

  // Create empty artboard when there's no design loaded
  useEffect(() => {
    if (!editor || !designLoaded || loadingDesign) return;
    if (imageHistory.length === 0 && !currentDesignId) {
      ensureArtboard(editor, backgroundColor);
    }
  }, [editor, designLoaded, loadingDesign, imageHistory.length, currentDesignId, backgroundColor]);

  // Update artboard background color when backgroundColor changes
  useEffect(() => {
    if (!editor) return;
    setArtboardBackground(editor, backgroundColor);
  }, [editor, backgroundColor]);

  const hasImage = historyIndex >= 0 && imageHistory.length > 0;

  const handleAddText = useCallback(() => {
    if (!editor) return;
    
    // Find or create the frame
    let frameId = ARTBOARD_FRAME_ID;
    
    // If no frame ID set, try to find existing frames
    if (!frameId) {
      const allShapes = editor.getPageShapeIds(editor.getCurrentPageId());
      const frames = Array.from(allShapes)
        .map(id => editor.getShape(id))
        .filter((s: any) => s?.type === 'frame');
      if (frames.length > 0) {
        frameId = (frames[0] as any).id;
        ARTBOARD_FRAME_ID = frameId;
      } else {
        // Only create if no frames exist AND no image exists
        // If an image exists without a frame, we should parent it to a new frame instead
        const hasExistingImage = currentImageShapeId && editor.getShape(currentImageShapeId);
        if (!hasExistingImage) {
          ensureArtboard(editor, backgroundColor);
          frameId = ARTBOARD_FRAME_ID;
        }
      }
    }
    
    // Create KText shape with full Kittl-style features
    const shapeId = insertKText(editor, {
      text: 'Your text here',
      sizePx: 96,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: 700,
      fill: '#111111',
      align: 'middle',
      curved: false,
      parentId: frameId || undefined,
    });
    
    // Select and zoom to the new text
    if (shapeId) {
      // Bring text to front to ensure it's visible above images
      editor.bringToFront([shapeId]);
      editor.setSelectedShapes([shapeId]);
      editor.zoomToSelection();
      // Focus the editor so user can start typing
      editor.focus();
      // Enter edit mode after a brief delay
      requestAnimationFrame(() => {
        editor.setEditingShape(shapeId);
      });
    }
  }, [editor, backgroundColor, currentImageShapeId]);

  const handleAddArcText = useCallback(() => {
    if (!editor) return;
    
    // Find or create the frame
    let frameId = ARTBOARD_FRAME_ID;
    
    // If no frame ID set, try to find existing frames
    if (!frameId) {
      const allShapes = editor.getPageShapeIds(editor.getCurrentPageId());
      const frames = Array.from(allShapes)
        .map(id => editor.getShape(id))
        .filter((s: any) => s?.type === 'frame');
      if (frames.length > 0) {
        frameId = (frames[0] as any).id;
        ARTBOARD_FRAME_ID = frameId;
      } else {
        const hasExistingImage = currentImageShapeId && editor.getShape(currentImageShapeId);
        if (!hasExistingImage) {
          ensureArtboard(editor, backgroundColor);
          frameId = ARTBOARD_FRAME_ID;
        }
      }
    }
    
    insertKArcText(editor, { frameId, text: 'Your text here' });
  }, [editor, backgroundColor, currentImageShapeId]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-neutral-50">
      <div className="grid grid-cols-[1fr_340px] h-full">
        {/* Center stage (canvas area) - infinite canvas */}
        <div className="relative">
          <StageBackground />
          <EditorCanvas
            setEditor={setEditor}
            backgroundColor={backgroundColor}
            hotspotMode={hotspotMode}
            setHotspot={setHotspot}
          />
          {/* Floating alignment bar */}
          <AlignBar />
          {/* Floating iteration controls */}
          {hasImage && imageHistory.length > 1 && (
            <IterationControls
              historyIndex={historyIndex}
              imageHistory={imageHistory}
              setHistoryIndex={setHistoryIndex}
              loading={loading}
              currentImageShapeId={currentImageShapeId}
              setCurrentImageShapeId={setCurrentImageShapeId}
              editor={editor}
            />
          )}
          {/* Floating bottom dock - overlays canvas */}
          <div className="absolute bottom-0 left-0 right-0 z-50">
            <PromptDock
              userRole={userRole}
              editor={editor}
              prompt={prompt}
              setPrompt={setPrompt}
              loading={loading}
              setLoading={setLoading}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              selectedStyle={selectedStyle}
              setSelectedStyle={setSelectedStyle}
              backgroundColor={backgroundColor}
              setBackgroundColor={setBackgroundColor}
              imageHistory={imageHistory}
              setImageHistory={setImageHistory}
              historyIndex={historyIndex}
              setHistoryIndex={setHistoryIndex}
              currentImageShapeId={currentImageShapeId}
              setCurrentImageShapeId={setCurrentImageShapeId}
              lastPrompt={lastPrompt}
              setLastPrompt={setLastPrompt}
              lastMode={lastMode}
              setLastMode={setLastMode}
              hotspotMode={hotspotMode}
              setHotspotMode={setHotspotMode}
              hotspot={hotspot}
              setHotspot={setHotspot}
              showPreviewModal={showPreviewModal}
              setShowPreviewModal={setShowPreviewModal}
              previewLoading={previewLoading}
              setPreviewLoading={setPreviewLoading}
              previewImageUrl={previewImageUrl}
              setPreviewImageUrl={setPreviewImageUrl}
              showDeleteDialog={showDeleteDialog}
              setShowDeleteDialog={setShowDeleteDialog}
              showDeleteDesignConfirm={showDeleteDesignConfirm}
              setShowDeleteDesignConfirm={setShowDeleteDesignConfirm}
              currentIterationId={currentIterationId}
              setCurrentIterationId={setCurrentIterationId}
              iterationIds={iterationIds}
              setIterationIds={setIterationIds}
              currentDesignId={currentDesignId}
              setCurrentDesignId={setCurrentDesignId}
              showCollectionModal={showCollectionModal}
              setShowCollectionModal={setShowCollectionModal}
              router={router}
              toast={toast}
              handleAddText={handleAddText}
              handleAddArcText={handleAddArcText}
              hasImage={hasImage}
              frameId={ARTBOARD_FRAME_ID}
            />
          </div>
        </div>

        {/* Right rail - full height */}
        <div className="h-screen border-l bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 overflow-hidden">
          <RightRailTabbed
            backgroundColor={backgroundColor}
            setBackgroundColor={setBackgroundColor}
            loading={loading}
            editor={editor}
          />
        </div>
      </div>
    </div>
  );
}

// 2) Layers Panel
function LayersPanel({ frameId }: { frameId: TLShapeId | null }) {
  const editor = useEditorSafe();
  const [, force] = React.useReducer(x => x + 1, 0);

  useEffect(() => {
    if (!editor) return;
    const unsub = editor.store.listen(() => force());
    return () => {
      if (unsub) unsub();
    };
  }, [editor]);

  if (!editor || !frameId) return null;

  const shapes = Array.from(editor.getPageShapeIds(editor.getCurrentPageId()))
    .map(id => editor.getShape(id) as any)
    .filter(s => s?.parentId === frameId && s?.type !== 'frame'); // only items in artboard

  const onRename = (id: TLShapeId, name: string) => {
    const shape = editor.getShape(id) as any;
    if (!shape) return;
    editor.updateShapes([{ id, type: shape.type, props: { ...shape.props, name } }]);
  };

  const toggleLock = (id: TLShapeId) => {
    const shape = editor.getShape(id) as any;
    editor.updateShapes([{ id, type: shape.type, isLocked: !shape.isLocked }]);
  };

  return (
    <div className="p-3 border-t">
      <div className="text-sm font-medium mb-2">Layers</div>
      <div className="space-y-1">
        {shapes.map(s => (
          <div key={s.id} className="flex items-center gap-2 group">
            <button
              className="text-xs px-2 py-1 rounded hover:bg-gray-100"
              onClick={() => editor.setSelectedShapes([s.id])}
              title="Select"
            >
              {s.props?.name ?? s.type}
            </button>
            <input
              className="text-xs border rounded px-1 py-0.5 flex-1"
              defaultValue={s.props?.name ?? ''}
              onBlur={(e) => onRename(s.id, e.currentTarget.value)}
            />
            <button className="text-xs px-1 py-0.5 rounded hover:bg-gray-100"
              onClick={() => editor.bringToFront([s.id])}
              title="Bring to front">⤴︎</button>
            <button className="text-xs px-1 py-0.5 rounded hover:bg-gray-100"
              onClick={() => editor.sendToBack([s.id])}
              title="Send to back">⤵︎</button>
            <button className="text-xs px-1 py-0.5 rounded hover:bg-gray-100"
              onClick={() => toggleLock(s.id)}
              title={s.isLocked ? 'Unlock' : 'Lock'}>{s.isLocked ? '🔒' : '🔓'}</button>
            <button className="text-xs px-1 py-0.5 rounded hover:bg-red-50"
              onClick={() => editor.deleteShapes([s.id])}
              title="Delete">🗑</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3) Text Inspector - wrapped with track for automatic reactivity
const TextInspector = track(function TextInspector({ editor: editorProp }: { editor?: ReturnType<typeof useEditor> | null }) {
  const contextEditor = useEditorSafe();
  const editor = editorProp || contextEditor;
  if (!editor) return null;

  // Use editor directly - track will handle reactivity
  const id = editor.getSelectedShapeIds()[0];
  const sel = id ? (editor.getShape(id) as any) : null;
  const isText = sel?.type === 'text';

  if (!isText) return null;

  const update = (newProps: any) => {
    editor.updateShapes([{ id: sel.id, type: 'text', props: { ...sel.props, ...newProps } }]);
  };

  // Robust richText → string
  const getPlainText = (richText: any): string => {
    if (!richText) return '';
    if (typeof richText === 'string') return richText;
    if (richText.text) return richText.text;
    if (Array.isArray(richText)) return richText.map((n: any) => n.text || '').join('');
    return '';
  };

  const currentText = getPlainText(sel.props.richText);

  return (
    <div className="p-3 border-t space-y-2">
      <div className="text-sm font-medium">Text</div>
      <input
        className="w-full border rounded px-2 py-1 text-sm"
        value={currentText}
        onChange={(e) => update({ richText: toRichText(e.target.value) })}
      />
      <div className="flex gap-2">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={sel.props.font ?? 'draw'}
          onChange={(e) => update({ font: e.target.value })}
        >
          <option value="draw">Hand</option>
          <option value="sans">Sans</option>
          <option value="serif">Serif</option>
          <option value="mono">Mono</option>
        </select>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={sel.props.size ?? 'm'}
          onChange={(e) => update({ size: e.target.value })}
          title="Font size"
        >
          <option value="s">Small</option>
          <option value="m">Medium</option>
          <option value="l">Large</option>
          <option value="xl">Extra Large</option>
        </select>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={sel.props.textAlign ?? 'start'}
          onChange={(e) => update({ textAlign: e.target.value })}
          title="Align"
        >
          <option value="start">Left</option>
          <option value="middle">Center</option>
          <option value="end">Right</option>
        </select>
      </div>
    </div>
  );
});

// KText Inspector (Kittl-style typography) - wrapped with track for automatic reactivity
const KTextInspector = track(function KTextInspector({ editor: editorProp }: { editor?: ReturnType<typeof useEditor> | null }) {
  const contextEditor = useEditorSafe();
  const editor = editorProp || contextEditor;
  if (!editor) return null;

  // Use editor directly - track will handle reactivity
  const selected = editor.getSelectedShapes().filter((s: any) => s.type === 'ktext');
  const shape = selected.length > 0 ? selected[0] : null;

  if (!shape) return null;

  const p = shape.props as any; // KText props

  const update = (props: Partial<typeof p>) => {
    editor.updateShapes([{ id: shape.id, type: 'ktext', props: { ...p, ...props } }]);
  };

  const commonFonts = [
    'Inter, system-ui, sans-serif',
    'Arial, sans-serif',
    'Helvetica, sans-serif',
    'Georgia, serif',
    'Times New Roman, serif',
    'Courier New, monospace',
    'Verdana, sans-serif',
    'Comic Sans MS, cursive',
    'Impact, fantasy',
    'Trebuchet MS, sans-serif',
  ];

  return (
    <div className="p-4 space-y-4 overflow-auto">
      <div>
        <h4 className="font-semibold text-sm mb-3">Text Content</h4>
        <textarea
          value={p.text}
          onChange={(e) => update({ text: e.target.value })}
          className="w-full border rounded px-2 py-2 text-sm min-h-[60px] resize-none"
          placeholder="Enter text..."
        />
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-3">Typography</h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-700">Font Family</label>
            <select
              value={p.fontFamily}
              onChange={(e) => update({ fontFamily: e.target.value })}
              className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {commonFonts.map((font) => (
                <option key={font} value={font}>{font.split(',')[0]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-700">Weight</label>
            <select
              value={p.fontWeight}
              onChange={(e) => update({ fontWeight: +e.target.value })}
              className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value={100}>Thin (100)</option>
              <option value={200}>Extra Light (200)</option>
              <option value={300}>Light (300)</option>
              <option value={400}>Normal (400)</option>
              <option value={500}>Medium (500)</option>
              <option value={600}>Semi Bold (600)</option>
              <option value={700}>Bold (700)</option>
              <option value={800}>Extra Bold (800)</option>
              <option value={900}>Black (900)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-700">Size</label>
            <input
              type="number"
              min={8}
              max={500}
              value={p.sizePx}
              onChange={(e) => update({ sizePx: Math.max(8, Math.min(500, +e.target.value)) })}
              className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-700">Letter Spacing</label>
            <input
              type="number"
              step={0.5}
              value={p.letterSpacing}
              onChange={(e) => update({ letterSpacing: +e.target.value })}
              className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-700">Line Height</label>
            <input
              type="number"
              step={0.05}
              min={0.5}
              max={3}
              value={p.lineHeight}
              onChange={(e) => update({ lineHeight: +e.target.value })}
              className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5 text-gray-700">Alignment</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => update({ align: 'start' })}
              className={`px-3 py-2 border rounded text-sm transition-colors ${
                p.align === 'start' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'hover:bg-gray-50'
              }`}
            >
              Left
            </button>
            <button
              onClick={() => update({ align: 'middle' })}
              className={`px-3 py-2 border rounded text-sm transition-colors ${
                p.align === 'middle' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'hover:bg-gray-50'
              }`}
            >
              Center
            </button>
            <button
              onClick={() => update({ align: 'end' })}
              className={`px-3 py-2 border rounded text-sm transition-colors ${
                p.align === 'end' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'hover:bg-gray-50'
              }`}
            >
              Right
            </button>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-3 text-gray-900">Fill & Stroke</h4>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Fill Color</label>
              <button
                onClick={() => update({ gradient: p.gradient ? undefined : { from: '#ff6b6b', to: '#1dd3b0', angle: 0 } })}
                className={`text-xs px-2 py-1 rounded ${p.gradient ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {p.gradient ? 'Gradient' : 'Solid'}
              </button>
            </div>
            {p.gradient ? (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs mb-1 text-gray-600">From</label>
                  <input
                    type="color"
                    value={p.gradient.from}
                    onChange={(e) => update({ gradient: { ...p.gradient!, from: e.target.value } })}
                    className="w-full h-8 border rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-600">To</label>
                  <input
                    type="color"
                    value={p.gradient.to}
                    onChange={(e) => update({ gradient: { ...p.gradient!, to: e.target.value } })}
                    className="w-full h-8 border rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-600">Angle</label>
                  <input
                    type="number"
                    value={p.gradient.angle}
                    onChange={(e) => update({ gradient: { ...p.gradient!, angle: +e.target.value } })}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            ) : (
              <input
                type="color"
                value={p.fill}
                onChange={(e) => update({ fill: e.target.value })}
                className="w-full h-10 border rounded cursor-pointer"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700">Stroke Color</label>
              <input
                type="color"
                value={p.stroke ?? '#000000'}
                onChange={(e) => update({ stroke: e.target.value })}
                className="w-full h-10 border rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700">Stroke Width</label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={p.strokeWidth ?? 0}
                onChange={(e) => update({ strokeWidth: +e.target.value })}
                className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-3 text-gray-900">Shadow</h4>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700">Offset X</label>
              <input
                type="number"
                value={p.shadow?.dx ?? 0}
                onChange={(e) => update({ shadow: { ...(p.shadow ?? { dy: 0, blur: 12, color: '#000000', opacity: 0.4 }), dx: +e.target.value } })}
                className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700">Offset Y</label>
              <input
                type="number"
                value={p.shadow?.dy ?? 0}
                onChange={(e) => update({ shadow: { ...(p.shadow ?? { dx: 0, blur: 12, color: '#000000', opacity: 0.4 }), dy: +e.target.value } })}
                className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700">Blur</label>
              <input
                type="number"
                min={0}
                max={100}
                value={p.shadow?.blur ?? 12}
                onChange={(e) => update({ shadow: { ...(p.shadow ?? { dx: 0, dy: 0, color: '#000000', opacity: 0.4 }), blur: +e.target.value } })}
                className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700">Opacity</label>
              <input
                type="number"
                step={0.05}
                min={0}
                max={1}
                value={p.shadow?.opacity ?? 0.4}
                onChange={(e) => update({ shadow: { ...(p.shadow ?? { dx: 0, dy: 0, blur: 12, color: '#000000' }), opacity: +e.target.value } })}
                className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-700">Shadow Color</label>
            <input
              type="color"
              value={p.shadow?.color ?? '#000000'}
              onChange={(e) => update({ shadow: { ...(p.shadow ?? { dx: 0, dy: 0, blur: 12, opacity: 0.4 }), color: e.target.value } })}
              className="w-full h-10 border rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-3 text-gray-900">Transformation</h4>
        <div className="space-y-3">
          {/* Transformation type buttons */}
          <div className="grid grid-cols-4 gap-2">
            {(['none', 'arch', 'rise', 'wave', 'flag', 'circle', 'angle', 'distort'] as const).map((type) => (
              <button
                key={type}
                onClick={() => update({ transformType: type })}
                className={`px-2 py-1.5 text-xs font-medium rounded border transition-colors ${
                  p.transformType === type
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title={type.charAt(0).toUpperCase() + type.slice(1)}
              >
                {type === 'none' ? 'None' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Arch Curve Slider - shown when ARCH is selected */}
          {p.transformType === 'arch' && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Arch Curve</label>
                <span className="text-xs text-gray-600">{p.archCurve}%</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={p.archCurve}
                onChange={(e) => update({ archCurve: +e.target.value })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>-100%</span>
                <span>0%</span>
                <span>100%</span>
              </div>
              <button
                onClick={() => update({ archCurve: 0 })}
                className="text-xs px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              >
                Reset
              </button>
            </div>
          )}

          {/* Legacy curved text toggle (keep for backward compatibility) */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="curved-toggle"
                checked={p.curved}
                onChange={(e) => update({ curved: e.target.checked })}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="curved-toggle" className="text-xs cursor-pointer text-gray-700">Legacy Curved Text (manual control)</label>
            </div>
            {p.curved && (
              <div className="grid grid-cols-3 gap-3 pl-6 mt-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-gray-700">Radius</label>
                  <input
                    type="number"
                    min={50}
                    max={1000}
                    value={p.radius}
                    onChange={(e) => update({ radius: +e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-gray-700">Arc (deg)</label>
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={p.arc}
                    onChange={(e) => update({ arc: +e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5 text-gray-700">Upside Down</label>
                  <input
                    type="checkbox"
                    checked={p.upsideDown}
                    onChange={(e) => update({ upsideDown: e.target.checked })}
                    className="w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-3 text-gray-900">3D / Extrude</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="extrude-toggle"
              checked={!!p.extrude}
              onChange={(e) => update({ extrude: e.target.checked ? { depth: 10, step: 2, color: '#000000', opacity: 0.3 } : undefined })}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="extrude-toggle" className="text-sm cursor-pointer">Enable 3D Effect</label>
          </div>
          {p.extrude && (
            <div className="grid grid-cols-2 gap-3 pl-6">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-700">Depth</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={p.extrude.depth}
                  onChange={(e) => update({ extrude: { ...p.extrude!, depth: +e.target.value } })}
                  className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-700">Step</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={p.extrude.step}
                  onChange={(e) => update({ extrude: { ...p.extrude!, step: +e.target.value } })}
                  className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-700">Extrude Color</label>
                <input
                  type="color"
                  value={p.extrude.color}
                  onChange={(e) => update({ extrude: { ...p.extrude!, color: e.target.value } })}
                  className="w-full h-10 border rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-700">Opacity</label>
                <input
                  type="number"
                  step={0.05}
                  min={0}
                  max={1}
                  value={p.extrude.opacity}
                  onChange={(e) => update({ extrude: { ...p.extrude!, opacity: +e.target.value } })}
                  className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// KArcText Inspector - wrapped with track for automatic reactivity
const KArcTextInspector = track(function KArcTextInspector({ editor: editorProp }: { editor?: ReturnType<typeof useEditor> | null }) {
  const contextEditor = useEditorSafe();
  const editor = editorProp || contextEditor;
  if (!editor) return null;

  // Use editor directly - track will handle reactivity
  const selected = editor.getSelectedShapes().filter((s: any) => s.type === 'k-arc-text');
  const shape = selected.length > 0 ? selected[0] : null;

  if (!shape) return null;

  const p = shape.props as any; // KArcText props

  const update = (props: Partial<typeof p>) => {
    editor.updateShapes([{ id: shape.id, type: 'k-arc-text', props: { ...p, ...props } }]);
  };

  const commonFonts = [
    'Inter, system-ui, sans-serif',
    'Arial, sans-serif',
    'Helvetica, sans-serif',
    'Georgia, serif',
    'Times New Roman, serif',
    'Courier New, monospace',
    'Verdana, sans-serif',
  ];

  return (
    <div className="p-4 space-y-4 overflow-auto">
      <div>
        <h4 className="font-semibold text-sm mb-3">Text Content</h4>
        <textarea
          value={p.text}
          onChange={(e) => update({ text: e.target.value })}
          className="w-full border rounded px-2 py-2 text-sm min-h-[60px] resize-none"
          placeholder="Enter text..."
        />
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-3">Typography</h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-700">Font Family</label>
            <select
              value={p.fontFamily}
              onChange={(e) => update({ fontFamily: e.target.value })}
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              {commonFonts.map((font) => (
                <option key={font} value={font}>{font.split(',')[0]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-700">Weight</label>
            <select
              value={p.fontWeight}
              onChange={(e) => update({ fontWeight: +e.target.value })}
              className="w-full border rounded px-2 py-1.5 text-sm"
            >
              <option value={400}>Normal (400)</option>
              <option value={500}>Medium (500)</option>
              <option value={600}>Semi Bold (600)</option>
              <option value={700}>Bold (700)</option>
              <option value={800}>Extra Bold (800)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-700">Size</label>
            <input
              type="number"
              min={12}
              max={200}
              value={p.sizePx}
              onChange={(e) => update({ sizePx: Math.max(12, Math.min(200, +e.target.value)) })}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-700">Letter Spacing</label>
            <input
              type="number"
              step={0.5}
              value={p.letterSpacing ?? 0}
              onChange={(e) => update({ letterSpacing: +e.target.value })}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-xs font-medium mb-1.5 text-gray-700">Alignment</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => update({ align: 'start' })}
              className={`px-3 py-2 border rounded text-sm ${
                p.align === 'start' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'hover:bg-gray-50'
              }`}
            >
              Start
            </button>
            <button
              onClick={() => update({ align: 'middle' })}
              className={`px-3 py-2 border rounded text-sm ${
                p.align === 'middle' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'hover:bg-gray-50'
              }`}
            >
              Center
            </button>
            <button
              onClick={() => update({ align: 'end' })}
              className={`px-3 py-2 border rounded text-sm ${
                p.align === 'end' ? 'bg-purple-100 border-purple-500 text-purple-700' : 'hover:bg-gray-50'
              }`}
            >
              End
            </button>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-3">Arc Geometry</h4>
        <div className="space-y-3">
          <div className="text-xs text-gray-600 mb-2">
            💡 Drag the handles on the canvas to adjust radius, start, and end angles interactively
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700">Radius (px)</label>
              <input
                type="number"
                min={30}
                max={2000}
                value={p.radius}
                onChange={(e) => update({ radius: Math.max(30, Math.min(2000, +e.target.value)) })}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700">Start Angle (deg)</label>
              <input
                type="number"
                min={-360}
                max={360}
                value={p.startAngleDeg}
                onChange={(e) => update({ startAngleDeg: +e.target.value })}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700">End Angle (deg)</label>
              <input
                type="number"
                min={-360}
                max={360}
                value={p.endAngleDeg}
                onChange={(e) => update({ endAngleDeg: +e.target.value })}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={p.upsideDown || false}
                  onChange={(e) => update({ upsideDown: e.target.checked })}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-xs">Upside Down</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-sm mb-3">Fill & Stroke</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-gray-700">Fill Color</label>
            <input
              type="color"
              value={p.fill || '#111111'}
              onChange={(e) => update({ fill: e.target.value })}
              className="w-full h-10 border rounded cursor-pointer"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700">Stroke Color</label>
              <input
                type="color"
                value={p.stroke || '#000000'}
                onChange={(e) => update({ stroke: e.target.value })}
                className="w-full h-10 border rounded cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-gray-700">Stroke Width</label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={p.strokeWidth || 0}
                onChange={(e) => update({ strokeWidth: +e.target.value })}
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// 4) Align Bar
function AlignBar() {
  const editor = useEditorSafe();
  if (!editor || !ARTBOARD_FRAME_ID) return null;
  return (
    <div className="absolute top-[68px] left-1/2 -translate-x-1/2 z-40 bg-white/95 border rounded-lg shadow px-2 py-1 flex gap-1">
      <button className="btn" onClick={() => alignSelected(editor, 'left', ARTBOARD_FRAME_ID!)}>⟸</button>
      <button className="btn" onClick={() => alignSelected(editor, 'center', ARTBOARD_FRAME_ID!)}>╳</button>
      <button className="btn" onClick={() => alignSelected(editor, 'right', ARTBOARD_FRAME_ID!)}>⟹</button>
      <div className="w-px bg-gray-200 mx-1" />
      <button className="btn" onClick={() => alignSelected(editor, 'top', ARTBOARD_FRAME_ID!)}>⟰</button>
      <button className="btn" onClick={() => alignSelected(editor, 'middle', ARTBOARD_FRAME_ID!)}>╳</button>
      <button className="btn" onClick={() => alignSelected(editor, 'bottom', ARTBOARD_FRAME_ID!)}>⟱</button>
      <div className="w-px bg-gray-200 mx-1" />
      <button className="btn" onClick={() => distributeHoriz(editor)}>⇄</button>
    </div>
  );
}

// Stage Background (checkerboard)
function StageBackground() {
  return (
    <div className="absolute inset-0">
      <div
        aria-hidden
        className="
          absolute inset-0
          bg-[linear-gradient(45deg,#f3f3f3_25%,transparent_25%,transparent_75%,#f3f3f3_75%,#f3f3f3),linear-gradient(45deg,#f3f3f3_25%,transparent_25%,transparent_75%,#f3f3f3_75%,#f3f3f3)]
          bg-[length:20px_20px]
          bg-[position:0_0,10px_10px]
        "
      />
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,0.08)]" />
    </div>
  );
}

// Left Rail Components
function RailButton({
  title,
  active = false,
  disabled,
  onClick,
  children,
}: React.PropsWithChildren<{
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}>) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`w-10 h-10 mx-auto my-1 grid place-items-center rounded-lg
        ${active ? 'bg-[#7c3aed]/15 text-[#7c3aed]' : 'hover:bg-gray-100 text-gray-700'}
        disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function LeftRail({
  onUploadClick,
  onAddText,
  hotspotMode,
  setHotspotMode,
  hasImage,
  loading,
}: {
  onUploadClick?: () => void;
  onAddText?: () => void;
  hotspotMode: boolean;
  setHotspotMode: (v: boolean) => void;
  hasImage: boolean;
  loading: boolean;
}) {
  return (
    <div className="h-full flex flex-col items-center py-2">
      <div className="text-xs font-semibold pt-2 pb-3">Tools</div>

      {/* Upload */}
      <RailButton title="Upload" disabled={loading} onClick={onUploadClick}>
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M12 3l4 4h-3v6h-2V7H8l4-4zM4 19h16v2H4z" />
        </svg>
      </RailButton>

      {/* Text */}
      <RailButton title="Add text" disabled={loading || !hasImage} onClick={onAddText}>
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M5 4h14v2H13v14h-2V6H5z" />
        </svg>
      </RailButton>

      {/* Targeted edit / hotspot */}
      <RailButton
        title={hotspotMode ? 'Click image to pick area' : 'Select edit area'}
        active={hotspotMode}
        disabled={loading || !hasImage}
        onClick={() => setHotspotMode(!hotspotMode)}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M12 8a4 4 0 110 8 4 4 0 010-8zm0-6a1 1 0 011 1v1a8 8 0 017 7h1a1 1 0 110 2h-1a8 8 0 01-7 7v1a1 1 0 11-2 0v-1a8 8 0 01-7-7H3a1 1 0 110-2h1a8 8 0 017-7V3a1 1 0 011-1z" />
        </svg>
      </RailButton>

      <div className="mt-auto pb-3 text-[10px] text-gray-400">v1</div>
    </div>
  );
}

// Right Rail Tabbed
function RightRailTabbed({
  backgroundColor,
  setBackgroundColor,
  loading,
  editor,
}: {
  backgroundColor: string;
  setBackgroundColor: (c: string) => void;
  loading: boolean;
  editor: ReturnType<typeof useEditor> | null;
}) {
  const [tab, setTab] = useState<'props' | 'layers' | 'canvas'>('props');

  return (
    <div className="h-screen flex flex-col">
      {/* Tabs header */}
      <div className="px-3 border-b bg-white flex-shrink-0">
        <div className="flex gap-2 py-2">
          {(['props','layers','canvas'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm capitalize
                ${tab === t ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-auto">
        {tab === 'props' && (
          <RightRail
            backgroundColor={backgroundColor}
            setBackgroundColor={setBackgroundColor}
            loading={loading}
            editor={editor}
          />
        )}
        {tab === 'layers' && (
          <div className="h-full overflow-auto">
            {ARTBOARD_FRAME_ID ? <LayersPanel frameId={ARTBOARD_FRAME_ID} /> : null}
          </div>
        )}
        {tab === 'canvas' && (
          <div className="p-4 space-y-3">
            <h4 className="font-semibold text-neutral-900">Canvas</h4>
            <p className="text-sm text-neutral-600">
              Quick zoom and artboard utilities.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// 5) Hotspot Overlay
function HotspotOverlay({
  enabled, setHotspot
}: { enabled: boolean; setHotspot: (p: {x:number;y:number}|null) => void }) {
  const editor = useEditorSafe();

  const onClick = useCallback((e: React.MouseEvent) => {
    if (!enabled || !editor) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const client = { x: e.clientX, y: e.clientY };
    // Convert client → page space
    const page = editor.screenToPage(client);
    setHotspot({ x: page.x, y: page.y });
  }, [enabled, editor, setHotspot]);

  if (!enabled) return null;
  return (
    <div
      className="absolute inset-0 z-40 cursor-crosshair"
      onClick={onClick}
      title="Click to set edit target"
    />
  );
}

// 6) Upload Button
function UploadButton({ externalRef, backgroundColor = '#ffffff' }: { externalRef?: React.RefObject<HTMLInputElement>; backgroundColor?: string }) {
  const editor = useEditorSafe();
  const internalRef = React.useRef<HTMLInputElement>(null);
  const inputRef = externalRef ?? internalRef;

  const onPick = () => inputRef.current?.click();
  // Expose onPick globally for left rail access
  if (typeof window !== 'undefined') {
    (window as any).__wf_onPickUpload = onPick;
  }

  const handleFiles = async (files: FileList | null) => {
    if (!editor || !files || !files[0]) return;
    const file = files[0];

    // Support SVG and raster
    const url = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.readAsDataURL(file);
    });

    // Ensure artboard exists first
    if (!ARTBOARD_FRAME_ID) {
      ensureArtboard(editor, backgroundColor);
    }
    
    // Create image inside frame (coordinates relative to frame)
    const shapeId = createImageShapeFromUrl(editor, url, 
      (ARTBOARD_WIDTH - ARTBOARD_WIDTH/2) / 2, // center horizontally in frame
      (ARTBOARD_HEIGHT - ARTBOARD_HEIGHT/2) / 2, // center vertically in frame
      ARTBOARD_WIDTH/2, 
      ARTBOARD_HEIGHT/2,
      ARTBOARD_FRAME_ID // parent to frame
    );
    // Send uploaded image to back so text appears above it
    editor.sendToBack([shapeId]);
    editor.setSelectedShapes([shapeId]);
  };

  return (
    <>
      <button className="btn" onClick={onPick}>Upload</button>
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.svg"
        className="hidden"
        onChange={(e) => handleFiles(e.currentTarget.files)}
      />
    </>
  );
}

// Top Bar
function TopBar({ backgroundColor }: { backgroundColor: string }) {
  const editor = useEditorSafe();
  const toast = useToast();

  const handleZoomToFit = useCallback(() => {
    editor?.zoomToFit();
  }, [editor]);

  const handleUndo = useCallback(() => {
    editor?.undo();
  }, [editor]);

  const handleRedo = useCallback(() => {
    editor?.redo();
  }, [editor]);

  const handleSave = useCallback(() => {
    if (!editor) return;
    const store = editor.store;
    const data = {
      records: store.allRecords(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design.tldraw.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Design saved!');
  }, [editor, toast]);

  const handleExportPng = useCallback(async () => {
    if (!editor || !ARTBOARD_FRAME_ID) return;
    await exportArtboardPng(editor, ARTBOARD_FRAME_ID, backgroundColor);
    toast.success('Artboard exported!');
  }, [editor, backgroundColor, toast]);

  return (
    <div className="row-start-1 col-span-3 h-14 border-b bg-white/80 backdrop-blur flex items-center px-3 gap-2">
      <div className="font-semibold">Wallflower.ai</div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <UploadButton backgroundColor={backgroundColor} />
        <button className="btn" onClick={handleZoomToFit}>Zoom to fit</button>
        <button className="btn" onClick={handleUndo}>Undo</button>
        <button className="btn" onClick={handleRedo}>Redo</button>
        <button className="btn" onClick={handleSave}>Save</button>
        <button className="btn" onClick={handleExportPng}>Download PNG</button>
      </div>
    </div>
  );
}

// Canvas
function EditorCanvas({ setEditor, backgroundColor, hotspotMode, setHotspot }: { 
  setEditor: (editor: ReturnType<typeof useEditor> | null) => void; 
  backgroundColor: string;
  hotspotMode: boolean;
  setHotspot: (p: {x:number;y:number}|null) => void;
}) {
  return (
    <div className="absolute inset-0">
      <Tldraw
        onMount={(ed) => {
          setEditor(ed);
          // create one artboard + bg with the current picker color
          ensureArtboard(ed, backgroundColor);
          // keep bg pinned to frame whenever anything changes
          ed.on('change', () => pinBgToFrame(ed));

          // Keyboard shortcuts
          const key = (e: KeyboardEvent) => {
            if (e.key === 'Delete') {
              const selected = ed.getSelectedShapeIds();
              if (selected.length > 0) ed.deleteShapes(selected);
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
              e.preventDefault();
              e.shiftKey ? ed.redo() : ed.undo();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === '=') {
              e.preventDefault();
              ed.zoomIn();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === '-') {
              e.preventDefault();
              ed.zoomOut();
            }
            if ((e.metaKey || e.ctrlKey) && e.key === '0') {
              e.preventDefault();
              ed.zoomToFit();
            }
          };
          window.addEventListener('keydown', key);
          
          // Cleanup on unmount
          return () => {
            window.removeEventListener('keydown', key);
          };
        }}
        hideUi={true}
        shapeUtils={[KText, KArcTextUtil] as any}
      />
      <HotspotOverlay enabled={hotspotMode} setHotspot={setHotspot} />
    </div>
  );
}

// Right Rail (properties inspector) - wrapped with track for automatic reactivity
const RightRail = track(function RightRail({ 
  backgroundColor, 
  setBackgroundColor, 
  loading,
  editor: editorProp
}: { 
  backgroundColor: string; 
  setBackgroundColor: (color: string) => void;
  loading: boolean;
  editor: ReturnType<typeof useEditor> | null;
}) {
  // Use prop editor if provided, otherwise try context
  const contextEditor = useEditorSafe();
  const editor = editorProp || contextEditor;
  
  if (!editor) {
    // Fallback UI when editor not available
    return (
      <div className="h-full overflow-auto p-4 space-y-4">
        <h3 className="font-semibold text-neutral-900">Properties</h3>
        <p className="text-sm text-neutral-500">Loading...</p>
      </div>
    );
  }

  // Use editor directly - track will handle reactivity
  const selectedIds = Array.from(editor.getSelectedShapeIds());
  const hasKTextSelected = selectedIds.length > 0 && selectedIds.some((id) => {
    const shape = editor.getShape(id) as any;
    return shape?.type === 'ktext';
  });
  const hasArcTextSelected = selectedIds.length > 0 && selectedIds.some((id) => {
    const shape = editor.getShape(id) as any;
    return shape?.type === 'k-arc-text';
  });

  // If a ktext shape is selected, show ONLY KTextInspector (no background color or canvas zoom)
  if (editor && hasKTextSelected) {
    return (
      <div className="h-full overflow-y-auto bg-white">
        <KTextInspector editor={editor} />
      </div>
    );
  }

  // If an arc text shape is selected, show ONLY KArcTextInspector (no background color or canvas zoom)
  if (editor && hasArcTextSelected) {
    return (
      <div className="h-full overflow-y-auto bg-white">
        <KArcTextInspector editor={editor} />
      </div>
    );
  }

  // Check for built-in text shape selection
  const hasTextSelected = selectedIds.length > 0 && selectedIds.some((id) => {
    const shape = editor?.getShape(id) as any;
    return shape?.type === 'text';
  });

  // If built-in text shape is selected, show ONLY TextInspector
  if (editor && hasTextSelected) {
    return (
      <div className="h-full overflow-y-auto bg-white">
        <TextInspector editor={editor} />
      </div>
    );
  }

  // Default: no shape selected, show canvas properties
  return (
    <div className="h-full overflow-auto bg-white p-4 space-y-4">
      <h3 className="font-semibold text-neutral-900">Properties</h3>

      {/* Background Color Picker */}
      <div className="pt-2">
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Background Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            disabled={loading}
            className="w-10 h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 color-input"
            title="Choose background color"
          />
          <span className="text-xs text-neutral-600 font-mono">{backgroundColor.toUpperCase()}</span>
        </div>
      </div>

      {editor && (
        <div className="pt-2 border-t">
          <h4 className="font-medium mb-2 text-sm">Canvas</h4>
          <div className="flex gap-2">
            <button className="btn" onClick={() => editor.zoomIn()}>Zoom +</button>
            <button className="btn" onClick={() => editor.zoomOut()}>Zoom −</button>
          </div>
        </div>
      )}
      
      {editor && ARTBOARD_FRAME_ID && (
        <LayersPanel frameId={ARTBOARD_FRAME_ID} />
      )}
    </div>
  );
});

// Iteration Controls (navigate through variations)
function IterationControls({
  historyIndex,
  imageHistory,
  setHistoryIndex,
  loading,
  currentImageShapeId,
  setCurrentImageShapeId,
  editor,
}: {
  historyIndex: number;
  imageHistory: string[];
  setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
  currentImageShapeId: TLShapeId | null;
  setCurrentImageShapeId: React.Dispatch<React.SetStateAction<TLShapeId | null>>;
  editor: ReturnType<typeof useEditor> | null;
}) {
  const canGoPrev = historyIndex > 0;
  const canGoNext = historyIndex < imageHistory.length - 1;

  const goPrev = useCallback(() => {
    if (!canGoPrev || !editor) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    
    // Replace the current image
    if (currentImageShapeId) {
      swapImageOnShape(editor, currentImageShapeId, imageHistory[newIndex], { w: ARTBOARD_WIDTH, h: ARTBOARD_HEIGHT });
      // After swapping, ensure image stays in back
      editor.sendToBack([currentImageShapeId]);
      editor.setSelectedShapes([currentImageShapeId]);
      editor.zoomToSelection();
    }
  }, [canGoPrev, editor, historyIndex, setHistoryIndex, currentImageShapeId, imageHistory]);

  const goNext = useCallback(() => {
    if (!canGoNext || !editor) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    
    // Replace the current image
    if (currentImageShapeId) {
      swapImageOnShape(editor, currentImageShapeId, imageHistory[newIndex], { w: ARTBOARD_WIDTH, h: ARTBOARD_HEIGHT });
      // After swapping, ensure image stays in back
      editor.sendToBack([currentImageShapeId]);
      editor.setSelectedShapes([currentImageShapeId]);
      editor.zoomToSelection();
    }
  }, [canGoNext, editor, historyIndex, setHistoryIndex, currentImageShapeId, imageHistory]);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-3 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
      <button
        onClick={goPrev}
        disabled={!canGoPrev || loading}
        className="p-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
        title="Previous"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4">
          <path d="M41.4 342.6C28.9 330.1 28.9 309.8 41.4 297.3L169.4 169.3C178.6 160.1 192.3 157.4 204.3 162.4C216.3 167.4 224 179.1 224 192L224 256L560 256C586.5 256 608 277.5 608 304L608 336C608 362.5 586.5 384 560 384L224 384L224 448C224 460.9 216.2 472.6 204.2 477.6C192.2 482.6 178.5 479.8 169.3 470.7L41.3 342.7z"/>
        </svg>
      </button>
      <span className="text-xs text-gray-600 min-w-[60px] text-center font-medium">
        {historyIndex + 1} / {imageHistory.length}
      </span>
      <button
        onClick={goNext}
        disabled={!canGoNext || loading}
        className="p-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
        title="Next"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4">
          <path d="M598.6 297.4C611.1 309.9 611.1 330.2 598.6 342.7L470.6 470.7C461.4 479.9 447.7 482.6 435.7 477.6C423.7 472.6 416 460.9 416 448L416 384L80 384C53.5 384 32 362.5 32 336L32 304C32 277.5 53.5 256 80 256L416 256L416 192C416 179.1 423.8 167.4 435.8 162.4C447.8 157.4 461.5 160.2 470.7 169.3L598.7 297.3z"/>
        </svg>
      </button>
    </div>
  );
}

// Bottom Prompt & Controls Bar (v1 style)
function PromptDock({ 
  userRole, 
  editor, 
  prompt, 
  setPrompt, 
  loading, 
  setLoading,
  selectedModel,
  setSelectedModel,
  selectedStyle,
  setSelectedStyle,
  backgroundColor,
  setBackgroundColor,
  imageHistory,
  setImageHistory,
  historyIndex,
  setHistoryIndex,
  currentImageShapeId,
  setCurrentImageShapeId,
  lastPrompt,
  setLastPrompt,
  lastMode,
  setLastMode,
  hotspotMode,
  setHotspotMode,
  hotspot,
  setHotspot,
  showPreviewModal,
  setShowPreviewModal,
  previewLoading,
  setPreviewLoading,
  previewImageUrl,
  setPreviewImageUrl,
  showDeleteDialog,
  setShowDeleteDialog,
  showDeleteDesignConfirm,
  setShowDeleteDesignConfirm,
  currentIterationId,
  setCurrentIterationId,
  iterationIds,
  setIterationIds,
  currentDesignId,
  setCurrentDesignId,
  showCollectionModal,
  setShowCollectionModal,
  router,
  toast,
  handleAddText,
  handleAddArcText,
  hasImage,
  frameId,
}: {
  userRole?: string | null;
  editor: ReturnType<typeof useEditor> | null;
  prompt: string;
  setPrompt: (prompt: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  selectedStyle: string;
  setSelectedStyle: (style: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  imageHistory: string[];
  setImageHistory: React.Dispatch<React.SetStateAction<string[]>>;
  historyIndex: number;
  setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
  currentImageShapeId: TLShapeId | null;
  setCurrentImageShapeId: React.Dispatch<React.SetStateAction<TLShapeId | null>>;
  lastPrompt: string;
  setLastPrompt: (prompt: string) => void;
  lastMode: 'generate' | 'edit' | null;
  setLastMode: (mode: 'generate' | 'edit' | null) => void;
  hotspotMode: boolean;
  setHotspotMode: (mode: boolean) => void;
  hotspot: { x: number; y: number } | null;
  setHotspot: (hotspot: { x: number; y: number } | null) => void;
  showPreviewModal: boolean;
  setShowPreviewModal: (show: boolean) => void;
  previewLoading: boolean;
  setPreviewLoading: (loading: boolean) => void;
  previewImageUrl: string | null;
  setPreviewImageUrl: (url: string | null) => void;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  showDeleteDesignConfirm: boolean;
  setShowDeleteDesignConfirm: (show: boolean) => void;
  currentIterationId: string | null;
  setCurrentIterationId: (id: string | null) => void;
  iterationIds: (string | null)[];
  setIterationIds: (ids: (string | null)[]) => void;
  currentDesignId: string | null;
  setCurrentDesignId: (id: string | null) => void;
  showCollectionModal: boolean;
  setShowCollectionModal: (show: boolean) => void;
  router: ReturnType<typeof useRouter>;
  toast?: ReturnType<typeof useToast>;
  handleAddText?: () => void;
  handleAddArcText?: () => void;
  hasImage?: boolean;
  frameId?: TLShapeId | null;
}) {
  const computedHasImage = historyIndex >= 0 && imageHistory.length > 0;
  const finalHasImage = hasImage !== undefined ? hasImage : computedHasImage;
  
  // Safety: ensure toast methods are always available
  // Use the toast prop if available, otherwise create a fallback
  const toastValue = toast;
  const safeToast = useMemo(() => {
    if (toastValue && typeof toastValue === 'object' && 'success' in toastValue && 'error' in toastValue) {
      return toastValue;
    }
    return {
      success: (msg: string) => console.log('Success:', msg),
      error: (msg: string) => console.error('Error:', msg),
      warning: (msg: string) => console.warn('Warning:', msg),
      info: (msg: string) => console.info('Info:', msg),
    };
  }, [toastValue]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || loading || !editor) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/designs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          style: selectedStyle,
          backgroundColor,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to generate image');
      }

      const { imageUrl } = await response.json();
      const newHistory = [...imageHistory, imageUrl];
      setImageHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      if (currentImageShapeId) {
        swapImageOnShape(editor, currentImageShapeId, imageUrl, { w: ARTBOARD_WIDTH, h: ARTBOARD_HEIGHT });
        // After swapping, ensure image stays in back
        editor.sendToBack([currentImageShapeId]);
        editor.setSelectedShapes([currentImageShapeId]);
        editor.zoomToSelection();
      } else {
        // first image on canvas - ensure artboard exists first
        ensureArtboard(editor, backgroundColor);
        const shapeId = createImageShapeFromUrl(editor, imageUrl,
          0, // x relative to frame
          0, // y relative to frame
          ARTBOARD_WIDTH,
          ARTBOARD_HEIGHT,
          ARTBOARD_FRAME_ID // parent to frame
        );
        setCurrentImageShapeId(shapeId);
        
        // Lock the image to prevent accidental deletion/movement
        const s = editor.getShape(shapeId);
        if (s && !s.isLocked) {
          editor.updateShapes([{ id: shapeId, type: 'image', isLocked: true }]);
        }
        
        // Send image to back so text appears above it
        editor.sendToBack([shapeId]);
        
        editor.setSelectedShapes([shapeId]);
        editor.zoomToSelection();
      }
      setLastPrompt(prompt);
      setLastMode('generate');
      setPrompt('');
      safeToast.success('Design generated successfully!');
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Generate error:', err);
      safeToast.error(err.message || 'Failed to generate design');
    } finally {
      setLoading(false);
    }
  }, [prompt, selectedModel, selectedStyle, backgroundColor, loading, safeToast, editor, imageHistory, historyIndex]);

  const handleEdit = useCallback(async () => {
    if (!prompt.trim() || loading || !editor || imageHistory.length === 0) return;
    
    setLoading(true);
    try {
      const currentImage = imageHistory[historyIndex];
      
      const response = await fetch('/api/designs/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: currentImage,
          editPrompt: prompt,
          noiseLevel: 0.3,
          model: selectedModel,
          hotspot: hotspot ? { x: hotspot.x, y: hotspot.y } : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to edit image');
      }

      const { imageUrl } = await response.json();
      const newHistory = [...imageHistory, imageUrl];
      setImageHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      if (currentImageShapeId) {
        swapImageOnShape(editor, currentImageShapeId, imageUrl, { w: ARTBOARD_WIDTH, h: ARTBOARD_HEIGHT });
        editor.setSelectedShapes([currentImageShapeId]);
        editor.zoomToSelection();
      } else {
        // Ensure artboard exists first
        ensureArtboard(editor, backgroundColor);
        const shapeId = createImageShapeFromUrl(editor, imageUrl,
          0, // x relative to frame
          0, // y relative to frame
          ARTBOARD_WIDTH,
          ARTBOARD_HEIGHT,
          ARTBOARD_FRAME_ID // parent to frame
        );
        setCurrentImageShapeId(shapeId);
        
        // Lock the image to prevent accidental deletion/movement
        const s = editor.getShape(shapeId);
        if (s && !s.isLocked) {
          editor.updateShapes([{ id: shapeId, type: 'image', isLocked: true }]);
        }
        
        // Send image to back so text appears above it
        editor.sendToBack([shapeId]);
        
        editor.setSelectedShapes([shapeId]);
        editor.zoomToSelection();
      }
      setLastPrompt(prompt);
      setLastMode('edit');
      setPrompt('');
      safeToast.success('Design edited successfully!');
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Edit error:', err);
      safeToast.error(err.message || 'Failed to edit design');
    } finally {
      setLoading(false);
    }
  }, [prompt, selectedModel, loading, safeToast, editor, imageHistory, historyIndex, currentImageShapeId, hotspot, setImageHistory, setHistoryIndex, setCurrentImageShapeId]);

  const handleRetry = useCallback(async () => {
    if (!lastMode || loading || !editor) return;
    
    setLoading(true);
    try {
      let response;
      
      if (lastMode === 'edit') {
        const baseImageIndex = Math.max(0, historyIndex - 1);
        const baseImage = imageHistory[baseImageIndex];
        if (!baseImage) {
          safeToast.error('Cannot retry edit: no base image found');
          return;
        }
        
        response = await fetch('/api/designs/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            imageUrl: baseImage,
            editPrompt: lastPrompt, 
            noiseLevel: 0.3,
            model: selectedModel,
          }),
        });
      } else {
        response = await fetch('/api/designs/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: lastPrompt,
            model: selectedModel,
            style: selectedStyle,
            backgroundColor,
          }),
        });
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to retry');
      }

      const { imageUrl } = await response.json();
      const newHistory = [...imageHistory];
      newHistory[historyIndex] = imageUrl;
      setImageHistory(newHistory);

      if (currentImageShapeId) {
        swapImageOnShape(editor, currentImageShapeId, imageUrl, { w: ARTBOARD_WIDTH, h: ARTBOARD_HEIGHT });
        editor.setSelectedShapes([currentImageShapeId]);
        editor.zoomToSelection();
      } else {
        // Ensure artboard exists first
        ensureArtboard(editor, backgroundColor);
        const shapeId = createImageShapeFromUrl(editor, imageUrl,
          0, // x relative to frame
          0, // y relative to frame
          ARTBOARD_WIDTH,
          ARTBOARD_HEIGHT,
          ARTBOARD_FRAME_ID // parent to frame
        );
        setCurrentImageShapeId(shapeId);
        
        // Lock the image to prevent accidental deletion/movement
        const s = editor.getShape(shapeId);
        if (s && !s.isLocked) {
          editor.updateShapes([{ id: shapeId, type: 'image', isLocked: true }]);
        }
        
        editor.setSelectedShapes([shapeId]);
        editor.zoomToSelection();
      }

      safeToast.success('Retried successfully!');
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Retry error:', err);
      safeToast.error(err.message || 'Failed to retry');
    } finally {
      setLoading(false);
    }
  }, [lastMode, lastPrompt, loading, safeToast, editor, imageHistory, historyIndex, currentImageShapeId, selectedModel, selectedStyle, backgroundColor, setImageHistory, setHistoryIndex, setCurrentImageShapeId]);

  // Helper function to apply a new image (non-destructive: swaps asset, preserves shape)
  const applyNewImage = useCallback((imageUrl: string) => {
    if (!editor) return;

    // If we already have an image shape, just swap the asset on that shape.
    if (currentImageShapeId) {
      swapImageOnShape(
        editor,
        currentImageShapeId,
        imageUrl,
        { w: ARTBOARD_WIDTH, h: ARTBOARD_HEIGHT } // keep fixed to artboard
      );
      // After swapping, ensure image stays in back
      editor.sendToBack([currentImageShapeId]);
      editor.setSelectedShapes([currentImageShapeId]);
      editor.zoomToSelection();
    } else {
      // No image on canvas yet: ensure artboard exists first
      if (!ARTBOARD_FRAME_ID) {
        ensureArtboard(editor, backgroundColor);
      }
      
      // Create image inside the frame (coordinates relative to frame)
      const shapeId = createImageShapeFromUrl(
        editor,
        imageUrl,
        0, // x relative to frame
        0, // y relative to frame
        ARTBOARD_WIDTH,
        ARTBOARD_HEIGHT,
        ARTBOARD_FRAME_ID // parent to frame
      );
      setCurrentImageShapeId(shapeId);
      
      // Lock the image to prevent accidental deletion/movement
      const s = editor.getShape(shapeId);
      if (s && !s.isLocked) {
        editor.updateShapes([{ id: shapeId, type: 'image', isLocked: true }]);
      }
      
      // Send image to back so text appears above it
      editor.sendToBack([shapeId]);
      
      editor.setSelectedShapes([shapeId]);
      editor.zoomToSelection();
    }

    // Update history after a successful swap/create
    setImageHistory((prev) => {
      const next = [...prev, imageUrl];
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [editor, currentImageShapeId, backgroundColor, setImageHistory, setHistoryIndex, setCurrentImageShapeId]);

  const handleRemoveBackground = useCallback(async () => {
    if (!hasImage || !editor) return;
    setLoading(true);
    try {
      const currentImage = imageHistory[historyIndex];
      const response = await fetch('/api/designs/remove-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: currentImage }),
      });
      const data = await response.json();
      if (data.imageUrl) {
        applyNewImage(data.imageUrl);
        safeToast.success('Background removed!');
      }
    } catch (error) {
      console.error('Error removing background:', error);
      safeToast.error('Failed to remove background');
    } finally {
      setLoading(false);
    }
  }, [hasImage, editor, imageHistory, historyIndex, applyNewImage, safeToast]);

  const handleKnockoutBackgroundColor = useCallback(async () => {
    if (!hasImage || !editor) return;
    setLoading(true);
    try {
      const currentImage = imageHistory[historyIndex];
      const response = await fetch('/api/designs/knockout-color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: currentImage, backgroundHex: backgroundColor, tolerance: 14 }),
      });
      const data = await response.json();
      if (data.imageUrl) {
        applyNewImage(data.imageUrl);
        safeToast.success('Background color knocked out!');
      }
    } catch (error) {
      console.error('Error knocking out background color:', error);
      safeToast.error('Failed to knock out background color');
    } finally {
      setLoading(false);
    }
  }, [hasImage, editor, imageHistory, historyIndex, backgroundColor, applyNewImage, safeToast]);

  const handlePreviewMockup = useCallback(async () => {
    if (!hasImage) return;
    setPreviewLoading(true);
    setPreviewImageUrl(null);
    try {
      const currentImage = imageHistory[historyIndex];
      const response = await fetch('/api/designs/mockup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: currentImage, aspectRatio: '4:5', tShirtColor: backgroundColor }),
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
      safeToast.error('Failed to generate preview mockup');
    } finally {
      setPreviewLoading(false);
    }
  }, [hasImage, imageHistory, historyIndex, backgroundColor, safeToast]);

  const handleUpscale = useCallback(async () => {
    if (!hasImage || !editor) return;
    setLoading(true);
    try {
      const currentImage = imageHistory[historyIndex];
      const response = await fetch('/api/designs/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          designId: currentDesignId, 
          imageUrl: currentImage, 
          upscaleMode: 'factor', 
          upscaleFactor: 2, 
          outputFormat: 'png' 
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Upscale failed');
      if (data?.imageUrl) {
        applyNewImage(data.imageUrl);
        safeToast.success('Image upscaled!');
      }
    } catch (error: any) {
      safeToast.error(error?.message || 'Failed to upscale');
    } finally {
      setLoading(false);
    }
  }, [hasImage, editor, imageHistory, historyIndex, currentDesignId, applyNewImage, safeToast]);

  const handleDeleteIteration = useCallback(async () => {
    if (historyIndex <= 0) {
      setShowDeleteDialog(false);
      return;
    }

    if (!currentDesignId) {
      if (imageHistory.length <= 1) {
        setImageHistory([]);
        setHistoryIndex(-1);
        setCurrentDesignId(null);
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
      }
      setCurrentIterationId(null);
      setShowDeleteDialog(false);
      return;
    }

    try {
      const iterationIdToDelete = iterationIds[historyIndex];
      if (!iterationIdToDelete) {
        safeToast.error('Cannot delete: iteration ID not found');
        return;
      }

      const response = await fetch('/api/designs/delete-iteration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iterationId: iterationIdToDelete }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Failed to delete iteration');
      }

      const newHistory = [...imageHistory];
      const newIds = [...iterationIds];
      newHistory.splice(historyIndex, 1);
      newIds.splice(historyIndex, 1);
      setImageHistory(newHistory);
      setIterationIds(newIds);
      
      if (historyIndex >= newHistory.length) {
        setHistoryIndex(newHistory.length - 1);
      }
      
      setCurrentIterationId(null);
      setShowDeleteDialog(false);
      safeToast.success('Iteration deleted');
    } catch (error: any) {
      console.error('Error deleting iteration:', error);
      safeToast.error(error?.message || 'Failed to delete iteration');
    }
  }, [historyIndex, currentDesignId, imageHistory, iterationIds, safeToast]);

  const handleDeleteDesign = useCallback(async () => {
    if (!currentDesignId) {
      setImageHistory([]);
      setHistoryIndex(-1);
      setCurrentDesignId(null);
      setShowDeleteDialog(false);
      setShowDeleteDesignConfirm(false);
      if (router) {
        router.push('/editor');
      }
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

      setImageHistory([]);
      setHistoryIndex(-1);
      setCurrentDesignId(null);
      setShowDeleteDialog(false);
      setShowDeleteDesignConfirm(false);
      if (router) {
        router.push('/editor');
      }
      safeToast.success('Design deleted');
    } catch (error: any) {
      console.error('Error deleting design:', error);
      safeToast.error(error?.message || 'Failed to delete design');
    }
  }, [currentDesignId, router, safeToast]);

  return (
    <div className="p-4 space-y-3">
      {/* Prompt Input */}
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus-within:border-[#1d1d1f] transition-colors shadow-sm">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !loading) {
                e.preventDefault();
                if (hasImage) {
                  handleEdit();
                } else {
                  handleGenerate();
                }
              }
            }}
            placeholder={finalHasImage ? "Edit your design..." : "Describe your design..."}
            className="flex-1 outline-none bg-white text-base text-[#1d1d1f] placeholder:text-gray-400"
            disabled={loading}
          />
          <button
            onClick={() => finalHasImage ? handleEdit() : handleGenerate()}
            disabled={loading || !prompt.trim()}
            className="flex-shrink-0 p-2 rounded-lg bg-gradient-to-r from-[#1d1d1f] to-[#2d2d2f] text-white hover:from-[#2d2d2f] hover:to-[#3d3d3f] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 text-white" fill="currentColor">
                <path d="M568.4 37.7C578.2 34.2 589 36.7 596.4 44C603.8 51.3 606.2 62.2 602.7 72L424.7 568.9C419.7 582.8 406.6 592 391.9 592C377.7 592 364.9 583.4 359.6 570.3L295.4 412.3C290.9 401.3 292.9 388.7 300.6 379.7L395.1 267.3C400.2 261.2 399.8 252.3 394.2 246.7C388.6 241.1 379.6 240.7 373.6 245.8L261.2 340.1C252.1 347.7 239.6 349.7 228.6 345.3L70.1 280.8C57 275.5 48.4 262.7 48.4 248.5C48.4 233.8 57.6 220.7 71.5 215.7L568.4 37.7z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Control Buttons */}
      {finalHasImage && (
        <div className="flex items-center justify-center">
          <div className="inline-flex items-stretch bg-white border border-gray-200 rounded-lg overflow-hidden divide-x divide-gray-200">

            {/* Retry Button */}
            <Tooltip.Root>
              <Tooltip.Trigger>
                <button
                  onClick={handleRetry}
                  disabled={loading || !lastMode}
                  className="px-2 sm:px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100"
                  title="Try Again"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                    <path d="M552 256L408 256C398.3 256 389.5 250.2 385.8 241.2C382.1 232.2 384.1 221.9 391 215L437.7 168.3C362.4 109.7 253.4 115 184.2 184.2C109.2 259.2 109.2 380.7 184.2 455.7C259.2 530.7 380.7 530.7 455.7 455.7C463.9 447.5 471.2 438.8 477.6 429.6C487.7 415.1 507.7 411.6 522.2 421.7C536.7 431.8 540.2 451.8 530.1 466.3C521.6 478.5 511.9 490.1 501 501C401 601 238.9 601 139 501C39.1 401 39 239 139 139C233.3 44.7 382.7 39.4 483.3 122.8L535 71C541.9 64.1 552.2 62.1 561.2 65.8C570.2 69.5 576 78.3 576 88L576 232C576 245.3 565.3 256 552 256z"/>
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

            {/* Add Text Button */}
            <Tooltip.Root>
              <Tooltip.Trigger>
                <button
                  onClick={() => {
                    if (handleAddText) {
                      handleAddText();
                    } else if (editor) {
                      // Fallback: create KText shape directly
                      const shapeId = insertKText(editor, {
                        text: 'Your text here',
                        sizePx: 96,
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontWeight: 700,
                        fill: '#111111',
                        align: 'middle',
                        curved: false,
                        parentId: frameId || undefined,
                      });
                      if (shapeId) {
                        editor.setSelectedShapes([shapeId]);
                        editor.zoomToSelection();
                      }
                    }
                  }}
                  disabled={loading || (!editor && !handleAddText)}
                  className="px-2 sm:px-3 py-2 text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M5 4h14v2H13v14h-2V6H5z" />
                  </svg>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Positioner>
                  <Tooltip.Popup className="bg-[#1d1d1f] text-white text-sm px-3 py-1.5 rounded-lg">
                    Add Text
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>

            {/* Crosshairs Button */}
            <Tooltip.Root>
              <Tooltip.Trigger>
                <button
                  onClick={() => {
                    if (hotspotMode) {
                      setHotspotMode(false);
                    } else {
                      setHotspotMode(true);
                      setHotspot(null);
                    }
                  }}
                  disabled={loading || !finalHasImage}
                  className={`px-2 sm:px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
                    hotspotMode 
                      ? 'text-[#7c3aed] bg-[#7c3aed]/10 hover:bg-[#7c3aed]/20' 
                      : 'text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                    <path d="M320 48C337.7 48 352 62.3 352 80L352 98.3C450.1 112.3 527.7 189.9 541.7 288L560 288C577.7 288 592 302.3 592 320C592 337.7 577.7 352 560 352L541.7 352C527.7 450.1 450.1 527.7 352 541.7L352 560C352 577.7 337.7 592 320 592C302.3 592 288 577.7 288 560L288 541.7C189.9 527.7 112.3 450.1 98.3 352L80 352C62.3 352 48 337.7 48 320C48 302.3 62.3 288 80 288L98.3 288C112.3 189.9 189.9 112.3 288 98.3L288 80C288 62.3 302.3 48 320 48zM163.2 352C175.9 414.7 225.3 464.1 288 476.8L288 464C288 446.3 302.3 432 320 432C337.7 432 352 446.3 352 464L352 476.8C414.7 464.1 464.1 414.7 476.8 352L464 352C446.3 352 432 337.7 432 320C432 302.3 446.3 288 464 288L476.8 288C464.1 225.3 414.7 175.9 352 163.2L352 176C352 193.7 337.7 208 320 208C302.3 208 288 193.7 288 176L288 163.2C225.3 175.9 175.9 225.3 163.2 288L176 288C193.7 288 208 302.3 208 320C208 337.7 193.7 352 176 352L163.2 352zM320 272C346.5 272 368 293.5 368 320C368 346.5 346.5 368 320 368C293.5 368 272 346.5 272 320C272 293.5 293.5 272 320 272z"/>
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

            {/* Eraser Menu */}
            <Menu.Root>
              <Menu.Trigger
                disabled={loading || !hasImage}
                className="px-2 sm:px-3 py-2 text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                  <path d="M210.5 480L333.5 480L398.8 414.7L225.3 241.2L98.6 367.9L210.6 479.9zM256 544L210.5 544C193.5 544 177.2 537.3 165.2 525.3L49 409C38.1 398.1 32 383.4 32 368C32 352.6 38.1 337.9 49 327L295 81C305.9 70.1 320.6 64 336 64C351.4 64 366.1 70.1 377 81L559 263C569.9 273.9 576 288.6 576 304C576 319.4 569.9 334.1 559 345L424 480L544 480C561.7 480 576 494.3 576 512C576 529.7 561.7 544 544 544L256 544z"/>
                </svg>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner side="top" align="center" sideOffset={8}>
                  <Menu.Popup className="bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[220px]">
                    <Menu.Item 
                      onClick={handleRemoveBackground}
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
                  onClick={handleUpscale}
                  disabled={loading || !finalHasImage}
                  className="px-2 sm:px-3 py-2 text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
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
                  disabled={loading || previewLoading || !hasImage}
                  className="px-2 sm:px-3 py-2 text-gray-700 hover:text-[#1d1d1f] hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
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

            {/* Delete Button */}
            <Tooltip.Root>
              <Tooltip.Trigger>
                <button
                  onClick={() => {
                    const iterationId = historyIndex > 0 && iterationIds.length > historyIndex && iterationIds[historyIndex] !== undefined
                      ? iterationIds[historyIndex] 
                      : null;
                    setCurrentIterationId(iterationId);
                    setShowDeleteDialog(true);
                  }}
                  disabled={loading || !finalHasImage}
                  className="px-3 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none"
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                    <path d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"/>
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
                        safeToast.warning('Please save your design first before adding it to a collection');
                        return;
                      }
                      setShowCollectionModal(true);
                    }}
                    disabled={loading || !hasImage || !currentDesignId}
                    className="px-3 py-2 text-gray-700 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none"
                    title="Save to Collection"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5">
                      <path d="M160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 237.3C544 220.3 537.3 204 525.3 192L448 114.7C436 102.7 419.7 96 402.7 96L160 96zM192 192C192 174.3 206.3 160 224 160L384 160C401.7 160 416 174.3 416 192L416 256C416 273.7 401.7 288 384 288L224 288C206.3 288 192 273.7 192 256L192 192zM320 352C355.3 352 384 380.7 384 416C384 451.3 355.3 480 320 480C284.7 480 256 451.3 256 416C256 380.7 284.7 352 320 352z"/>
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
          </div>
        </div>
      )}

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
                <img 
                  src={previewImageUrl} 
                  alt="T-shirt preview" 
                  className="max-w-full max-h-full object-contain"
                  style={{ maxHeight: '80vh' }}
                />
              )}
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Collection Modal */}
      <CollectionModal
        open={showCollectionModal}
        onOpenChange={setShowCollectionModal}
        designId={currentDesignId}
        currentImageUrl={imageHistory.length > 0 && historyIndex >= 0 ? imageHistory[historyIndex] : null}
      />
    </div>
  );
}
