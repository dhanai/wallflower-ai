import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { editImage } from '@/lib/fal/service';
import { generateConservativeEditPrompt } from '@/lib/gemini/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication (but allow unauthenticated for testing if Supabase not configured)
    const { data: { user } } = await supabase.auth.getUser();
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                                  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    const allowPublic = process.env.NEXT_PUBLIC_ALLOW_PUBLIC_API === 'true' || process.env.NODE_ENV !== 'production';
    
    if (!allowPublic && isSupabaseConfigured && !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to edit designs.' }, { status: 401 });
    }

    const body = await request.json();
    const { designId, imageUrl, editPrompt, noiseLevel, model, styleId, referenceImageUrl } = body;

    if (!imageUrl || !editPrompt) {
      return NextResponse.json(
        { error: 'Image URL and edit prompt are required' },
        { status: 400 }
      );
    }

    // Generate conservative edit prompt using Gemini (only for Gemini 2.5 edits)
    let optimizedPrompt = editPrompt;
    if (!model || model === 'gemini-25') {
      try {
        optimizedPrompt = await generateConservativeEditPrompt(editPrompt);
      } catch (error) {
        console.error('Error generating optimized edit prompt, using original:', error);
      }
    }

    // Edit image using the specified model
    const editedImageUrl = await editImage({
      imageUrl,
      prompt: optimizedPrompt,
      noiseLevel: noiseLevel || 0.3,
      model: model || 'gemini-25',
      styleId,
      referenceImageUrl,
    });

    // Save variation to database if designId is provided
    if (designId && user && isSupabaseConfigured) {
      try {
        const { error: dbError } = await supabase
          .from('design_variations')
          .insert({
            design_id: designId,
            image_url: editedImageUrl,
            variation_type: 'edited',
            prompt: optimizedPrompt,
          });

        if (dbError) {
          // Check if error is due to missing table
          if (dbError.message?.includes('relation') || dbError.message?.includes('does not exist')) {
            console.error('Database tables not set up. Please run the migration file in Supabase SQL Editor.');
          } else {
            console.error('Database error saving variation (non-fatal):', dbError);
          }
        }
      } catch (dbError) {
        // Check if error is due to missing table
        if (dbError instanceof Error && (dbError.message?.includes('relation') || dbError.message?.includes('does not exist'))) {
          console.error('Database tables not set up. Please run the migration file in Supabase SQL Editor.');
        } else {
          console.error('Database error saving variation (non-fatal):', dbError);
        }
        // Continue even if save fails
      }
    }

    return NextResponse.json({ 
      imageUrl: editedImageUrl,
    });
  } catch (error: any) {
    console.error('Error editing design:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to edit design' },
      { status: 500 }
    );
  }
}
