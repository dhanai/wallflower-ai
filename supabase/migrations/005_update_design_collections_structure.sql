-- Update design_collections to store design metadata directly instead of referencing design_id
-- This makes templates independent copies that don't rely on the original design

-- First, add new columns for design metadata (nullable for now)
ALTER TABLE public.design_collections
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS prompt TEXT,
ADD COLUMN IF NOT EXISTS template_image_url TEXT,
ADD COLUMN IF NOT EXISTS template_thumbnail_image_url TEXT,
ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '1:1';

-- Migrate existing data (if any exists) - copy design data from designs table
-- Only migrate if design_id column still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'design_collections' 
    AND column_name = 'design_id'
  ) THEN
    UPDATE public.design_collections dc
    SET 
      title = d.title,
      prompt = d.prompt,
      template_image_url = d.image_url,
      template_thumbnail_image_url = d.thumbnail_image_url,
      aspect_ratio = d.aspect_ratio
    FROM public.designs d
    WHERE dc.design_id = d.id AND dc.template_image_url IS NULL;
  END IF;
END $$;

-- Drop the foreign key constraint
ALTER TABLE public.design_collections
DROP CONSTRAINT IF EXISTS design_collections_design_id_fkey;

-- Drop the old index
DROP INDEX IF EXISTS idx_design_collections_design_id;

-- Remove design_id column
ALTER TABLE public.design_collections
DROP COLUMN IF EXISTS design_id;

-- Make template_image_url required (after migration)
ALTER TABLE public.design_collections
ALTER COLUMN template_image_url SET NOT NULL;

-- Update UNIQUE constraint - remove old constraint (was on design_id which no longer exists)
ALTER TABLE public.design_collections
DROP CONSTRAINT IF EXISTS design_collections_collection_id_design_id_key;

-- Note: We don't create a unique index on template_image_url because URLs can be long
-- Instead, we rely on application logic to prevent duplicates (check by image_url before insert)
-- If needed, you can add a hash column and create a unique index on (collection_id, image_hash)

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_design_collections_collection_id ON public.design_collections(collection_id);

