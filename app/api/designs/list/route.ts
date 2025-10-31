import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('designs')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to fetch designs' },
        { status: 500 }
      );
    }

    // Use thumbnail_image_url if available, otherwise fall back to image_url
    const designsWithThumbnails = (data || []).map(design => ({
      ...design,
      image_url: design.thumbnail_image_url || design.image_url,
    }));

    return NextResponse.json({ designs: designsWithThumbnails });
  } catch (error: any) {
    console.error('Error fetching designs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch designs' },
      { status: 500 }
    );
  }
}

