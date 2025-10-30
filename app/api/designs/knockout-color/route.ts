import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { knockOutBackgroundColor } from '@/lib/fal/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    const allowPublic = process.env.NEXT_PUBLIC_ALLOW_PUBLIC_API === 'true' || process.env.NODE_ENV !== 'production';

    if (!allowPublic && isSupabaseConfigured && !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to knock out background color.' }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl, backgroundHex, tolerance } = body || {};
    if (!imageUrl || !backgroundHex) {
      return NextResponse.json({ error: 'imageUrl and backgroundHex are required' }, { status: 400 });
    }

    const resultUrl = await knockOutBackgroundColor(imageUrl, backgroundHex, typeof tolerance === 'number' ? tolerance : 12);
    return NextResponse.json({ imageUrl: resultUrl });
  } catch (error: any) {
    console.error('Error in knockout-color:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to knock out background color' },
      { status: 500 }
    );
  }
}


