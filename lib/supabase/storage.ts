import { createClient } from '@/lib/supabase/server';

/**
 * Upload an image to Supabase Storage and return the public URL
 * @param imageUrl - URL or data URL of the image to upload
 * @param bucket - Storage bucket name (default: 'designs')
 * @param pathPrefix - Optional path prefix for organization
 * @returns Public URL of the uploaded image
 */
export async function uploadImageToStorage(
  imageUrl: string,
  bucket: string = 'designs',
  pathPrefix?: string
): Promise<string> {
  try {
    const supabase = await createClient();
    
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
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const contentTypeHeader = response.headers.get('content-type');
      if (contentTypeHeader) {
        contentType = contentTypeHeader;
      }
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = contentType.includes('png') ? 'png' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
    const fileName = `${pathPrefix ? `${pathPrefix}/` : ''}${timestamp}-${random}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, imageBuffer, {
        contentType,
        upsert: false,
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

    return urlData.publicUrl;
  } catch (error: any) {
    console.error('Error uploading image to storage:', error);
    throw new Error(`Failed to upload image: ${error.message || 'Unknown error'}`);
  }
}

