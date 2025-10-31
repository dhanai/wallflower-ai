import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    return NextResponse.json({ role: userData?.role || null });
  } catch (error: any) {
    console.error('Error fetching user role:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch user role' }, { status: 500 });
  }
}

