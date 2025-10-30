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
    const { designId } = body;

    if (!designId) {
      return NextResponse.json(
        { error: 'Design ID is required' },
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

    // Delete all variations first (CASCADE should handle this, but being explicit)
    const { error: variationsError } = await supabase
      .from('design_variations')
      .delete()
      .eq('design_id', designId);

    if (variationsError) {
      console.error('Error deleting variations:', variationsError);
      // Continue anyway - might not have variations
    }

    // Delete the design
    const { error: deleteError } = await supabase
      .from('designs')
      .delete()
      .eq('id', designId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting design:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete design' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting design:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete design' },
      { status: 500 }
    );
  }
}

