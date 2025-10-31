import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDesignInStyle } from '@/lib/fal/service';
import { analyzeDesignStyle } from '@/lib/gemini/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication (but allow unauthenticated for testing if Supabase not configured)
    const { data: { user } } = await supabase.auth.getUser();
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                                  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    const allowPublic = process.env.NEXT_PUBLIC_ALLOW_PUBLIC_API === 'true' || process.env.NODE_ENV !== 'production';
    
    if (!allowPublic && isSupabaseConfigured && !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to use style transfer.' }, { status: 401 });
    }

    const body = await request.json();
    const { referenceImageUrl, prompt, aspectRatio, designId } = body;

    if (!referenceImageUrl || !prompt) {
      return NextResponse.json(
        { error: 'Reference image URL and prompt are required' },
        { status: 400 }
      );
    }

    // Analyze the reference image style
    let styleDescription = '';
    try {
      styleDescription = await analyzeDesignStyle(referenceImageUrl);
    } catch (error) {
      console.error('Error analyzing style, continuing anyway:', error);
    }

    // Use original prompt as-is (skip optimizer)
    const optimizedPrompt = prompt;

    // Generate new design in the same style
    const newImageUrl = await generateDesignInStyle(
      referenceImageUrl,
      optimizedPrompt,
      aspectRatio || '4:5'
    );

    // Save design to database only if user is authenticated and Supabase is configured
    let design = null;
    if (user && isSupabaseConfigured) {
      try {
        // Ensure user exists in public.users table
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!existingUser) {
          // Create user in public.users table
          const { error: userError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email || null,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            });

          if (userError) {
            console.error('Error creating user in public.users:', userError);
          } else {
            console.log('Created user in public.users:', user.id);
          }
        }

        // If designId is provided, update existing design; otherwise create new
        if (designId) {
          // Verify the design belongs to the user before updating
          const { data: existingDesign, error: checkError } = await supabase
            .from('designs')
            .select('id, user_id')
            .eq('id', designId)
            .eq('user_id', user.id)
            .single();

          if (checkError || !existingDesign) {
            console.error('Design not found or access denied:', checkError);
          } else {
            // Update existing design
            const { data: designData, error: dbError } = await supabase
              .from('designs')
              .update({
                title: prompt.substring(0, 100),
                prompt: optimizedPrompt,
                image_url: newImageUrl,
                style_description: styleDescription,
                aspect_ratio: aspectRatio || '4:5',
                thumbnail_image_url: newImageUrl, // Update thumbnail to new image
              })
              .eq('id', designId)
              .eq('user_id', user.id)
              .select()
              .single();

            if (!dbError && designData) {
              design = designData;
              console.log('Design updated successfully:', designData.id);
            } else if (dbError) {
              console.error('Database error updating design:', dbError);
            }
          }
        } else {
          // Create new design
          const { data: designData, error: dbError } = await supabase
            .from('designs')
            .insert({
              user_id: user.id,
              title: prompt.substring(0, 100),
              prompt: optimizedPrompt,
              image_url: newImageUrl,
              style_description: styleDescription,
              aspect_ratio: aspectRatio || '4:5',
            })
            .select()
            .single();

          if (!dbError && designData) {
            design = designData;
          } else if (dbError) {
            console.error('Database error saving design:', dbError);
          }
        }
      } catch (dbError) {
        console.error('Database error (non-fatal):', dbError);
        // Continue even if save fails
      }
    }

    return NextResponse.json({ 
      design,
      imageUrl: newImageUrl,
      styleDescription,
    });
  } catch (error: any) {
    console.error('Error in style transfer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate design in style' },
      { status: 500 }
    );
  }
}
