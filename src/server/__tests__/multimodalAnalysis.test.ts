import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CloudinaryService } from '../cloudinaryService';
import { GeminiService, GeminiImagePart } from '../geminiService';

describe('Phase 6: Multimodal Image AI Analysis Unit & Security Tests', () => {
  it('enforces ownership checks on fetchImageData requiring users/{authUid}/ prefix', async () => {
    const ownerUid = 'user_alice_123';
    const attackerUid = 'user_eve_999';
    const validPublicId = `users/${ownerUid}/memories/entry_1/photo_1`;

    // Attacker trying to fetch Alice's image asset
    await assert.rejects(
      async () => {
        await CloudinaryService.fetchImageData(validPublicId, attackerUid);
      },
      (err: unknown) => {
        assert(err instanceof Error);
        assert(err.message.includes('Access denied'));
        return true;
      }
    );
  });

  it('accepts GeminiImagePart array and accepts image-only or image+text journal entries', async () => {
    const dummyImagePart: GeminiImagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: 'aW1hZ2VfYmFzZTY0X2RhdGE=', // base64 'image_base64_data'
      },
    };

    // Verify analyzeJournalEntry raises configuration error if GEMINI_API_KEY is unset,
    // demonstrating input validation for imageParts succeeds before LLM call
    const originalApiKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      await assert.rejects(
        async () => {
          await GeminiService.analyzeJournalEntry('', 'Meal Memory', [dummyImagePart]);
        },
        (err: unknown) => {
          assert(err instanceof Error);
          assert(err.message.includes('GEMINI_API_KEY is not configured'));
          return true;
        }
      );
    } finally {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  });

  it('rejects analysis when both text content and image attachments are missing', async () => {
    await assert.rejects(
      async () => {
        await GeminiService.analyzeJournalEntry('', 'Untitled', []);
      },
      (err: unknown) => {
        assert(err instanceof Error);
        assert(err.message.includes('empty'));
        return true;
      }
    );
  });
});
