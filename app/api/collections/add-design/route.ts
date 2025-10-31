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

  const { collectionId, designId, tags } = await request.json();

  if (!collectionId || !designId) {
    return NextResponse.json({ error: 'Collection ID and Design ID are required' }, { status: 400 });
  }

  // Verify collection exists
  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .select('id')
    .eq('id', collectionId)
    .single();

  if (collectionError || !collection) {
    return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
  }

  // Verify design exists
  const { data: design, error: designError } = await supabase
    .from('designs')
    .select('id')
    .eq('id', designId)
    .single();

  if (designError || !design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  // Check if relationship already exists - if so, update it with new tags
  const { data: existing } = await supabase
    .from('design_collections')
    .select('id, tags')
    .eq('design_id', designId)
    .eq('collection_id', collectionId)
    .single();

  if (existing) {
    // Update existing relationship with new tags (merge with existing tags, remove duplicates)
    const existingTags = existing.tags || [];
    const newTags = tags && Array.isArray(tags) ? tags : [];
    const mergedTags = Array.from(new Set([...existingTags, ...newTags]));

    const { data, error } = await supabase
      .from('design_collections')
      .update({
        tags: mergedTags,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating design collection:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, relationship: data, updated: true });
  }

  // Create the relationship with tags
  const { data, error } = await supabase
    .from('design_collections')
    .insert({
      design_id: designId,
      collection_id: collectionId,
      tags: tags && Array.isArray(tags) ? tags : [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding design to collection:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, relationship: data });
}

