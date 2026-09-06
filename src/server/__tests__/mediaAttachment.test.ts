import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StorageService, MAX_ATTACHMENTS_PER_ENTRY, MAX_IMAGE_SIZE_BYTES } from '../../lib/storageService';
import { CloudinaryService } from '../cloudinaryService';
import { sanitizeAttachment, sanitizeForFirestore } from '../../lib/journalService';

describe('Phase 6: Cloudinary Media Attachments Unit & Security Tests', () => {
  it('validates supported image types and rejects unsupported extensions', () => {
    const validJpg = { name: 'photo.jpg', type: 'image/jpeg', size: 1024 * 1024 } as unknown as File;
    const validPng = { name: 'diagram.png', type: 'image/png', size: 2 * 1024 * 1024 } as unknown as File;
    const validWebp = { name: 'memory.webp', type: 'image/webp', size: 500 * 1024 } as unknown as File;
    
    assert.strictEqual(StorageService.validateFile(validJpg).error, undefined);
    assert.strictEqual(StorageService.validateFile(validJpg).type, 'image');

    assert.strictEqual(StorageService.validateFile(validPng).error, undefined);
    assert.strictEqual(StorageService.validateFile(validPng).type, 'image');

    assert.strictEqual(StorageService.validateFile(validWebp).error, undefined);
    assert.strictEqual(StorageService.validateFile(validWebp).type, 'image');

    // Unsupported file type
    const invalidExe = { name: 'malicious.exe', type: 'application/x-msdownload', size: 1024 } as unknown as File;
    const resExe = StorageService.validateFile(invalidExe);
    assert(resExe.error !== undefined);
    assert(resExe.error.includes('Unsupported file format'));
  });

  it('rejects video files as video support is currently disabled', () => {
    const validMp4 = { name: 'clip.mp4', type: 'video/mp4', size: 10 * 1024 * 1024 } as unknown as File;
    const resMp4 = StorageService.validateFile(validMp4);
    assert(resMp4.error !== undefined);
    assert(resMp4.error.includes('Video uploads are currently disabled'));

    // Image exceeding 15MB
    const oversizedImage = { name: 'huge_pic.jpg', type: 'image/jpeg', size: MAX_IMAGE_SIZE_BYTES + 1024 } as unknown as File;
    const resOverImg = StorageService.validateFile(oversizedImage);
    assert(resOverImg.error !== undefined);
    assert(resOverImg.error.includes('exceeding the 15MB limit'));

    // Zero-byte empty file
    const emptyFile = { name: 'empty.png', type: 'image/png', size: 0 } as unknown as File;
    const resEmpty = StorageService.validateFile(emptyFile);
    assert(resEmpty.error !== undefined);
    assert(resEmpty.error.includes('empty'));
  });

  it('strictly enforces Cloudinary public ID scoping to authenticated userId', async () => {
    const userA = 'user_12345';
    const userB = 'user_99999_attacker';

    const attachmentForUserA = {
      id: 'att_1',
      storagePath: `users/${userA}/memories/entry_100/att_1_photo`,
      publicId: `users/${userA}/memories/entry_100/att_1_photo`,
      fileName: 'photo.jpg',
      fileSize: 1024,
      mimeType: 'image/jpeg',
      type: 'image' as const,
      downloadUrl: 'https://res.cloudinary.com/...',
      uploadedAt: new Date().toISOString(),
    };

    // User B trying to delete User A's file
    await assert.rejects(
      async () => {
        await StorageService.deleteMediaAttachment(attachmentForUserA, userB);
      },
      (err: unknown) => {
        assert(err instanceof Error);
        assert(err.message.includes('Access denied'));
        return true;
      }
    );

    // User B trying to generate a signed URL for User A's public ID
    assert.throws(
      () => {
        CloudinaryService.generateSignedUrl(attachmentForUserA.publicId, userB);
      },
      (err: unknown) => {
        assert(err instanceof Error);
        assert(err.message.includes('Access denied'));
        return true;
      }
    );
  });

  it('formats byte sizes cleanly for human-readable labels', () => {
    assert.strictEqual(StorageService.formatBytes(0), '0 B');
    assert.strictEqual(StorageService.formatBytes(1024), '1 KB');
    assert.strictEqual(StorageService.formatBytes(1024 * 1024), '1 MB');
    assert.strictEqual(StorageService.formatBytes(2.5 * 1024 * 1024), '2.5 MB');
  });

  it('sanitizeAttachment removes undefined optional fields and produces a clean attachment object', () => {
    const rawAtt = {
      id: 'att_123',
      type: 'image' as const,
      storagePath: 'users/u1/memories/e1/photo',
      downloadUrl: 'https://res.cloudinary.com/...',
      fileName: 'photo.jpg',
      fileSize: 2048,
      mimeType: 'image/jpeg',
      uploadedAt: '2026-09-06T00:00:00Z',
      publicId: 'users/u1/memories/e1/photo',
      resourceType: undefined,
      format: undefined,
      width: undefined,
      height: undefined,
      bytes: undefined,
      createdAt: undefined,
      entryId: undefined,
      userId: undefined,
    };

    const clean = sanitizeAttachment(rawAtt);
    assert.strictEqual(clean.id, 'att_123');
    assert.strictEqual(clean.publicId, 'users/u1/memories/e1/photo');
    assert.strictEqual('resourceType' in clean, false);
    assert.strictEqual('width' in clean, false);
    assert.strictEqual('height' in clean, false);
    assert.strictEqual('format' in clean, false);
  });

  it('sanitizeForFirestore recursively strips all undefined keys from entry payloads', () => {
    const dirtyEntry = {
      id: 'entry_1',
      userId: 'user_1',
      title: 'My Memory',
      content: 'Today was great',
      mood: undefined,
      tags: ['memory'],
      attachments: [
        {
          id: 'att_1',
          type: 'image' as const,
          storagePath: 'users/user_1/memories/entry_1/img1',
          downloadUrl: 'https://...',
          fileName: 'pic.png',
          fileSize: 500,
          mimeType: 'image/png',
          uploadedAt: '2026-09-06T00:00:00Z',
          publicId: 'users/user_1/memories/entry_1/img1',
          width: undefined,
          height: undefined,
        },
      ],
      version: 1,
      createdAt: '2026-09-06T00:00:00Z',
      updatedAt: '2026-09-06T00:00:00Z',
    };

    const clean = sanitizeForFirestore(dirtyEntry);
    assert.strictEqual(clean.id, 'entry_1');
    assert.strictEqual('mood' in clean, false);
    assert.strictEqual('width' in clean.attachments[0], false);
    assert.strictEqual('height' in clean.attachments[0], false);

    // Verify deep JSON serialization safety
    const jsonString = JSON.stringify(clean);
    assert.strictEqual(jsonString.includes('undefined'), false);
  });
});
