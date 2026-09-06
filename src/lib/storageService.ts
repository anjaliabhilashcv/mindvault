import { auth } from './firebase';
import { JournalAttachment, AttachmentType } from '../types';

export const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_ATTACHMENTS_PER_ENTRY = 10;

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/heic',
  'image/heif',
]);

export interface UploadProgressInfo {
  percent: number;
  bytesTransferred: number;
  totalBytes: number;
}

export interface UploadHandle {
  promise: Promise<JournalAttachment>;
  cancel: () => void;
}

export class StorageService {
  /**
   * Validate image file constraints.
   * Video selection is currently disabled.
   */
  static validateFile(file: File): { type: AttachmentType; error?: string } {
    if (!file || file.size === 0) {
      return {
        type: 'image',
        error: 'File is empty (0 bytes).',
      };
    }

    const mimeType = (file.type || '').toLowerCase();

    if (mimeType.startsWith('video/')) {
      return {
        type: 'video',
        error: 'Video uploads are currently disabled. Please select an image file.',
      };
    }

    if (ALLOWED_IMAGE_TYPES.has(mimeType) || mimeType.startsWith('image/')) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        return {
          type: 'image',
          error: `Image "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB, exceeding the 15MB limit.`,
        };
      }
      return { type: 'image' };
    }

    return {
      type: 'image',
      error: `Unsupported file format "${file.type || 'unknown'}". Please select an image file (JPG, PNG, WebP, GIF, HEIC).`,
    };
  }

  /**
   * Upload an image attachment through the authenticated Cloudinary backend.
   * Scoped strictly to users/{uid}/memories/{entryId}/{uniqueId}.
   */
  static uploadMediaAttachment(
    userId: string,
    file: File,
    onProgress?: (progress: UploadProgressInfo) => void,
    entryId?: string
  ): UploadHandle {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Upload failed: Authenticated user ID is required.');
    }

    if (auth?.currentUser && auth.currentUser.uid !== userId) {
      throw new Error('Access denied: Cannot upload media on behalf of another user account.');
    }

    const validation = this.validateFile(file);
    if (validation.error) {
      throw new Error(validation.error);
    }

    let isCancelled = false;
    let xhr: XMLHttpRequest | null = null;

    const promise = new Promise<JournalAttachment>(async (resolve, reject) => {
      try {
        if (onProgress) {
          onProgress({
            percent: 5,
            bytesTransferred: Math.round(file.size * 0.05),
            totalBytes: file.size,
          });
        }

        let idToken = '';
        if (auth?.currentUser) {
          try {
            idToken = await auth.currentUser.getIdToken();
          } catch (e) {
            console.warn('Failed to retrieve ID token for upload:', e);
          }
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);
        if (entryId) {
          formData.append('entryId', entryId);
        }

        xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload-media', true);

        if (idToken) {
          xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);
        }

        xhr.upload.onprogress = (event) => {
          if (isCancelled) return;
          if (event.lengthComputable && event.total > 0) {
            const raw = (event.loaded / event.total) * 100;
            const percent = Math.min(95, Math.max(5, Math.round(raw)));
            onProgress?.({
              percent,
              bytesTransferred: event.loaded,
              totalBytes: event.total,
            });
          }
        };

        xhr.onload = () => {
          if (isCancelled) {
            reject(new Error('Upload cancelled.'));
            return;
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.success && res.attachment) {
                onProgress?.({
                  percent: 100,
                  bytesTransferred: file.size,
                  totalBytes: file.size,
                });
                resolve(res.attachment);
              } else {
                reject(new Error(res.error || 'Failed to upload image.'));
              }
            } catch {
              reject(new Error('Invalid response from upload server.'));
            }
          } else {
            let errMsg = 'Upload server error.';
            try {
              const res = JSON.parse(xhr.responseText);
              if (res.error) errMsg = res.error;
            } catch {}
            reject(new Error(errMsg));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error connecting to upload endpoint. Please check your internet connection.'));
        };

        xhr.ontimeout = () => {
          reject(new Error('Upload connection timed out.'));
        };

        xhr.timeout = 60000; // 60 seconds
        xhr.send(formData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        reject(new Error(`Could not initiate upload: ${msg}`));
      }
    });

    return {
      promise,
      cancel: () => {
        isCancelled = true;
        if (xhr) {
          try {
            xhr.abort();
          } catch {}
        }
      },
    };
  }

  /**
   * Request a fresh signed, time-limited Cloudinary download URL for a private image.
   */
  static async getSignedMediaUrl(publicId: string): Promise<string> {
    if (!publicId) throw new Error('publicId is required.');

    let idToken = '';
    if (auth?.currentUser) {
      idToken = await auth.currentUser.getIdToken();
    }

    const response = await fetch('/api/media-signed-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ publicId }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate signed media URL.');
    }

    return data.signedUrl;
  }

  /**
   * Delete an image asset from Cloudinary via the authenticated backend.
   * Ensures publicId belongs strictly to the authenticated user's UID namespace.
   */
  static async deleteMediaAttachment(attachment: JournalAttachment, currentUserId: string): Promise<void> {
    if (!currentUserId) throw new Error('Cannot delete media: unauthenticated user.');
    const targetPublicId = attachment.publicId || attachment.storagePath;
    if (!targetPublicId) return;

    const expectedPrefix = `users/${currentUserId}/`;
    if (!targetPublicId.startsWith(expectedPrefix)) {
      throw new Error('Access denied: Cannot delete media outside your private vault.');
    }

    try {
      let idToken = '';
      if (auth?.currentUser) {
        idToken = await auth.currentUser.getIdToken();
      }

      const response = await fetch('/api/delete-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ publicId: targetPublicId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.warn('Cloudinary delete endpoint returned error:', data.error);
      }
    } catch (error) {
      console.warn('Cloudinary delete warning:', error);
    }
  }

  /**
   * Format byte size nicely (e.g. "2.4 MB")
   */
  static formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = bytes / Math.pow(k, i);
    const formatted = val % 1 === 0 ? val.toString() : val.toFixed(1);
    return `${formatted} ${sizes[i]}`;
  }
}
