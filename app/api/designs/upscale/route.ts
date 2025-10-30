import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { upscaleImageSeedVR2 } from '@/lib/fal/service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isSupabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
    const allowPublic = process.env.NEXT_PUBLIC_ALLOW_PUBLIC_API === 'true' || process.env.NODE_ENV !== 'production';

    if (!allowPublic && isSupabaseConfigured && !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to upscale.' }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl, upscaleMode, upscaleFactor, targetResolution, outputFormat } = body || {};
    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    const url = await upscaleImageSeedVR2(imageUrl, {
      upscaleMode,
      upscaleFactor,
      targetResolution,
      outputFormat: outputFormat || 'png',
    });

    return NextResponse.json({ imageUrl: url });
  } catch (error: any) {
    console.error('Error upscaling image:', error);
    return NextResponse.json({ error: error?.message || 'Failed to upscale image' }, { status: 500 });
  }
}


