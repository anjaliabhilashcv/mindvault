import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TranscriptionService } from '../transcriptionService';
import { GeminiCustomError } from '../geminiService';

describe('Phase 6: Multimodal Audio Transcription Service Unit Tests', () => {
  it('rejects empty audio payload with GeminiCustomError', async () => {
    await assert.rejects(
      async () => {
        await TranscriptionService.transcribeAudio('');
      },
      (err: unknown) => {
        assert(err instanceof GeminiCustomError);
        assert.strictEqual(err.code, 'GEMINI_SCHEMA_ERROR');
        assert(err.message.includes('No audio data'));
        return true;
      }
    );
  });

  it('rejects oversized audio payload exceeding 20MB', async () => {
    // Generate a dummy oversized base64 string (>28MB string = >21MB binary)
    const oversizedBase64 = 'A'.repeat(28 * 1024 * 1024);

    await assert.rejects(
      async () => {
        await TranscriptionService.transcribeAudio(oversizedBase64, 'audio/webm');
      },
      (err: unknown) => {
        assert(err instanceof GeminiCustomError);
        assert.strictEqual(err.code, 'GEMINI_SCHEMA_ERROR');
        assert(err.message.includes('exceeds maximum allowed size'));
        return true;
      }
    );
  });

  it('rejects empty audio after decoding data URL prefix', async () => {
    const emptyDataUrl = 'data:audio/webm;base64,';

    await assert.rejects(
      async () => {
        await TranscriptionService.transcribeAudio(emptyDataUrl);
      },
      (err: unknown) => {
        assert(err instanceof GeminiCustomError);
        assert.strictEqual(err.code, 'GEMINI_SCHEMA_ERROR');
        assert(err.message.includes('Audio content is empty'));
        return true;
      }
    );
  });
});
