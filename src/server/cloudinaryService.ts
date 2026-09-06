import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with server-side secrets
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  publicId: string;
  resourceType: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
  entryId: string;
  userId: string;
  downloadUrl: string;
}

export class CloudinaryService {
  /**
   * Check if Cloudinary credentials are configured
   */
  static isConfigured(): boolean {
    return Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }

  /**
   * Generate a signed, time-limited Cloudinary URL for an authenticated asset.
   * Strictly verifies that the asset's publicId belongs to the authenticated user UID.
   * Expires in 3600 seconds (1 hour).
   */
  static generateSignedUrl(publicId: string, authUid: string, expiresInSeconds = 3600): string {
    if (!publicId || !authUid) {
      throw new Error('Public ID and authenticated user ID are required.');
    }

    // Strict ownership verification: publicId MUST start with users/{authUid}/
    const expectedPrefix = `users/${authUid}/`;
    if (!publicId.startsWith(expectedPrefix)) {
      throw new Error('Access denied: You do not have permission to access this media asset.');
    }

    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

    const signedUrl = cloudinary.url(publicId, {
      resource_type: 'image',
      type: 'authenticated',
      sign_url: true,
      secure: true,
      expires_at: expiresAt,
    });

    return signedUrl;
  }

  /**
   * Upload an image buffer to Cloudinary as a private/authenticated asset.
   * Public ID format: users/{uid}/memories/{entryId}/{uniqueId}
   */
  static async uploadImage(
    fileBuffer: Buffer,
    authUid: string,
    entryId: string,
    originalFilename: string,
    mimeType: string
  ): Promise<CloudinaryUploadResult> {
    if (!authUid) {
      throw new Error('Authentication is required to upload media.');
    }

    if (!this.isConfigured()) {
      throw new Error('Cloudinary credentials are not properly configured on the server.');
    }

    const isImage = mimeType.toLowerCase().startsWith('image/');
    if (!isImage) {
      throw new Error('Video uploads are currently disabled. Please upload an image file.');
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const safeEntryId = entryId && entryId.trim() ? entryId.trim() : 'temp';

    // UID-scoped public ID: users/{uid}/memories/{entryId}/{uniqueId}
    const publicId = `users/${authUid}/memories/${safeEntryId}/${uniqueId}`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          type: 'authenticated', // Store images as authenticated/private Cloudinary assets
          resource_type: 'image',
          overwrite: true,
        },
        (error, result) => {
          if (error || !result) {
            console.error('[CloudinaryService] Upload error:', error);
            reject(new Error(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`));
            return;
          }

          try {
            const signedUrl = this.generateSignedUrl(result.public_id, authUid);

            resolve({
              publicId: result.public_id,
              resourceType: result.resource_type || 'image',
              format: result.format || 'jpg',
              width: result.width || 0,
              height: result.height || 0,
              bytes: result.bytes || fileBuffer.length,
              createdAt: result.created_at || new Date().toISOString(),
              entryId: safeEntryId,
              userId: authUid,
              downloadUrl: signedUrl,
            });
          } catch (err) {
            reject(err);
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Delete a private/authenticated image asset from Cloudinary.
   * Strictly verifies user ownership before deletion.
   */
  static async deleteImage(publicId: string, authUid: string): Promise<void> {
    if (!publicId || !authUid) return;

    const expectedPrefix = `users/${authUid}/`;
    if (!publicId.startsWith(expectedPrefix)) {
      throw new Error('Access denied: Cannot delete media outside your private vault.');
    }

    if (!this.isConfigured()) {
      console.warn('[CloudinaryService] Cloudinary credentials missing during deletion.');
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId, {
        type: 'authenticated',
        resource_type: 'image',
      });
    } catch (err) {
      console.warn('[CloudinaryService] Delete warning:', err);
    }
  }

  /**
   * Server-side retrieval of a private/authenticated image buffer for Gemini multimodal analysis.
   * Strictly enforces publicId ownership (must start with users/{authUid}/).
   */
  static async fetchImageData(
    publicId: string,
    authUid: string,
    providedMimeType?: string
  ): Promise<{ mimeType: string; data: string } | null> {
    if (!publicId || !authUid) {
      throw new Error('Public ID and authenticated user ID are required to fetch image data.');
    }

    const expectedPrefix = `users/${authUid}/`;
    if (!publicId.startsWith(expectedPrefix)) {
      throw new Error('Access denied: You do not have permission to access this media asset.');
    }

    if (!this.isConfigured()) {
      console.warn('[CloudinaryService] Cloudinary credentials missing when fetching image data.');
      return null;
    }

    try {
      const signedUrl = this.generateSignedUrl(publicId, authUid);
      const res = await fetch(signedUrl);

      if (!res.ok) {
        console.warn(`[CloudinaryService] Failed to download media image ${publicId}: HTTP ${res.status}`);
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');

      let finalMime = providedMimeType?.trim();
      if (!finalMime || finalMime === 'application/octet-stream') {
        const headerMime = res.headers.get('content-type');
        if (headerMime && headerMime.startsWith('image/')) {
          finalMime = headerMime;
        } else if (publicId.toLowerCase().endsWith('.png')) {
          finalMime = 'image/png';
        } else if (publicId.toLowerCase().endsWith('.webp')) {
          finalMime = 'image/webp';
        } else {
          finalMime = 'image/jpeg';
        }
      }

      return {
        mimeType: finalMime,
        data: base64Data,
      };
    } catch (err) {
      console.warn(`[CloudinaryService] Error retrieving image data for ${publicId}:`, err);
      return null;
    }
  }
}
