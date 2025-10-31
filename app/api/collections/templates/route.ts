import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all collections with their associated designs
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
      .order('name', { ascending: true });

    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError);
      return NextResponse.json({ error: collectionsError.message }, { status: 500 });
    }

    if (!collections || collections.length === 0) {
      return NextResponse.json({ templatesByCollection: [] });
    }

    // Fetch design-collection relationships with tags
    const { data: designCollections, error: dcError } = await supabase
      .from('design_collections')
      .select('design_id, collection_id, tags')
      .in('collection_id', collections.map(c => c.id));

    if (dcError) {
      console.error('Error fetching design collections:', dcError);
      return NextResponse.json({ error: dcError.message }, { status: 500 });
    }

    // Get all unique design IDs from collections
    const designIds = Array.from(new Set(designCollections?.map(dc => dc.design_id) || []));

    if (designIds.length === 0) {
      return NextResponse.json({ templatesByCollection: collections.map(c => ({ collection: c, designs: [] })) });
    }

    // Fetch designs with their thumbnail_image_url
    const { data: designs, error: designsError } = await supabase
      .from('designs')
      .select('*')
      .in('id', designIds);

    if (designsError) {
      console.error('Error fetching designs:', designsError);
      return NextResponse.json({ error: designsError.message }, { status: 500 });
    }

    // Group designs by collection and include tags
    const templatesByCollection = collections.map(collection => {
      const collectionDesignRelations = designCollections
        ?.filter(dc => dc.collection_id === collection.id) || [];

      const collectionDesignIds = collectionDesignRelations.map(dc => dc.design_id);

      // Create a map of design_id to tags
      const designTagsMap = new Map(
        collectionDesignRelations.map(dc => [dc.design_id, dc.tags || []])
      );

      const collectionDesigns = (designs || [])
        .filter(design => collectionDesignIds.includes(design.id))
        .map(design => ({
          ...design,
          image_url: design.thumbnail_image_url || design.image_url,
          category: collection.name, // Use collection name as category
          tags: designTagsMap.get(design.id) || [], // Include tags from the relationship
        }));

      return {
        collection: {
          id: collection.id,
          name: collection.name,
          description: collection.description,
        },
        designs: collectionDesigns,
      };
    }).filter(item => item.designs.length > 0); // Only include collections with designs

    return NextResponse.json({ templatesByCollection });
  } catch (error: any) {
    console.error('Error in templates API:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch templates' }, { status: 500 });
  }
}

