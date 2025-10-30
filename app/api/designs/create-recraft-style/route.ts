import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRecraftStyle } from '@/lib/fal/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                                  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    const allowPublic = process.env.NEXT_PUBLIC_ALLOW_PUBLIC_API === 'true' || process.env.NODE_ENV !== 'production';
    
    if (!allowPublic && isSupabaseConfigured && !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to create styles.' }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrls, baseStyle } = body;

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'Image URLs are required' },
        { status: 400 }
      );
    }

    // Create custom style using Recraft
    const styleId = await createRecraftStyle(imageUrls, baseStyle);

    return NextResponse.json({ 
      styleId,
    });
  } catch (error: any) {
    console.error('Error creating Recraft style:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create custom style' },
      { status: 500 }
    );
  }
}

