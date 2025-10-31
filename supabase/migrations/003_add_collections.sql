-- Create collections table
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create design_collections junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.design_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  design_id UUID REFERENCES public.designs(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(design_id, collection_id) -- Prevent duplicate entries
);

-- Enable Row Level Security
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collections
-- Admins can do everything
CREATE POLICY "Admins can manage all collections" ON public.collections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Users can view all collections (for browsing)
CREATE POLICY "Anyone can view collections" ON public.collections
  FOR SELECT USING (true);

-- RLS Policies for design_collections
-- Admins can manage all design-collection relationships
CREATE POLICY "Admins can manage all design collections" ON public.design_collections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Users can view all design-collection relationships
CREATE POLICY "Anyone can view design collections" ON public.design_collections
  FOR SELECT USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_collections_created_by ON public.collections(created_by);
CREATE INDEX IF NOT EXISTS idx_collections_name ON public.collections(name);
CREATE INDEX IF NOT EXISTS idx_design_collections_design_id ON public.design_collections(design_id);
CREATE INDEX IF NOT EXISTS idx_design_collections_collection_id ON public.design_collections(collection_id);

