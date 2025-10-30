# Database Setup Instructions

To set up the database tables in Supabase, follow these steps:

## Method 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire SQL below (or from `supabase/migrations/001_initial_schema.sql` if you can access it)
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Verify that all tables were created successfully by checking the **Table Editor** section

### Complete SQL Migration

Copy and paste this entire SQL script into the Supabase SQL Editor:

```sql
-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create designs table
CREATE TABLE IF NOT EXISTS public.designs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  prompt TEXT,
  image_url TEXT NOT NULL,
  style_description TEXT,
  aspect_ratio TEXT DEFAULT '1:1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create design_variations table (for edited/regenerated versions)
CREATE TABLE IF NOT EXISTS public.design_variations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  design_id UUID REFERENCES public.designs(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  variation_type TEXT, -- 'edited', 'regenerated', 'style_transfer'
  prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create orders table (for Shopify integration)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  design_id UUID REFERENCES public.designs(id) ON DELETE SET NULL,
  shopify_product_id TEXT,
  shopify_variant_id TEXT,
  checkout_url TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
  total_amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create design_templates table (for pre-made designs users can choose from)
CREATE TABLE IF NOT EXISTS public.design_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  category TEXT,
  prompt TEXT, -- The prompt that generated this design
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can create own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for designs
CREATE POLICY "Users can view own designs" ON public.designs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own designs" ON public.designs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own designs" ON public.designs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own designs" ON public.designs
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for design_variations
CREATE POLICY "Users can view own design variations" ON public.design_variations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.designs 
      WHERE designs.id = design_variations.design_id 
      AND designs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own design variations" ON public.design_variations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.designs 
      WHERE designs.id = design_variations.design_id 
      AND designs.user_id = auth.uid()
    )
  );

-- RLS Policies for orders
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for design_templates (public read access)
CREATE POLICY "Anyone can view design templates" ON public.design_templates
  FOR SELECT USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_designs_user_id ON public.designs(user_id);
CREATE INDEX IF NOT EXISTS idx_designs_created_at ON public.designs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_design_variations_design_id ON public.design_variations(design_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_design_templates_featured ON public.design_templates(featured) WHERE featured = true;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_designs_updated_at
  BEFORE UPDATE ON public.designs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

## Method 2: Using Supabase CLI (Optional)

If you have Supabase CLI installed:

```bash
# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

## Verify Tables Were Created

After running the migration, verify these tables exist:

- ✅ `public.users`
- ✅ `public.designs`
- ✅ `public.design_variations`
- ✅ `public.orders`
- ✅ `public.design_templates`

You can check in the Supabase dashboard under **Table Editor**.

## If You Already Ran the Migration Before

If you already ran the migration and your users table doesn't have the INSERT policy, run this additional SQL:

```sql
-- Add INSERT policy for users table (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can create own profile'
  ) THEN
    CREATE POLICY "Users can create own profile" ON public.users
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;
```

Or you can find this in `supabase/migrations/002_add_user_insert_policy.sql`.

## Troubleshooting

If you encounter errors:

1. **"relation already exists"** - Tables may already exist. You can either:
   - Drop existing tables first (be careful, this deletes data!)
   - Or modify the SQL to use `DROP TABLE IF EXISTS` before `CREATE TABLE`

2. **"permission denied"** - Make sure you're using the SQL Editor as a project owner/admin

3. **RLS Policy errors** - If policies already exist, drop them first:
   ```sql
   DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
   -- Repeat for all other policies
   ```

## Fresh Start (Drop All Tables)

If you need to start completely fresh:

```sql
-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS public.design_variations CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.designs CASCADE;
DROP TABLE IF EXISTS public.design_templates CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Then run the migration file again
```

