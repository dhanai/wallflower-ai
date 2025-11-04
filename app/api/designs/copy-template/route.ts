import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { templateDesignId } = await request.json();

    if (!templateDesignId) {
      return NextResponse.json({ error: 'Template design ID is required' }, { status: 400 });
    }

    // Fetch the template from design_collections (templates are stored directly there)
    // templateDesignId is actually the template_image_url or we need to find it by image URL
    // For now, let's search by image URL pattern - but we need to rethink the ID
    // Actually, let's make templateDesignId be the design_collections.id
    const { data: template, error: templateError } = await supabase
      .from('design_collections')
      .select('title, prompt, template_image_url, template_thumbnail_image_url, aspect_ratio')
      .eq('id', templateDesignId)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Create a new design in the user's account with the template's metadata
    // Prefer template_thumbnail_image_url if it exists and differs from template_image_url
    // This fixes existing templates that were saved before the fix (thumbnail has correct iteration)
    const templateImageUrl = template.template_thumbnail_image_url && 
                            template.template_thumbnail_image_url !== template.template_image_url
                            ? template.template_thumbnail_image_url // Use thumbnail if it's different (likely the correct iteration)
                            : template.template_image_url; // Otherwise use main image
    const templateThumbnailUrl = template.template_thumbnail_image_url || template.template_image_url;
    
    const { data: newDesign, error: createError } = await supabase
      .from('designs')
      .insert({
        user_id: user.id,
        title: `${template.title || 'Untitled'} (copy)`,
        prompt: template.prompt || '',
        image_url: templateImageUrl, // Use the template's final image (prefer thumbnail if different)
        thumbnail_image_url: templateThumbnailUrl, // Use the template's thumbnail
        aspect_ratio: template.aspect_ratio || '1:1',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating design from template:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      design: newDesign 
    });
  } catch (error: any) {
    console.error('Error in copy-template API:', error);
    return NextResponse.json({ error: error.message || 'Failed to copy template' }, { status: 500 });
  }
}

