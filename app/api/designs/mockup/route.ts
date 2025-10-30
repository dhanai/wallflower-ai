import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTshirtMockup } from '@/lib/fal/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    const allowPublic = process.env.NEXT_PUBLIC_ALLOW_PUBLIC_API === 'true' || process.env.NODE_ENV !== 'production';

    if (!allowPublic && isSupabaseConfigured && !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to preview mockups.' }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl, aspectRatio, tShirtColor } = body || {};

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    const mockupUrl = await generateTshirtMockup(imageUrl, { aspectRatio: aspectRatio || '4:5', tShirtColor });

    return NextResponse.json({ imageUrl: mockupUrl });
  } catch (error: any) {
    console.error('Error generating t-shirt mockup:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate t-shirt mockup' },
      { status: 500 }
    );
  }
}


