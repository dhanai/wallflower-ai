/**
 * Migration script to move existing design images to Supabase Storage
 * 
 * Usage:
 *   npx tsx scripts/migrate-designs-to-storage.ts
 * 
 * Or with ts-node:
 *   ts-node scripts/migrate-designs-to-storage.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
const dotenvResult = dotenv.config({ path: envPath });

if (dotenvResult.error) {
  console.warn(`Warning: Could not load .env.local: ${dotenvResult.error.message}`);
  console.warn('Trying to use environment variables from process.env...');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? `✓ (${SUPABASE_URL.substring(0, 30)}...)` : '✗');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? `✓ (${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...)` : '✗');
  console.error('\nPlease make sure .env.local exists in the project root and contains:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.error('\nYou can find the service role key in Supabase Dashboard → Settings → API');
  process.exit(1);
}

// Verify the URL format
if (!SUPABASE_URL.startsWith('https://')) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL must start with https://');
  console.error(`  Got: ${SUPABASE_URL}`);
  process.exit(1);
}

// Verify the key format (service role keys are JWT tokens, should be long)
if (SUPABASE_SERVICE_ROLE_KEY.length < 100) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY appears to be too short.');
  console.error('Service role keys are JWT tokens and should be ~200+ characters.');
  console.error(`  Got: ${SUPABASE_SERVICE_ROLE_KEY.length} characters`);
  console.error('\nMake sure you are using the SERVICE ROLE KEY, not the ANON KEY.');
  console.error('You can find it in Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

console.log('✓ Environment variables loaded');
console.log(`  Supabase URL: ${SUPABASE_URL.substring(0, 40)}...`);
console.log(`  Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}... (${SUPABASE_SERVICE_ROLE_KEY.length} chars)\n`);

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface Design {
  id: string;
  user_id: string;
  title: string | null;
  image_url: string;
  thumbnail_image_url: string | null;
}

interface DesignVariation {
  id: string;
  design_id: string;
  image_url: string;
}

/**
 * Upload an image to Supabase Storage
 */
