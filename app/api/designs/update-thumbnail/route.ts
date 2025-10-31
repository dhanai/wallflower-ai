import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { designId, thumbnailUrl } = await request.json();

    if (!designId || !thumbnailUrl) {
      return NextResponse.json({ error: 'Design ID and thumbnail URL are required' }, { status: 400 });
    }

    // Verify the design belongs to the user
    const { data: design, error: designError } = await supabase
      .from('designs')
      .select('id, user_id')
      .eq('id', designId)
      .eq('user_id', user.id)
      .single();

    if (designError || !design) {
      return NextResponse.json({ error: 'Design not found or access denied' }, { status: 404 });
    }

    // Update thumbnail
    const { error: updateError } = await supabase
      .from('designs')
      .update({ thumbnail_image_url: thumbnailUrl })
      .eq('id', designId)
      .eq('user_id', user.id); // Extra safety check

    if (updateError) {
      console.error('Error updating thumbnail:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in update-thumbnail API:', error);
    return NextResponse.json({ error: error.message || 'Failed to update thumbnail' }, { status: 500 });
  }
}

