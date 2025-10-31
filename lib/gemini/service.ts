import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

/**
 * Initialize Gemini AI client
 */
export function initializeGemini() {
  if (!ai && process.env.GOOGLE_GENAI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    });
  }
  return ai;
}

/**
 * Generate a design prompt based on user input and reference style
 */
export async function generateDesignPrompt(
  userPrompt: string,
  referenceStyleDescription?: string,
  artStyle?: string,
  backgroundColorHex?: string
): Promise<string> {
  const gemini = initializeGemini();
  if (!gemini) {
    throw new Error('Gemini AI not initialized');
  }

  try {
    let systemInstruction = "You are an expert t-shirt design prompt engineer. Create detailed, creative prompts for AI image generation that will result in high-quality t-shirt designs.";
    
    let content = `Create a detailed AI image generation prompt for a t-shirt design based on this request: "${userPrompt}"`;
    
    if (artStyle) {
      content += `\n\nThe design should be rendered in "${artStyle}" art style. Incorporate the key visual characteristics, techniques, and aesthetics typical of this style.`;
    }
    
    if (referenceStyleDescription) {
      content += `\n\nReference style description: "${referenceStyleDescription}"\n\nMake sure the new design maintains the same artistic style, color palette, and visual aesthetics.`;
    }
    
    if (backgroundColorHex && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(backgroundColorHex.trim())) {
      content += `\n\nBACKGROUND: Use a solid background color HEX ${backgroundColorHex.trim()} (no gradients, no textures, no patterns).`;
    }
    
    content += '\n\nIMPORTANT: The prompt must generate ONLY the design graphic itself - a standalone design artwork that fills the entire frame edge-to-edge with no margins, padding, or whitespace. The design must extend to all edges of the canvas. Do NOT include product mockups, t-shirt images, or clothing in the output. The design should be the artwork only, ready to be printed on apparel.';
    
    content += '\n\nReturn only the optimized prompt, no additional text.';

    const response = await gemini.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: content,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.9,
      },
    });

    // Extract text from response
    let prompt = '';
    if (response.text) {
      prompt = response.text.trim();
    } else if (response.candidates?.[0]?.content?.parts) {
      const parts = response.candidates[0].content.parts;
      const textPart = parts.find((part: any) => part.text);
      if (textPart && textPart.text) {
        prompt = textPart.text.trim();
      }
    }

    if (!prompt) {
      throw new Error('No prompt generated from Gemini');
    }

    return prompt;
  } catch (error) {
    console.error('Error generating design prompt:', error);
    // Fallback to user prompt if AI generation fails
    return userPrompt;
  }
}

/**
 * Generate a conservative edit prompt that preserves the existing design
 * and applies only the requested localized change(s).
 */
export async function generateConservativeEditPrompt(
  userPrompt: string,
  imageUrl?: string
): Promise<string> {
  const gemini = initializeGemini();
  if (!gemini) {
    throw new Error('Gemini AI not initialized');
  }

  try {
    let styleDescription = '';
    
    // Analyze the existing image's style if imageUrl is provided
    if (imageUrl) {
      try {
        styleDescription = await analyzeDesignStyle(imageUrl);
      } catch (error) {
        console.error('Error analyzing design style for edit, continuing without style analysis:', error);
      }
    }

    const systemInstruction = "You are an expert design retoucher. You apply precise, localized edits while preserving the existing composition, subject, style, palette, and typography.";

    let content = `Refine this t-shirt design with a conservative, localized edit: "${userPrompt}"`;

    // Include style description if available
    if (styleDescription) {
      content += `\n\nIMPORTANT - EXISTING DESIGN STYLE:\n${styleDescription}\n\nYou MUST preserve ALL of these style characteristics: the artistic technique, rendering style, color palette, visual aesthetics, line quality, shading, textures, and overall design approach. The edited result must look like it was created by the same artist using the same style.`;
    }

    content += '\n\nEditing Rules:' +
      '\n- Make ONLY the minimal change necessary to satisfy the user request.' +
      '\n- CRITICALLY IMPORTANT: Match the existing style exactly - same artistic technique, rendering style, color palette, line quality, shading, textures, and visual aesthetics.' +
      '\n- Preserve the subject, composition, proportions, style, color palette, textures, lighting, typography, and visual mood.' +
      "\n- Do NOT redesign or recompose the whole image; avoid changing pose, camera angle, layout, or background unless explicitly requested." +
      '\n- Keep all elements aligned, sized, and styled consistently with the current design.' +
      '\n- The edit should seamlessly blend with the existing style - it should be impossible to tell which part was edited.' +
      '\n- Edge-to-edge output with no margins or whitespace.' +
      '\n- Output must read as the SAME design, with the requested change applied while maintaining perfect style consistency.';

    content += '\n\nReturn only the optimized prompt, no additional text.';

    const response = await gemini.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: content,
      config: {
        systemInstruction,
        temperature: 0.3, // Lower temperature for more consistent style matching
      },
    });

    let prompt = '';
    if (response.text) {
      prompt = response.text.trim();
    } else if (response.candidates?.[0]?.content?.parts) {
      const parts = response.candidates[0].content.parts;
      const textPart = parts.find((part: any) => part.text);
      if (textPart && textPart.text) {
        prompt = textPart.text.trim();
      }
    }

    if (!prompt) {
      throw new Error('No prompt generated from Gemini');
    }

    return prompt;
  } catch (error) {
    console.error('Error generating conservative edit prompt:', error);
    return userPrompt;
  }
}

/**
 * Analyze a design image and describe its style
 */
export async function analyzeDesignStyle(imageUrl: string): Promise<string> {
  const gemini = initializeGemini();
  if (!gemini) {
    throw new Error('Gemini AI not initialized');
  }

  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: `Analyze this design image and describe its style, color palette, artistic techniques, and visual aesthetics in detail: ${imageUrl}`,
      config: {
        systemInstruction: "You are an expert in visual design analysis. Provide detailed descriptions of design styles, color palettes, and artistic techniques.",
        temperature: 0.7,
      },
    });

    let description = '';
    if (response.text) {
      description = response.text.trim();
    } else if (response.candidates?.[0]?.content?.parts) {
      const parts = response.candidates[0].content.parts;
      const textPart = parts.find((part: any) => part.text);
      if (textPart && textPart.text) {
        description = textPart.text.trim();
      }
    }

    return description || 'Unable to analyze design style';
  } catch (error) {
    console.error('Error analyzing design style:', error);
    throw new Error('Failed to analyze design style');
  }
}
