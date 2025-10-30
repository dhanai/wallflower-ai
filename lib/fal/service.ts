import { fal } from '@fal-ai/client';

// Configure fal.ai client
fal.config({
  credentials: process.env.FAL_AI_API_KEY!,
});

export interface ImageGenerationOptions {
  prompt: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '16:9' | '9:16' | '4:5';
  numImages?: number;
  model?: 'gemini-25' | 'recraft-v3' | 'seedream-v4';
  style?: string;
  styleId?: string;
  backgroundColor?: string;
}

export interface ImageEditOptions {
  imageUrl: string;
  prompt: string;
  noiseLevel?: number;
  model?: 'gemini-25' | 'recraft-v3' | 'seedream-v4';
  styleId?: string;
  referenceImageUrl?: string; // optional secondary reference/attachment
}

/**
 * Create a custom style using Recraft V3
 */
export async function createRecraftStyle(
  imageUrls: string[],
  baseStyle: string = 'digital_illustration'
): Promise<string> {
  try {
    // First, upload images as a zip to get the data URL
    // For now, we'll use the first image as a simple approach
    // In production, you'd need to zip multiple images
    
    const input: any = {
      images_data_url: imageUrls[0], // Simplified - should be zip URL
      base_style: baseStyle,
    };

    console.log('Calling fal.ai Recraft V3 Create Style');

    const result = await fal.subscribe('fal-ai/recraft/v3/create-style', {
      input: input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Fal.ai Recraft V3 Create Style queue update:', update);
      },
    });

    if (!result.data || !result.data.style_id) {
      throw new Error('Recraft V3 Create Style did not return a style_id');
    }

    console.log('Recraft V3 style created:', result.data.style_id);
    return result.data.style_id;
  } catch (error: any) {
    console.error('Recraft V3 Create Style error:', error);
    throw new Error(`Style creation failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate an image using the specified model
 */
export async function generateImage(
  options: ImageGenerationOptions
): Promise<string> {
  const model = options.model || 'gemini-25';
  
  if (model === 'recraft-v3') {
    return generateImageWithRecraftV3(options);
  } else if (model === 'seedream-v4') {
    return generateImageWithSeedreamV4(options);
  } else {
    return generateImageWithGemini25(options);
  }
}

/**
 * Generate an image using Recraft V3
 */
async function generateImageWithRecraftV3(
  options: ImageGenerationOptions
): Promise<string> {
  try {
    // Ensure the prompt specifies design-only and full frame coverage
    const styleLead = (() => {
      const s = (options.style || '').toLowerCase();
      if (!s) return '';
      if (s.includes('photograph') || s === 'photograph') return 'Create a photograph of';
      if (s.includes('comic')) return 'Create a comic book illustration of';
      if (s.includes('anime')) return 'Create an anime-style illustration of';
      if (s.includes('watercolor')) return 'Create a watercolor painting of';
      if (s.includes('3d')) return 'Create a 3D render of';
      if (s.includes('sketch')) return 'Create a pencil sketch of';
      if (s.includes('pop art')) return 'Create a pop art illustration of';
      if (s.includes('realistic')) return 'Create a realistic illustration of';
      if (s.includes('fantasy')) return 'Create a fantasy illustration of';
      if (s.includes('sci-fi') || s.includes('sci fi') || s.includes('scifi')) return 'Create a sci-fi illustration of';
      if (s.includes('minimalist')) return 'Create a minimalist illustration of';
      if (s.includes('vintage')) return 'Create a vintage-style illustration of';
      if (s.includes('retro')) return 'Create a retro-style illustration of';
      if (s.includes('modern')) return 'Create a modern graphic illustration of';
      if (s.includes('abstract')) return 'Create an abstract illustration of';
      return '';
    })();

    let finalPrompt = styleLead ? `${styleLead} ${options.prompt}` : options.prompt;
    const promptLower = finalPrompt.toLowerCase();
    if (!promptLower.includes('design only') && 
        !promptLower.includes('standalone design') &&
        !promptLower.includes('graphic design') &&
        !promptLower.includes('artwork only')) {
      // Avoid mentioning forbidden objects (like t-shirts) to reduce priming
      finalPrompt = `${finalPrompt}, standalone graphic design, design artwork only, product-free, object-free composition`;
    }
    // Ensure edge-to-edge coverage
    if (!promptLower.includes('edge to edge') && 
        !promptLower.includes('edge-to-edge') &&
        !promptLower.includes('full frame') &&
        !promptLower.includes('no margins') &&
        !promptLower.includes('fills entire frame')) {
      finalPrompt = `${finalPrompt}, edge-to-edge design, fills entire frame, no margins, no padding, no whitespace`;
    }
    
    const input: any = {
      prompt: finalPrompt,
      sync_mode: true,
    };
    // Optional background color guidance (reinforce with HEX and friendly name)
    if (options.backgroundColor) {
      const hex = options.backgroundColor.trim();
      const isHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
      const hexLower = isHex ? hex.toLowerCase() : hex;
      const hexToName: Record<string, string> = {
        '#ffffff': 'white',
        '#000000': 'black',
        '#808080': 'gray',
        '#d4a017': 'mustard',
        '#1e3a8a': 'blue',
        '#166534': 'green',
        '#b91c1c': 'red',
        '#db2777': 'pink',
      };
      const friendly = hexToName[hexLower] || undefined;
      const colorLabel = friendly ? `${friendly} (HEX ${hexLower})` : `HEX ${hexLower}`;
      finalPrompt = `${finalPrompt}, SOLID BACKGROUND COLOR ${colorLabel}, strictly no gradients, no textures, no patterns, design must remain edge-to-edge`;
      input.prompt = finalPrompt;
    }

    // Add style if provided
    if (options.style && options.style.trim()) {
      input.style = options.style;
    }

    // Add custom style_id if provided (for Recraft custom styles)
    if (options.styleId) {
      input.style_id = options.styleId;
    }

    console.log('Calling fal.ai Recraft V3 text-to-image with prompt:', options.prompt);

    const result = await fal.subscribe('fal-ai/recraft/v3/text-to-image', {
      input: input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Fal.ai Recraft V3 queue update:', update);
      },
    });

    if (!result.data || !result.data.images || result.data.images.length === 0) {
      throw new Error('Fal.ai Recraft V3 did not return an image');
    }

    const imageUrl = result.data.images[0].url;
    if (!imageUrl) {
      throw new Error('Fal.ai Recraft V3 did not return an image URL');
    }

    console.log('Fal.ai Recraft V3 completed');
    return imageUrl;
  } catch (error: any) {
    console.error('Fal.ai Recraft V3 error:', error);
    throw new Error(`Image generation failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate an image using Gemini 2.5 Flash (Nano Banana)
 * Based on tryon project's generateImageWithGemini25Flash
 */
export async function generateImageWithGemini25(
  options: ImageGenerationOptions
): Promise<string> {
  try {
    // Convert 4:5 to 3:4 (closest supported aspect ratio)
    let aspectRatio = options.aspectRatio || '1:1';
    if (aspectRatio === '4:5') {
      aspectRatio = '3:4';
    }
    
    // Ensure full-frame coverage; avoid conflicting wording for photo styles
    const styleLead = (() => {
      const s = (options.style || '').toLowerCase();
      if (!s) return '';
      if (s.includes('photograph') || s === 'photograph') return 'Create a photograph of';
      if (s.includes('comic')) return 'Create a comic book illustration of';
      if (s.includes('anime')) return 'Create an anime-style illustration of';
      if (s.includes('watercolor')) return 'Create a watercolor painting of';
      if (s.includes('3d')) return 'Create a 3D render of';
      if (s.includes('sketch')) return 'Create a pencil sketch of';
      if (s.includes('pop art')) return 'Create a pop art illustration of';
      if (s.includes('realistic')) return 'Create a realistic illustration of';
      if (s.includes('fantasy')) return 'Create a fantasy illustration of';
      if (s.includes('sci-fi') || s.includes('sci fi') || s.includes('scifi')) return 'Create a sci-fi illustration of';
      if (s.includes('minimalist')) return 'Create a minimalist illustration of';
      if (s.includes('vintage')) return 'Create a vintage-style illustration of';
      if (s.includes('retro')) return 'Create a retro-style illustration of';
      if (s.includes('modern')) return 'Create a modern graphic illustration of';
      if (s.includes('abstract')) return 'Create an abstract illustration of';
      return '';
    })();

    let finalPrompt = styleLead ? `${styleLead} ${options.prompt}` : options.prompt;
    const promptLower = finalPrompt.toLowerCase();
    const styleLower = (options.style || '').toLowerCase();
    // const isPhotoStyle = styleLower.includes('photo');
    // if (!promptLower.includes('design only') &&
    //     !promptLower.includes('standalone design') &&
    //     !promptLower.includes('graphic design') &&
    //     !promptLower.includes('artwork only')) {
    //   if (!isPhotoStyle) {
    //     // Non-photographic styles: nudge toward a pure printable design without priming product objects
    //     finalPrompt = `${finalPrompt}, standalone graphic design, design artwork only, product-free, object-free composition`;
    //   }
    //   // For photo styles, do not add graphic-design phrasing to avoid conflict
    // }
    // // Ensure edge-to-edge coverage
    // if (!promptLower.includes('edge to edge') && 
    //     !promptLower.includes('edge-to-edge') &&
    //     !promptLower.includes('full frame') &&
    //     !promptLower.includes('no margins') &&
    //     !promptLower.includes('fills entire frame')) {
    //   finalPrompt = `${finalPrompt}, edge-to-edge design, fills entire frame, no margins, no padding, no whitespace`;
    // }
    

    const input = {
      prompt: finalPrompt,
      aspect_ratio: aspectRatio as any,
      num_images: options.numImages || 1,
      output_format: 'jpeg' as 'jpeg',
      sync_mode: true,
    };

    // Optional background color guidance
    if (options.backgroundColor) {
      const hex = options.backgroundColor;
      (input as any).prompt = `${finalPrompt}, solid background color ${hex}, no gradients, ensure design remains edge-to-edge`;
    }

    console.log('Calling fal.ai Gemini 2.5 Flash Image with prompt:', input);

    const result = await fal.subscribe('fal-ai/gemini-25-flash-image', {
      input: input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Fal.ai Gemini 2.5 Flash queue update:', update);
      },
    });

    if (!result.data || !result.data.images || result.data.images.length === 0) {
      throw new Error('Fal.ai Gemini 2.5 Flash did not return an image');
    }

    const imageUrl = result.data.images[0].url;
    if (!imageUrl) {
      throw new Error('Fal.ai Gemini 2.5 Flash did not return an image URL');
    }

    console.log('Fal.ai Gemini 2.5 Flash completed');
    return imageUrl;
  } catch (error: any) {
    console.error('Fal.ai Gemini 2.5 Flash error:', error);
    throw new Error(`Image generation failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Edit an image using the specified model
 */
export async function editImage(
  options: ImageEditOptions
): Promise<string> {
  const model = options.model || 'gemini-25';
  
  if (model === 'recraft-v3') {
    return editImageWithRecraftV3(options);
  } else if (model === 'seedream-v4') {
    return editImageWithSeedreamV4(options);
  } else {
    return editImageWithGemini25(options);
  }
}

/**
 * Generate an image using ByteDance Seedream v4 (text-to-image)
 */
async function generateImageWithSeedreamV4(
  options: ImageGenerationOptions
): Promise<string> {
  try {
    // Build style-leading prompt similar to Gemini
    const styleLead = (() => {
      const s = (options.style || '').toLowerCase();
      if (!s) return '';
      if (s.includes('photograph') || s === 'photograph') return 'Create a photograph of';
      if (s.includes('comic')) return 'Create a comic book illustration of';
      if (s.includes('anime')) return 'Create an anime-style illustration of';
      if (s.includes('watercolor')) return 'Create a watercolor painting of';
      if (s.includes('3d')) return 'Create a 3D render of';
      if (s.includes('sketch')) return 'Create a pencil sketch of';
      if (s.includes('pop art')) return 'Create a pop art illustration of';
      if (s.includes('realistic')) return 'Create a realistic illustration of';
      if (s.includes('fantasy')) return 'Create a fantasy illustration of';
      if (s.includes('sci-fi') || s.includes('sci fi') || s.includes('scifi')) return 'Create a sci-fi illustration of';
      if (s.includes('minimalist')) return 'Create a minimalist illustration of';
      if (s.includes('vintage')) return 'Create a vintage-style illustration of';
      if (s.includes('retro')) return 'Create a retro-style illustration of';
      if (s.includes('modern')) return 'Create a modern graphic illustration of';
      if (s.includes('abstract')) return 'Create an abstract illustration of';
      return '';
    })();

    let finalPrompt = styleLead ? `${styleLead} ${options.prompt}` : options.prompt;

    // Background color reinforcement
    if (options.backgroundColor) {
      const hex = options.backgroundColor.trim();
      finalPrompt = `${finalPrompt}, solid background color HEX ${hex}, no gradients, no patterns`;
    }

    // Map aspectRatio to Seedream image_size (choose common sizes close to ratio)
    const ratio = options.aspectRatio || '1:1';
    const sizeMap: Record<string, {width:number;height:number}> = {
      '1:1': { width: 2048, height: 2048 },
      '3:4': { width: 1536, height: 2048 },
      '4:3': { width: 2048, height: 1536 },
      '16:9': { width: 3072, height: 1728 },
      '9:16': { width: 1728, height: 3072 },
      '4:5': { width: 1638, height: 2048 },
    };
    const imageSize = sizeMap[ratio] || sizeMap['1:1'];

    const input: any = {
      prompt: finalPrompt,
      image_size: imageSize,
      num_images: options.numImages || 1,
      sync_mode: true,
      enable_safety_checker: true,
      enhance_prompt_mode: 'standard',
    };

    console.log('Calling fal.ai Seedream v4 t2i with:', { prompt: finalPrompt, image_size: imageSize });

    const result = await fal.subscribe('fal-ai/bytedance/seedream/v4/text-to-image', {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Seedream v4 t2i queue update:', update);
      },
    });

    if (!result.data || !result.data.images || result.data.images.length === 0) {
      throw new Error('Seedream v4 did not return an image');
    }

    const imageUrl = result.data.images[0].url;
    if (!imageUrl) {
      throw new Error('Seedream v4 did not return an image URL');
    }

    console.log('Seedream v4 t2i completed');
    return imageUrl;
  } catch (error: any) {
    console.error('Seedream v4 t2i error:', error);
    throw new Error(`Seedream v4 generation failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Edit an image using ByteDance Seedream v4 (image-to-image)
 */
async function editImageWithSeedreamV4(
  options: ImageEditOptions
): Promise<string> {
  try {
    // Build prompt minimally; Seedream supports editing in unified arch (endpoint assumed)
    let finalPrompt = options.prompt;
    const input: any = {
      prompt: finalPrompt,
      image_urls: [options.imageUrl],
      // image_size is optional; Seedream will infer/scale appropriately for edits
      sync_mode: true,
      enable_safety_checker: true,
      enhance_prompt_mode: 'standard',
    };

    console.log('Calling fal.ai Seedream v4 edit with:', { prompt: finalPrompt });

    const result = await fal.subscribe('fal-ai/bytedance/seedream/v4/edit', {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Seedream v4 edit queue update:', update);
      },
    });

    if (!result.data || !result.data.images || result.data.images.length === 0) {
      throw new Error('Seedream v4 edit did not return an image');
    }

    const imageUrl = result.data.images[0].url;
    if (!imageUrl) {
      throw new Error('Seedream v4 edit did not return an image URL');
    }

    console.log('Seedream v4 edit completed');
    return imageUrl;
  } catch (error: any) {
    console.error('Seedream v4 edit error:', error);
    throw new Error(`Seedream v4 edit failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Edit an image using Recraft V3 i2i
 */
export async function editImageWithRecraftV3(
  options: ImageEditOptions
): Promise<string> {
  try {
    const input: any = {
      prompt: options.prompt,
      image_url: options.imageUrl,
      strength: options.noiseLevel ?? 0.5,
      sync_mode: true,
    };

    // Add custom style_id if provided
    if (options.styleId) {
      input.style_id = options.styleId;
    }

    console.log('Calling fal.ai Recraft V3 image-to-image');

    const result = await fal.subscribe('fal-ai/recraft/v3/image-to-image', {
      input: input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Fal.ai Recraft V3 i2i queue update:', update);
      },
    });

    if (!result.data || !result.data.images || result.data.images.length === 0) {
      throw new Error('Fal.ai Recraft V3 i2i did not return an edited image');
    }

    const imageUrl = result.data.images[0].url;
    if (!imageUrl) {
      throw new Error('Fal.ai Recraft V3 i2i did not return an image URL');
    }

    console.log('Fal.ai Recraft V3 i2i edit completed');
    return imageUrl;
  } catch (error: any) {
    console.error('Fal.ai Recraft V3 i2i edit error:', error);
    throw new Error(`Image editing failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Edit an image using Gemini 2.5 Flash
 */
export async function editImageWithGemini25(
  options: ImageEditOptions
): Promise<string> {
  try {
    // Add guardrails for conservative edits
    let finalPrompt = options.prompt;
    const lower = finalPrompt.toLowerCase();
    if (!lower.includes('minimal change') && !lower.includes('conservative') && !lower.includes('keep the rest unchanged')) {
      finalPrompt = `${finalPrompt}. Apply a minimal, conservative change only; keep the rest unchanged. Preserve subject, composition, style, palette, typography, proportions, and layout. Do not redesign or recompose.`;
    }

    const imageUrls = [options.imageUrl].concat(options.referenceImageUrl ? [options.referenceImageUrl] : []);
    const input: any = {
      prompt: finalPrompt,
      image_urls: imageUrls,
      num_images: 1,
      sync_mode: true,
      noise_level: options.noiseLevel ?? 0.25,
    };

    console.log('Calling fal.ai Gemini 2.5 Flash Edit');

    const result = await fal.subscribe('fal-ai/gemini-25-flash-image/edit', {
      input: input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Fal.ai Gemini 2.5 Flash queue update:', update);
      },
    });

    if (!result.data || !result.data.images || result.data.images.length === 0) {
      throw new Error('Fal.ai Gemini 2.5 Flash did not return an edited image');
    }

    const imageUrl = result.data.images[0].url;
    if (!imageUrl) {
      throw new Error('Fal.ai Gemini 2.5 Flash did not return an image URL');
    }

    console.log('Fal.ai Gemini 2.5 Flash edit completed');
    return imageUrl;
  } catch (error: any) {
    console.error('Fal.ai Gemini 2.5 Flash edit error:', error);
    throw new Error(`Image editing failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate a new design based on a reference image style
 */
export async function generateDesignInStyle(
  referenceImageUrl: string,
  prompt: string,
  aspectRatio?: '1:1' | '3:4' | '4:3' | '16:9' | '9:16' | '4:5'
): Promise<string> {
  try {
    // Convert 4:5 to 3:4 (closest supported aspect ratio)
    let finalAspectRatio = aspectRatio;
    if (finalAspectRatio === '4:5') {
      finalAspectRatio = '3:4';
    }
    
    // Ensure the prompt specifies design-only (no product mockups) and full frame coverage
    let finalPrompt = `${prompt}. Maintain the same artistic style, color palette, and visual aesthetics as the reference image. Standalone graphic design, design artwork only, no product mockup, no t-shirt, no clothing, edge-to-edge design, fills entire frame, no margins, no padding, no whitespace`;
    
    const input: any = {
      prompt: finalPrompt,
      image_urls: [referenceImageUrl],
      num_images: 1,
      sync_mode: true,
      noise_level: 0.5, // Higher noise for more creative interpretation
    };

    if (finalAspectRatio) {
      input.aspect_ratio = finalAspectRatio;
    }

    console.log('Calling fal.ai Gemini 2.5 Flash for style-based generation');

    const result = await fal.subscribe('fal-ai/gemini-25-flash-image/edit', {
      input: input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Fal.ai Gemini 2.5 Flash queue update:', update);
      },
    });

    if (!result.data || !result.data.images || result.data.images.length === 0) {
      throw new Error('Fal.ai Gemini 2.5 Flash did not return an image');
    }

    const imageUrl = result.data.images[0].url;
    if (!imageUrl) {
      throw new Error('Fal.ai Gemini 2.5 Flash did not return an image URL');
    }

    console.log('Style-based generation completed');
    return imageUrl;
  } catch (error: any) {
    console.error('Style-based generation error:', error);
    throw new Error(`Style-based generation failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate a photorealistic t-shirt mockup using the provided design image.
 * Uses Gemini 2.5 Flash edit endpoint with the design as reference content.
 */
export async function generateTshirtMockup(
  designImageUrl: string,
  opts?: { aspectRatio?: '1:1' | '3:4' | '4:3' | '16:9' | '9:16' | '4:5'; tShirtColor?: string }
): Promise<string> {
  try {
    // Convert 4:5 to 3:4 for best support
    let aspectRatio = opts?.aspectRatio || '4:5';
    if (aspectRatio === '4:5') {
      aspectRatio = '3:4';
    }

    // Normalize provided color; allow any non-empty string, prefer HEX if valid
    const rawColorInput = typeof opts?.tShirtColor === 'string' ? opts!.tShirtColor!.trim() : undefined;
    const lower = rawColorInput ? rawColorInput.toLowerCase() : undefined;
    const isHex = !!lower && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(lower);
    const chosenColor = lower; // keep whatever was provided to avoid dropping to neutral
    const hex = isHex ? lower : undefined;
    const hexToName: Record<string, string> = {
      '#ffffff': 'white',
      '#000000': 'black',
      '#808080': 'gray',
      '#d4a017': 'mustard',
      '#1e3a8a': 'blue',
      '#166534': 'green',
      '#b91c1c': 'red',
      '#db2777': 'pink',
    };
    const friendlyName = hex ? hexToName[hex] : undefined;
    const colorLabel = friendlyName ?? (chosenColor ? `HEX ${chosenColor}` : 'neutral');
    const colorInstruction = chosenColor
      ? `The person is wearing a ${colorLabel} t-shirt with the provided design printed on the front, centered on the chest. ${hex ? `The t-shirt fabric color must be EXACTLY HEX ${hex} ` : ''}(solid, no patterns or gradients). Do not substitute other colors. Ensure the t-shirt color MATCHES the design's background color exactly.`
      : 'The person is wearing a neutral t-shirt (white, black, or gray) with the provided design printed on the front, centered on the chest.';

    let prompt = [
      `Create a high-quality, photorealistic studio photograph of a real person wearing a ${colorLabel} t-shirt${hex ? ` (solid fabric color EXACTLY HEX ${hex}, no patterns, no gradients)` : ''} with the PROVIDED DESIGN printed on the front, centered on the chest. Keep the design unchanged, no cropping or distortion.`,
      'Ensure realistic fabric folds, slight shadowing and lighting on the print, with accurate perspective mapping on the shirt.',
      'Neutral seamless background, professional product mockup lighting, front view or slight 3/4 angle.',
      colorInstruction,
      'No frames, no borders, no UI, no captions, no extra text, no watermarks.',
      'Return a single photorealistic product mockup image.'
    ].join(' ');

    const input: any = {
      prompt,
      image_urls: [designImageUrl],
      num_images: 1,
      sync_mode: true,
      // Slightly higher noise to allow composition onto a shirt while preserving the graphic
      noise_level: 0.55,
      aspect_ratio: aspectRatio as any,
      output_format: 'jpeg' as 'jpeg',
    };

    if (chosenColor) {
      const baseNegatives = [
        'patterned shirt', 'striped shirt', 'gradient shirt', 'logo on shirt', 'text on shirt',
        'vibrant colored shirt', 'multi-colored shirt', 'different shirt color', 'two-tone shirt', 'non-solid fabric color'
      ];
      const colorWords = ['white','black','gray','grey','mustard','blue','green','red','pink','beige','cream'];
      const exclude = (friendlyName ?? '').toLowerCase();
      const colorNegatives: string[] = [];
      for (const name of colorWords) {
        if (!exclude || name !== exclude) {
          colorNegatives.push(`${name} shirt`, `${name} t-shirt`, `${name} tee`);
        }
      }
      input.negative_prompt = [...baseNegatives, ...colorNegatives].join(', ');
    }

    console.log('Calling fal.ai Gemini 2.5 Flash for t-shirt mockup');

    const result = await fal.subscribe('fal-ai/gemini-25-flash-image/edit', {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Fal.ai Gemini 2.5 Flash (mockup) queue update:', update);
      },
    });

    if (!result.data || !result.data.images || result.data.images.length === 0) {
      throw new Error('Gemini 2.5 mockup did not return an image');
    }

    const imageUrl = result.data.images[0].url;
    if (!imageUrl) {
      throw new Error('Gemini 2.5 mockup did not return an image URL');
    }

    console.log('T-shirt mockup generation completed');
    return imageUrl;
  } catch (error: any) {
    console.error('T-shirt mockup generation error:', error);
    throw new Error(`Mockup generation failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Remove background from an image using Fal.ai
 * Using rembg model for background removal
 */
export async function removeBackground(imageUrl: string): Promise<string> {
  try {
    console.log('Calling fal.ai Bria RMBG 2.0 background removal');

    const result = await fal.subscribe('fal-ai/bria/background/remove', {
      input: {
        image_url: imageUrl,
        sync_mode: true,
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Fal.ai background removal queue update:', update);
      },
    });

    const url = result?.data?.image?.url;
    if (!url) {
      throw new Error('Background removal did not return an image URL');
    }

    console.log('Background removal completed via Bria RMBG 2.0');
    return url;
  } catch (error: any) {
    console.error('Background removal error:', error);
    throw new Error(`Background removal failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Upscale an image using SeedVR2
 */
export async function upscaleImageSeedVR2(
  imageUrl: string,
  opts?: { upscaleMode?: 'factor' | 'target'; upscaleFactor?: number; targetResolution?: '720p' | '1080p' | '1440p' | '2160p'; outputFormat?: 'png' | 'jpg' | 'webp' }
): Promise<string> {
  try {
    const input: any = {
      image_url: imageUrl,
      upscale_mode: opts?.upscaleMode || 'factor',
      output_format: opts?.outputFormat || 'png',
      sync_mode: true,
    };
    if (input.upscale_mode === 'factor') {
      input.upscale_factor = Math.min(Math.max(opts?.upscaleFactor ?? 2, 1), 10);
    } else if (opts?.targetResolution) {
      input.target_resolution = opts.targetResolution;
    }

    console.log('Calling fal.ai SeedVR2 upscale with:', input);

    const result = await fal.subscribe('fal-ai/seedvr/upscale/image', {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Fal.ai upscaler queue update:', update);
      },
    });

    const url = result?.data?.image?.url;
    if (!url) {
      throw new Error('Upscaler did not return an image URL');
    }
    return url;
  } catch (error: any) {
    console.error('Upscale error:', error);
    throw new Error(`Upscale failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Prepare design for printing by creating knockouts (transparent areas)
 * Similar to DTG RIP software - knocks out black or white areas
 */
export async function prepareDesignForPrint(
  imageUrl: string,
  knockoutType: 'black' | 'white' | 'auto' = 'auto'
): Promise<string> {
  try {
    console.log(`Preparing design for print with ${knockoutType} knockout`);
    
    // Note: Sharp import is dynamic to handle cases where it might not be installed yet
    const sharp = (await import('sharp')).default;
    
    // Fetch the image
    const response = await fetch(imageUrl);
    const imageArrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageArrayBuffer);
    
    // Load image with Sharp
    let image = sharp(buffer).ensureAlpha();
    
    // Get image metadata
    const metadata = await image.metadata();
    const { width, height } = metadata;
    
    if (!width || !height) {
      throw new Error('Could not read image dimensions');
    }
    
    // Get raw pixel data
    const rawBuffer = await image.raw().toBuffer();
    
    // Process pixels to create knockouts
    const pixelData = new Uint8ClampedArray(rawBuffer);
    
    let threshold: number;
    let isDark: boolean;
    
    switch (knockoutType) {
      case 'black':
        threshold = 60; // Knock out pixels with RGB < 60 (very dark)
        isDark = true;
        break;
      case 'white':
        threshold = 200; // Knock out pixels with RGB > 200 (very light)
        isDark = false;
        break;
      default: // 'auto'
        // Knock out white background by default
        threshold = 240;
        isDark = false;
    }
    
    // Process pixels (R, G, B, A format)
    for (let i = 0; i < pixelData.length; i += 4) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];
      
      // Calculate average brightness
      const avg = (r + g + b) / 3;
      
      // Check if pixel should be knocked out
      const shouldKnockout = isDark ? avg < threshold : avg > threshold;
      
      if (shouldKnockout) {
        // Set pixel to fully transparent
        pixelData[i + 3] = 0;
      }
    }
    
    // Create new image from processed pixels
    const processedImage = sharp(pixelData, {
      raw: {
        width,
        height,
        channels: 4,
      },
    });
    
    // Convert to PNG with alpha channel
    const pngBuffer = await processedImage.png().toBuffer();
    
    console.log('Knockout processing complete, image size:', pngBuffer.length, 'bytes');
    
    // Return as data URL (simple and works)
    const base64 = pngBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;
    console.log('Returning knockout as data URL');
    return dataUrl;
    
  } catch (error: any) {
    console.error('Print preparation error:', error);
    
    // If Sharp is not installed, fall back to returning original
    if (error.message?.includes('Cannot find module')) {
      console.log('Sharp not installed - returning original image');
      return imageUrl;
    }
    
    throw new Error(`Print preparation failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Knock out (make transparent) pixels that match a given background color.
 * Useful when the design background should be removed for a specific HEX color.
 * Returns a PNG data URL with transparency applied.
 */
export async function knockOutBackgroundColor(
  imageUrl: string,
  backgroundHex: string,
  tolerance: number = 12 // color distance tolerance (0-255)
): Promise<string> {
  try {
    console.log('Knockout by background color:', backgroundHex, 'tolerance:', tolerance);

    // Validate hex color (#RGB or #RRGGBB)
    const hex = backgroundHex.trim();
    const isHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
    if (!isHex) {
      throw new Error(`Invalid HEX color: ${backgroundHex}`);
    }

    // Parse HEX to RGB
    const parseHex = (h: string) => {
      const clean = h.replace('#', '');
      if (clean.length === 3) {
        const r = parseInt(clean[0] + clean[0], 16);
        const g = parseInt(clean[1] + clean[1], 16);
        const b = parseInt(clean[2] + clean[2], 16);
        return { r, g, b };
      } else {
        const r = parseInt(clean.slice(0, 2), 16);
        const g = parseInt(clean.slice(2, 4), 16);
        const b = parseInt(clean.slice(4, 6), 16);
        return { r, g, b };
      }
    };
    const target = parseHex(hex.toLowerCase());

    // Dynamic import sharp
    const sharp = (await import('sharp')).default;

    // Fetch the image
    const response = await fetch(imageUrl);
    const imageArrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageArrayBuffer);

    // Load image with Sharp and ensure alpha
    let image = sharp(buffer).ensureAlpha();

    // Get metadata
    const metadata = await image.metadata();
    const { width, height } = metadata;
    if (!width || !height) {
      throw new Error('Could not read image dimensions');
    }

    // Get raw pixel data RGBA
    const rawBuffer = await image.raw().toBuffer();
    const pixelData = new Uint8ClampedArray(rawBuffer);

    // Helper: color distance (Manhattan or Euclidean). Use simple Euclidean here
    const colorDistance = (r: number, g: number, b: number) => {
      const dr = r - target.r;
      const dg = g - target.g;
      const db = b - target.b;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      return dist;
    };

    const threshold = Math.max(0, Math.min(255, tolerance));

    // Iterate pixels and knock out those within tolerance of target color
    for (let i = 0; i < pixelData.length; i += 4) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];
      // const a = pixelData[i + 3];
      if (colorDistance(r, g, b) <= threshold) {
        pixelData[i + 3] = 0; // set alpha to 0
      }
    }

    // Reconstruct PNG with alpha
    const processedImage = sharp(pixelData, {
      raw: { width, height, channels: 4 },
    });

    const pngBuffer = await processedImage.png().toBuffer();
    const base64 = pngBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;
    console.log('Knockout by color complete');
    return dataUrl;
  } catch (error: any) {
    console.error('Knockout by color error:', error);
    // Fall back to original image on failure
    return imageUrl;
  }
}