async function uploadImageToStorage(
  imageUrl: string,
  fileName: string,
  bucket: string = 'designs'
): Promise<string> {
  try {
    // Fetch the image
    let imageBuffer: Buffer;
    let contentType: string = 'image/png';
    
    if (imageUrl.startsWith('data:')) {
      // Handle data URL (base64)
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid data URL format');
      }
      contentType = matches[1] || 'image/png';
      const base64Data = matches[2];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // Fetch from URL
      console.log(`    Fetching image from: ${imageUrl.substring(0, 100)}...`);
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText} (${response.status})`);
      }
      const contentTypeHeader = response.headers.get('content-type');
      if (contentTypeHeader) {
        contentType = contentTypeHeader;
      }
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    }

    // Check if already in Supabase Storage
    if (SUPABASE_URL && imageUrl.includes(SUPABASE_URL)) {
      console.log(`    Image already in Supabase Storage, skipping upload`);
      return imageUrl;
    }

    // Upload to Supabase Storage
    console.log(`    Uploading to storage: ${fileName}`);
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, imageBuffer, {
        contentType,
        upsert: true, // Overwrite if exists
      });

    if (error) {
      throw new Error(`Storage upload error: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL after upload');
    }

    console.log(`    ✓ Uploaded: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error: any) {
    console.error(`    ✗ Error uploading image: ${error.message}`);
    throw error;
  }
}

/**
 * Migrate a single design's images to storage
 */
async function migrateDesign(design: Design, dryRun: boolean = false): Promise<void> {
  console.log(`\nProcessing design ${design.id}:`);
  console.log(`  Title: ${design.title || '(untitled)'}`);
  console.log(`  User: ${design.user_id}`);

  try {
    // Generate file paths
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const mainImagePath = `users/${design.user_id}/${timestamp}-${random}-main.png`;
    const thumbnailPath = design.thumbnail_image_url && design.thumbnail_image_url !== design.image_url
      ? `users/${design.user_id}/${timestamp}-${random}-thumb.png`
      : mainImagePath; // Use same file if thumbnail same as main

    if (dryRun) {
      console.log(`  [DRY RUN] Would upload main image to: ${mainImagePath}`);
      if (thumbnailPath !== mainImagePath) {
        console.log(`  [DRY RUN] Would upload thumbnail to: ${thumbnailPath}`);
      }
      return;
    }

    // Upload main image
    const newImageUrl = await uploadImageToStorage(design.image_url, mainImagePath);

    // Upload thumbnail if different
    let newThumbnailUrl = newImageUrl;
    if (design.thumbnail_image_url && design.thumbnail_image_url !== design.image_url) {
      newThumbnailUrl = await uploadImageToStorage(design.thumbnail_image_url, thumbnailPath);
    }

    // Update design record
    const { error: updateError } = await supabase
      .from('designs')
      .update({
        image_url: newImageUrl,
        thumbnail_image_url: newThumbnailUrl,
      })
      .eq('id', design.id);

    if (updateError) {
      throw new Error(`Failed to update design: ${updateError.message}`);
    }

    console.log(`  ✓ Design migrated successfully`);
  } catch (error: any) {
    console.error(`  ✗ Failed to migrate design: ${error.message}`);
    throw error;
  }
}

/**
 * Migrate design variations (iterations)
 */
async function migrateVariations(variation: DesignVariation, designUserId: string, dryRun: boolean = false): Promise<void> {
  try {
    // Generate file path
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const variationPath = `users/${designUserId}/variations/${timestamp}-${random}.png`;

    if (dryRun) {
      console.log(`  [DRY RUN] Would upload variation to: ${variationPath}`);
      return;
    }

    // Upload variation image
    const newImageUrl = await uploadImageToStorage(variation.image_url, variationPath);

    // Update variation record
    const { error: updateError } = await supabase
      .from('design_variations')
      .update({
        image_url: newImageUrl,
      })
      .eq('id', variation.id);

    if (updateError) {
      throw new Error(`Failed to update variation: ${updateError.message}`);
    }

    console.log(`    ✓ Variation migrated`);
  } catch (error: any) {
    console.error(`    ✗ Failed to migrate variation: ${error.message}`);
    throw error;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const designId = args.find(arg => arg.startsWith('--design-id='))?.split('=')[1];

  console.log('🚀 Starting design migration to Supabase Storage');
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made');
  }
  console.log('');

  // Test the connection first
  console.log('Testing Supabase connection...');
  try {
    const { data, error } = await supabase.from('designs').select('count').limit(1);
    if (error) {
      if (error.message.includes('Invalid API key') || error.message.includes('JWT') || error.message.includes('invalid')) {
        console.error('✗ Connection test failed: Invalid API key');
        console.error('\nThe service role key appears to be invalid or incorrect.');
        console.error('Please verify it in Supabase Dashboard → Settings → API → service_role key');
        console.error('\nMake sure you are using the SERVICE ROLE KEY (secret), not the ANON KEY (public).');
        process.exit(1);
      } else {
        // Other errors (like table not found) are OK - we'll handle that
        console.log('✓ Connection test completed (note: ' + error.message + ')');
      }
    } else {
      console.log('✓ Connection successful');
    }
  } catch (error: any) {
    console.error('✗ Connection test error:', error.message);
    if (error.message.includes('fetch') || error.message.includes('network')) {
      console.error('\nNetwork error. Please check your internet connection and Supabase URL.');
    }
    process.exit(1);
  }
  console.log('');

  try {
    // Fetch designs
    let query = supabase.from('designs').select('id, user_id, title, image_url, thumbnail_image_url');
    
    if (designId) {
      query = query.eq('id', designId);
      console.log(`📌 Migrating specific design: ${designId}`);
    } else {
      console.log('📦 Fetching all designs...');
    }

    const { data: designs, error: designsError } = await query;

    if (designsError) {
      throw new Error(`Failed to fetch designs: ${designsError.message}`);
    }

    if (!designs || designs.length === 0) {
      console.log('✓ No designs found to migrate');
      return;
    }

    console.log(`✓ Found ${designs.length} design(s) to migrate\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const design of designs) {
      try {
        await migrateDesign(design, dryRun);

        // Migrate variations for this design
        const { data: variations, error: variationsError } = await supabase
          .from('design_variations')
          .select('id, design_id, image_url')
          .eq('design_id', design.id);

        if (!variationsError && variations && variations.length > 0) {
          console.log(`  Migrating ${variations.length} variation(s)...`);
          for (const variation of variations) {
            try {
              await migrateVariations(variation, design.user_id, dryRun);
            } catch (error) {
              errorCount++;
              // Continue with next variation
            }
          }
        }

        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`Failed to migrate design ${design.id}:`, error);
        // Continue with next design
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  ✓ Successfully migrated: ${successCount}`);
    console.log(`  ✗ Errors: ${errorCount}`);
    console.log(`  Total: ${designs.length}`);

    if (!dryRun) {
      console.log('\n✓ Migration completed!');
    } else {
      console.log('\n⚠️  This was a dry run. Run without --dry-run to perform actual migration.');
    }
  } catch (error: any) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
migrate().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

