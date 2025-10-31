# Supabase Storage Setup

## Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **New bucket**
4. Configure:
   - **Name**: `designs`
   - **Public**: ✅ Yes (templates need to be publicly accessible)
   - **File size limit**: 10 MB (or adjust as needed)
   - **Allowed MIME types**: `image/png, image/jpeg, image/webp`

## Storage Policies

After creating the bucket, set up Row Level Security (RLS) policies:

### Policy 1: Anyone can read (for public templates)
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'designs');
```

### Policy 2: Authenticated users can upload
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'designs' 
  AND auth.role() = 'authenticated'
);
```

### Policy 3: Admins can manage all files
```sql
CREATE POLICY "Admins can manage files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'designs'
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);
```

## File Structure

Images will be stored with the following structure:
- `designs/templates/{timestamp}-{random}.{ext}` - Template images
- `designs/users/{userId}/{timestamp}-{random}.{ext}` - User design images (future)

