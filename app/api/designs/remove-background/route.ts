import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { removeBackground } from '@/lib/fal/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication (but allow unauthenticated for testing if Supabase not configured)
    const { data: { user } } = await supabase.auth.getUser();
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                                  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    const allowPublic = process.env.NEXT_PUBLIC_ALLOW_PUBLIC_API === 'true' || process.env.NODE_ENV !== 'production';
    
    if (!allowPublic && isSupabaseConfigured && !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to remove backgrounds.' }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Remove background using Fal.ai
    const resultImageUrl = await removeBackground(imageUrl);

    return NextResponse.json({ 
      imageUrl: resultImageUrl,
    });
  } catch (error: any) {
    console.error('Error removing background:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove background' },
      { status: 500 }
    );
  }
}
