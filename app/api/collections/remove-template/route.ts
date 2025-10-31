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

  const { templateId } = await request.json();

  if (!templateId) {
    return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
  }

  try {
    // Delete the template from design_collections
    const { error } = await supabase
      .from('design_collections')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in remove-template API:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove template' }, { status: 500 });
  }
}

