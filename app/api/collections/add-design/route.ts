import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { uploadImageToStorage } from '@/lib/supabase/storage';

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

  // Fetch design data to store in collection
  const { data: design, error: designError } = await supabase
    .from('designs')
    .select('title, prompt, image_url, thumbnail_image_url, aspect_ratio')
    .eq('id', designId)
    .single();

  if (designError || !design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  // Upload images to Supabase Storage if they're not already there
  let templateImageUrl = design.image_url;
  let templateThumbnailUrl = design.thumbnail_image_url || design.image_url;

  // Check if image is already in Supabase Storage or external CDN
  const isSupabaseStorage = design.image_url?.includes(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
  const isExternalCDN = design.image_url?.startsWith('http') && !design.image_url.startsWith('data:');

  if (!isSupabaseStorage && !isExternalCDN) {
    // Upload main image to storage
    try {
      templateImageUrl = await uploadImageToStorage(design.image_url, 'designs', 'templates');
      console.log('Uploaded template image to storage:', templateImageUrl);
    } catch (error: any) {
      console.error('Error uploading template image:', error);
      return NextResponse.json({ error: 'Failed to upload template image to storage' }, { status: 500 });
    }
  }

  if (design.thumbnail_image_url && design.thumbnail_image_url !== design.image_url) {
    const isThumbnailInStorage = design.thumbnail_image_url?.includes(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    const isThumbnailCDN = design.thumbnail_image_url?.startsWith('http') && !design.thumbnail_image_url.startsWith('data:');

    if (!isThumbnailInStorage && !isThumbnailCDN) {
      // Upload thumbnail to storage
      try {
        templateThumbnailUrl = await uploadImageToStorage(design.thumbnail_image_url, 'designs', 'templates');
        console.log('Uploaded template thumbnail to storage:', templateThumbnailUrl);
      } catch (error: any) {
        console.error('Error uploading template thumbnail:', error);
        // Use main image URL if thumbnail upload fails
        templateThumbnailUrl = templateImageUrl;
      }
    }
  } else {
    templateThumbnailUrl = templateImageUrl;
  }

  // Check if template already exists in this collection (by image_url)
  const { data: existing } = await supabase
    .from('design_collections')
    .select('id, tags')
    .eq('collection_id', collectionId)
    .eq('template_image_url', templateImageUrl)
    .single();

  if (existing) {
    // Update existing template with new tags (merge with existing tags, remove duplicates)
    const existingTags = existing.tags || [];
    const newTags = tags && Array.isArray(tags) ? tags : [];
    const mergedTags = Array.from(new Set([...existingTags, ...newTags]));

    const { data, error } = await supabase
      .from('design_collections')
      .update({
        tags: mergedTags,
        // Also update metadata in case design changed
        title: design.title,
        prompt: design.prompt,
        template_thumbnail_image_url: templateThumbnailUrl,
        aspect_ratio: design.aspect_ratio || '1:1',
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

  // Create the template in collection with design metadata
  const { data, error } = await supabase
    .from('design_collections')
    .insert({
      collection_id: collectionId,
      title: design.title,
      prompt: design.prompt,
      template_image_url: templateImageUrl,
      template_thumbnail_image_url: templateThumbnailUrl,
      aspect_ratio: design.aspect_ratio || '1:1',
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

