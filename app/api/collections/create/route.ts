import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name } = await request.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('collections')
    .insert({
      name: name.trim().toLowerCase(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ collection: data });
}

