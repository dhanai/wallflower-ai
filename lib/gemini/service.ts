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
  userPrompt: string
): Promise<string> {
  const gemini = initializeGemini();
  if (!gemini) {
    throw new Error('Gemini AI not initialized');
  }

  try {
    const systemInstruction = "You are an expert design retoucher. You apply precise, localized edits while preserving the existing composition, subject, style, palette, and typography.";

    let content = `Refine this t-shirt design with a conservative, localized edit: "${userPrompt}"`;

    content += '\n\nRules:' +
      '\n- Make only the minimal change necessary to satisfy the request.' +
      '\n- Preserve subject, composition, proportions, style, color palette, textures, lighting, and typography.' +
      "\n- Do not redesign or recompose the whole image; avoid changing pose, camera, layout, or background unless explicitly requested." +
      '\n- Keep all elements aligned and sized consistently with the current design.' +
      '\n- Edge-to-edge output with no margins or whitespace.' +
      '\n- Output should read as the same design, slightly adjusted.';

    content += '\n\nReturn only the optimized prompt, no additional text.';

    const response = await gemini.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: content,
      config: {
        systemInstruction,
        temperature: 0.5,
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
