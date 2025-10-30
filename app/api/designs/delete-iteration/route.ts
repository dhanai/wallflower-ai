import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { designId, variationId } = body;

    if (!designId || !variationId) {
      return NextResponse.json(
        { error: 'Design ID and variation ID are required' },
        { status: 400 }
      );
    }

    // Verify the design belongs to the user
    const { data: design, error: designError } = await supabase
      .from('designs')
      .select('id, user_id')
      .eq('id', designId)
      .eq('user_id', user.id)
      .single();

    if (designError || !design) {
      return NextResponse.json(
        { error: 'Design not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the variation
    const { error: deleteError } = await supabase
      .from('design_variations')
      .delete()
      .eq('id', variationId)
      .eq('design_id', designId);

    if (deleteError) {
      console.error('Error deleting variation:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete iteration' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting iteration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete iteration' },
      { status: 500 }
    );
  }
}

