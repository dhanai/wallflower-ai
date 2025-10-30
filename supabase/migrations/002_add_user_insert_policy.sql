-- Add INSERT policy for users table so users can create their own profile
CREATE POLICY "Users can create own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

