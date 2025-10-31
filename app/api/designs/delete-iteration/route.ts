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
    const { data: deletedData, error: deleteError } = await supabase
      .from('design_variations')
      .delete()
      .eq('id', variationId)
      .eq('design_id', designId)
      .select();

    if (deleteError) {
      console.error('Error deleting variation:', deleteError);
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete iteration' },
        { status: 500 }
      );
    }

    // Check if anything was actually deleted (could be RLS policy issue)
    if (!deletedData || deletedData.length === 0) {
      console.warn('No variation deleted - may be due to RLS policy or variation not found');
      return NextResponse.json(
        { error: 'Variation not found or access denied. Make sure RLS DELETE policy exists for design_variations.' },
        { status: 404 }
      );
    }

    console.log('Successfully deleted variation:', variationId);
    return NextResponse.json({ success: true, deleted: deletedData });
  } catch (error: any) {
    console.error('Error deleting iteration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete iteration' },
      { status: 500 }
    );
  }
}

