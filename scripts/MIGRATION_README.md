# Design Migration to Supabase Storage

This script migrates existing design images from external URLs or data URLs to Supabase Storage.

## Prerequisites

1. **Create the `designs` bucket in Supabase Storage** (see `STORAGE_SETUP.md`)
2. **Set up environment variables** in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
   
   You can find the service role key in Supabase Dashboard → Settings → API → Service role key (keep this secret!)

3. **Install dependencies**:
   ```bash
   npm install
   ```

## Usage

### Dry Run (Preview what will be migrated)
```bash
npm run migrate:designs:dry-run
```

This will show you what would be migrated without making any changes.

### Migrate All Designs
```bash
npm run migrate:designs
```

### Migrate a Specific Design
```bash
npx tsx scripts/migrate-designs-to-storage.ts --design-id=your-design-id
```

## What the Script Does

1. **Fetches all designs** from the `designs` table
2. **Uploads images** to Supabase Storage:
   - Main images → `designs/users/{user_id}/{timestamp}-{random}-main.png`
   - Thumbnails → `designs/users/{user_id}/{timestamp}-{random}-thumb.png`
   - Variations → `designs/users/{user_id}/variations/{timestamp}-{random}.png`
3. **Updates database records** with new Supabase Storage URLs
4. **Skips images already in Supabase Storage** (checks if URL contains your Supabase URL)

## Features

- ✅ Handles both HTTP URLs and data URLs (base64)
- ✅ Automatically detects and preserves content type (PNG, JPEG, etc.)
- ✅ Skips images already in Supabase Storage
- ✅ Migrates design variations (iterations) as well
- ✅ Provides detailed progress output
- ✅ Error handling - continues if one design fails
- ✅ Dry run mode to preview changes

## Output Example

```
🚀 Starting design migration to Supabase Storage

📦 Fetching all designs...
✓ Found 5 design(s) to migrate

Processing design abc-123:
  Title: My Awesome Design
  User: user-456
    Fetching image from: https://fal.ai/cdn/...
    Uploading to storage: users/user-456/1234567890-xyz-main.png
    ✓ Uploaded: https://your-project.supabase.co/storage/v1/object/public/designs/users/...
  Migrating 3 variation(s)...
    ✓ Variation migrated
  ✓ Design migrated successfully

📊 Migration Summary:
  ✓ Successfully migrated: 5
  ✗ Errors: 0
  Total: 5

✓ Migration completed!
```

## Troubleshooting

### Error: "Missing required environment variables"
- Make sure `.env.local` exists and contains both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Error: "Storage upload error: new row violates row-level security policy"
- Make sure you've set up the storage bucket policies (see `STORAGE_SETUP.md`)
- The script uses the service role key, which should bypass RLS, but you may need to check your bucket settings

### Error: "Failed to fetch image"
- The external URL may be inaccessible or expired
- Check if the URL is still valid in your browser
- For Fal.ai URLs, they may have expiration times

### Images not uploading
- Check if the `designs` bucket exists in Supabase Storage
- Verify the bucket is public (for reading) or that policies allow authenticated uploads

