import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateImage } from '@/lib/fal/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                                  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    const allowPublic = process.env.NEXT_PUBLIC_ALLOW_PUBLIC_API === 'true' || process.env.NODE_ENV !== 'production';

    if (!allowPublic && isSupabaseConfigured && !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to generate designs.' }, { status: 401 });
    }

          const body = await request.json();
          const { prompt, aspectRatio, referenceImageUrl, artStyle, model, style, styleId, backgroundColor } = body;

          if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
          }

          // Use the original prompt as-is (skip optimizer for Recraft/Gemini)
          const optimizedPrompt = prompt;

          // Generate image using the specified model
          const imageUrl = await generateImage({
            prompt: optimizedPrompt,
            aspectRatio: aspectRatio || '4:5',
            numImages: 1,
            model: model || 'gemini-25',
            style: style,
            styleId: styleId,
            backgroundColor,
          });

    // Save design to database only if user is authenticated and Supabase is configured
    let design = null;
    if (user && isSupabaseConfigured) {
      try {
        const { data: designData, error: dbError } = await supabase
          .from('designs')
          .insert({
            user_id: user.id,
            title: prompt.substring(0, 100),
            prompt: optimizedPrompt,
            image_url: imageUrl,
            aspect_ratio: aspectRatio || '4:5',
          })
          .select()
          .single();

        if (!dbError && designData) {
          design = designData;
        }
      } catch (dbError) {
        console.error('Database error (non-fatal):', dbError);
        // Continue even if save fails
      }
    }

    return NextResponse.json({ 
      design,
      imageUrl,
    });
  } catch (error: any) {
    console.error('Error generating design:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate design' },
      { status: 500 }
    );
  }
}
