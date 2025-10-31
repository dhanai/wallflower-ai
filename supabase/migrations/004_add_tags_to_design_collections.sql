-- Add tags column to design_collections table
ALTER TABLE public.design_collections
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create an index for array searching on tags
CREATE INDEX IF NOT EXISTS idx_design_collections_tags ON public.design_collections USING GIN (tags);

-- Add a comment explaining the tags column
COMMENT ON COLUMN public.design_collections.tags IS 'Array of tags for searching and filtering designs within collections';

