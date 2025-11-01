export const dynamic = 'force-dynamic';

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

    // Fetch design-collection relationships with tags and template metadata
    const { data: designCollections, error: dcError } = await supabase
      .from('design_collections')
      .select('id, collection_id, title, prompt, template_image_url, template_thumbnail_image_url, aspect_ratio, tags')
      .in('collection_id', collections.map(c => c.id));

    if (dcError) {
      console.error('Error fetching design collections:', dcError);
      return NextResponse.json({ error: dcError.message }, { status: 500 });
    }

    if (!designCollections || designCollections.length === 0) {
      return NextResponse.json({ templatesByCollection: collections.map(c => ({ collection: c, designs: [] })) });
    }

    // Group templates by collection - templates are now stored directly in design_collections
    const templatesByCollection = collections.map(collection => {
      const collectionTemplates = designCollections
        ?.filter(dc => dc.collection_id === collection.id) || [];

      const templates = collectionTemplates.map(template => ({
        id: (template as any).id, // Use design_collections.id as the template ID
        title: template.title,
        prompt: template.prompt,
        image_url: template.template_thumbnail_image_url || template.template_image_url,
        thumbnail_image_url: template.template_thumbnail_image_url,
        aspect_ratio: template.aspect_ratio || '1:1',
        category: collection.name, // Use collection name as category
        tags: template.tags || [], // Include tags from the relationship
        created_at: '', // Templates don't have created_at in this structure
      }));

      return {
        collection: {
          id: collection.id,
          name: collection.name,
          description: collection.description,
        },
        designs: templates,
      };
    }).filter(item => item.designs.length > 0); // Only include collections with designs

    return NextResponse.json({ templatesByCollection });
  } catch (error: any) {
    console.error('Error in templates API:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch templates' }, { status: 500 });
  }
}

