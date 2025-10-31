import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const designId = searchParams.get('designId');

  if (!designId) {
    return NextResponse.json({ error: 'Design ID is required' }, { status: 400 });
  }

  try {
    // Fetch design
    const { data: designData, error: designError } = await supabase
      .from('designs')
      .select('*')
      .eq('id', designId)
      .eq('user_id', user.id)
      .single();

    if (designError) {
      if (designError.message?.includes('relation') || designError.message?.includes('does not exist')) {
        return NextResponse.json({ error: 'Database tables not set up. Please run the migration in Supabase SQL Editor.' }, { status: 500 });
      }
      console.error('Error loading design:', designError);
      return NextResponse.json({ error: designError.message || 'Design not found' }, { status: 404 });
    }

    if (!designData) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    // Load design image and variations
    const { data: variations, error: variationsError } = await supabase
      .from('design_variations')
      .select('*')
      .eq('design_id', designId)
      .order('created_at', { ascending: true });

    if (variationsError && !variationsError.message?.includes('relation') && !variationsError.message?.includes('does not exist')) {
      console.error('Error loading variations:', variationsError);
    }

    return NextResponse.json({
      design: designData,
      variations: variations || [],
    });
  } catch (error: any) {
    console.error('Error in load design API:', error);
    return NextResponse.json({ error: error.message || 'Failed to load design' }, { status: 500 });
  }
}

