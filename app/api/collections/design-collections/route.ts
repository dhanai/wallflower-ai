import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const designId = searchParams.get('designId');

  if (!designId) {
    return NextResponse.json({ error: 'Design ID is required' }, { status: 400 });
  }

  try {
    // First, get the design's image_url to find matching templates
    const { data: design, error: designError } = await supabase
      .from('designs')
      .select('image_url, thumbnail_image_url')
      .eq('id', designId)
      .single();

    if (designError || !design) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    // Find templates that match this design's image (templates are stored in design_collections)
    // Match by either image_url or thumbnail_image_url
    const imageMatches = [
      `template_image_url.eq.${design.image_url}`,
      `template_thumbnail_image_url.eq.${design.image_url}`,
    ];
    
    // Also check thumbnail if it exists and is different
    if (design.thumbnail_image_url && design.thumbnail_image_url !== design.image_url) {
      imageMatches.push(
        `template_image_url.eq.${design.thumbnail_image_url}`,
        `template_thumbnail_image_url.eq.${design.thumbnail_image_url}`
      );
    }
    
    const { data: designCollections, error: dcError } = await supabase
      .from('design_collections')
      .select('id, collection_id, tags')
      .or(imageMatches.join(','));

    if (dcError) {
      console.error('Error fetching design collections:', dcError);
      return NextResponse.json({ error: dcError.message }, { status: 500 });
    }

    if (!designCollections || designCollections.length === 0) {
      return NextResponse.json({ collections: [] });
    }

    // Fetch collection details
    const collectionIds = designCollections.map(dc => dc.collection_id);
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('id, name')
      .in('id', collectionIds);

    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError);
      return NextResponse.json({ error: collectionsError.message }, { status: 500 });
    }

    // Map collections with their tags
    const collectionsWithTags = collections?.map(collection => {
      const dc = designCollections.find(dc => dc.collection_id === collection.id);
      return {
        ...collection,
        tags: dc?.tags || [],
      };
    }) || [];

    return NextResponse.json({ collections: collectionsWithTags });
  } catch (error: any) {
    console.error('Error in design-collections API:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch design collections' }, { status: 500 });
  }
}

