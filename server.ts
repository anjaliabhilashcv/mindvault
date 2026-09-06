import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import firebaseConfig from './firebase-applet-config.json';
import { verifyAuthToken, AuthenticatedRequest } from './src/server/authMiddleware';
import { GeminiService, GeminiImagePart } from './src/server/geminiService';
import { FirestoreServerService } from './src/server/firestoreService';
import { RetrievalService } from './src/server/retrievalService';
import { GrowthService } from './src/server/growthService';
import { GrowthComparisonService } from './src/server/growthComparisonService';
import { TranscriptionService } from './src/server/transcriptionService';
import { CloudinaryService } from './src/server/cloudinaryService';

dotenv.config();

const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });

// Simple in-memory sliding window rate limiter per user ID for AI endpoints
const userAiCallLog = new Map<string, number[]>();

function checkRateLimit(userId: string, maxCalls = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const timestamps = userAiCallLog.get(userId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);
  
  if (validTimestamps.length >= maxCalls) {
    userAiCallLog.set(userId, validTimestamps);
    return false; // rate limited
  }

  validTimestamps.push(now);
  userAiCallLog.set(userId, validTimestamps);
  return true;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // API Routes
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      product: 'MindVault',
      version: '1.0.0',
      aiConfigured: GeminiService.isAvailable(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/auth/me', verifyAuthToken, (req: AuthenticatedRequest, res) => {
    res.json({
      authenticated: true,
      user: req.user,
    });
  });

  /**
   * Phase 2A: Secure Journal Entry Analysis Endpoint
   * Enforces zero-trust ownership: Derives UID strictly from verified token,
   * fetches authoritative journal content from Firestore, and sends ONLY that entry to Gemini.
   */
  app.post('/api/analyze-entry', verifyAuthToken, async (req: AuthenticatedRequest, res) => {
    console.log('[API /api/analyze-entry] Endpoint reached.');
    const authUid = req.user?.uid;
    const idToken = req.idToken;

    if (!authUid || !idToken) {
      console.warn('[API /api/analyze-entry] Missing authenticated session or token.');
      res.status(401).json({
        success: false,
        errorCode: 'AUTH_ERROR',
        error: 'Unauthorized: Missing verified session.',
      });
      return;
    }

    const { entryId } = req.body || {};
    if (!entryId || typeof entryId !== 'string') {
      console.warn('[API /api/analyze-entry] Invalid or missing entryId parameter.');
      res.status(400).json({
        success: false,
        errorCode: 'UNKNOWN_ERROR',
        error: 'Bad Request: A valid entryId is required.',
      });
      return;
    }

    console.log(`[API /api/analyze-entry] Verified user session present. Processing entry ID: ${entryId}`);

    try {
      // Retrieve authoritative document directly from Firestore using the user's verified token
      console.log(`[API /api/analyze-entry] Fetching authoritative Firestore document for entry ID: ${entryId}...`);
      const entry = await FirestoreServerService.getAuthoritativeEntry(authUid, entryId, idToken);

      if (!entry) {
        console.warn(`[API /api/analyze-entry] Entry ID ${entryId} not found in user's collection.`);
        res.status(404).json({
          success: false,
          errorCode: 'ENTRY_NOT_FOUND',
          error: 'Journal entry not found.',
        });
        return;
      }

      // Hard ownership verification
      if (entry.userId !== authUid) {
        console.warn(`[API /api/analyze-entry] Ownership mismatch detected for entry ID: ${entryId}. Access denied.`);
        res.status(403).json({
          success: false,
          errorCode: 'FORBIDDEN',
          error: 'Forbidden: You do not own this journal entry.',
        });
        return;
      }

      console.log(`[API /api/analyze-entry] Ownership verified for entry ID: ${entryId}. Document retrieved successfully.`);

      // Check for attached image media
      const attachments = Array.isArray(entry.attachments) ? entry.attachments : [];
      const imageAttachments = attachments.filter(
        (att) => att && (att.type === 'image' || att.mimeType?.startsWith('image/'))
      );

      const hasText = Boolean(entry.content && entry.content.trim());
      const hasImages = imageAttachments.length > 0;

      if (!hasText && !hasImages) {
        console.warn(`[API /api/analyze-entry] Entry ID ${entryId} has neither text content nor image attachments.`);
        res.status(400).json({
          success: false,
          errorCode: 'UNKNOWN_ERROR',
          error: 'Journal entry content is empty.',
        });
        return;
      }

      // Verify media ownership and retrieve images server-side
      const imageParts: GeminiImagePart[] = [];
      if (hasImages) {
        for (const att of imageAttachments) {
          const publicId = att.publicId || att.storagePath;
          if (!publicId || !publicId.startsWith(`users/${authUid}/`)) {
            console.warn(`[API /api/analyze-entry] Ownership mismatch for attachment ${publicId} on entry ${entryId}.`);
            res.status(403).json({
              success: false,
              errorCode: 'FORBIDDEN',
              error: 'Forbidden: You do not own the attached media assets.',
            });
            return;
          }
        }

        console.log(`[API /api/analyze-entry] Fetching ${imageAttachments.length} private image(s) server-side...`);
        const fetchedImages = await Promise.all(
          imageAttachments.map((att) => {
            const publicId = att.publicId || att.storagePath;
            return CloudinaryService.fetchImageData(publicId, authUid, att.mimeType);
          })
        );

        for (const imgData of fetchedImages) {
          if (imgData) {
            imageParts.push({
              inlineData: {
                mimeType: imgData.mimeType,
                data: imgData.data,
              },
            });
          }
        }
        console.log(`[API /api/analyze-entry] Loaded ${imageParts.length} valid image part(s) for Gemini multimodal input.`);
      }

      // Run Gemini analysis on the authoritative entry content and images
      console.log(`[API /api/analyze-entry] Invoking Gemini reflection service for entry ID: ${entryId}...`);
      const analysis = await GeminiService.analyzeJournalEntry(entry.content || '', entry.title, imageParts);
      const analyzedAt = new Date().toISOString();
      const analysisVersion = typeof entry.version === 'number' && entry.version > 0 ? entry.version : 1;

      console.log(
        `[API /api/analyze-entry] Gemini reflection generated & validated successfully for entry ID: ${entryId} (v${analysisVersion}).`
      );

      res.json({
        success: true,
        analysis: {
          ...analysis,
          analyzedAt,
          analysisVersion,
        },
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[API /api/analyze-entry] Error processing entry ID ${entryId}:`, errMsg);

      let errorCode = 'UNKNOWN_ERROR';
      let statusCode = 500;
      let userFacingMessage = "Your entry is safe, but AI insights couldn't be generated.";

      if (errMsg.includes('Access denied') || errMsg.includes('Unauthorized') || errMsg.includes('Ownership mismatch')) {
        errorCode = 'FORBIDDEN';
        statusCode = 403;
        userFacingMessage = 'Forbidden: Unauthorized access to this entry.';
      } else if (errMsg.includes('GEMINI_CONFIGURATION_ERROR') || errMsg.includes('API key is not configured')) {
        errorCode = 'GEMINI_CONFIGURATION_ERROR';
        statusCode = 500;
      } else if (errMsg.includes('GEMINI_PARSE_ERROR')) {
        errorCode = 'GEMINI_PARSE_ERROR';
        statusCode = 500;
      } else if (errMsg.includes('GEMINI_SCHEMA_ERROR')) {
        errorCode = 'GEMINI_SCHEMA_ERROR';
        statusCode = 500;
      } else if (errMsg.includes('GEMINI_API_ERROR') || errMsg.includes('Gemini API')) {
        errorCode = 'GEMINI_API_ERROR';
        statusCode = 502;
      } else if (errMsg.includes('Firestore') || errMsg.includes('database')) {
        errorCode = 'FIRESTORE_ERROR';
        statusCode = 500;
      }

      res.status(statusCode).json({
        success: false,
        errorCode,
        error: userFacingMessage,
      });
    }
  });

  /**
   * Phase 3: Ask My Journal Endpoint
   * Zero-trust RAG pipeline:
   * 1. Authenticates session via verified Firebase token
   * 2. Retrieves the user's authoritative journal entries exclusively
   * 3. Executes hybrid relevance retrieval & temporal ranking
   * 4. Grounds Gemini answer strictly in retrieved evidence
   * 5. Returns structured answer with verified supporting entries
   */
  app.post('/api/ask-journal', verifyAuthToken, async (req: AuthenticatedRequest, res) => {
    console.log('[API /api/ask-journal] Endpoint reached.');
    const authUid = req.user?.uid;
    const idToken = req.idToken;

    if (!authUid || !idToken) {
      console.warn('[API /api/ask-journal] Missing authenticated session or token.');
      res.status(401).json({
        success: false,
        errorCode: 'AUTH_ERROR',
        error: 'Unauthorized: Missing verified session.',
      });
      return;
    }

    // Rate limiting check
    if (!checkRateLimit(authUid, 20, 60000)) {
      console.warn(`[API /api/ask-journal] Rate limit reached for user session.`);
      res.status(429).json({
        success: false,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        error: 'Too many requests. Please wait a moment before asking another question.',
      });
      return;
    }

    const { question } = req.body || {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_QUESTION',
        error: 'Please enter a valid question.',
      });
      return;
    }

    const trimmedQuestion = question.trim();
    if (trimmedQuestion.length < 2) {
      res.status(400).json({
        success: false,
        errorCode: 'QUESTION_TOO_SHORT',
        error: 'Question is too short. Please provide a more descriptive inquiry.',
      });
      return;
    }

    if (trimmedQuestion.length > 500) {
      res.status(400).json({
        success: false,
        errorCode: 'QUESTION_TOO_LONG',
        error: 'Question exceeds the maximum length of 500 characters.',
      });
      return;
    }

    try {
      console.log(`[API /api/ask-journal] Fetching user memories from Firestore...`);
      const userEntries = await FirestoreServerService.getAllAuthoritativeEntries(authUid, idToken);

      if (!userEntries || userEntries.length === 0) {
        console.log(`[API /api/ask-journal] User has no journal entries in vault.`);
        res.json({
          success: true,
          noEvidence: true,
          answer: "You haven't written any journal entries yet. Once you write entries, you can ask questions about your thoughts, memories, and personal growth.",
          confidence: 'low',
          supportingEntries: [],
        });
        return;
      }

      console.log(`[API /api/ask-journal] Running retrieval algorithm over ${userEntries.length} entries...`);
      const retrieval = RetrievalService.retrieveRelevantMemories(userEntries, trimmedQuestion, 6);

      if (!retrieval.hasSufficientEvidence || retrieval.memories.length === 0) {
        console.log(`[API /api/ask-journal] No relevant evidence found for query.`);
        res.json({
          success: true,
          noEvidence: true,
          answer: "I couldn't find enough information in your journal to answer that yet. Try asking about something you've written about before.",
          confidence: 'low',
          supportingEntries: [],
        });
        return;
      }

      console.log(`[API /api/ask-journal] Retrieved ${retrieval.memories.length} relevant memories. Invoking Gemini grounding...`);
      const result = await GeminiService.answerJournalQuestion(trimmedQuestion, retrieval.memories);

      // Map verified indices to supporting entry references
      const supportingEntries = result.matchingEntryIndices.map((idx) => {
        const mem = retrieval.memories[idx];
        const dateStr = mem.createdAt
          ? new Date(mem.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Unknown Date';

        return {
          entryId: mem.entryId,
          title: mem.title,
          date: dateStr,
          mood: mem.mood,
        };
      });

      console.log(
        `[API /api/ask-journal] Answer generated successfully with confidence '${result.confidence}' and ${supportingEntries.length} citations.`
      );

      res.json({
        success: true,
        answer: result.answer,
        confidence: result.confidence,
        supportingEntries,
        noEvidence: false,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[API /api/ask-journal] Error generating answer:', errMsg);

      let errorCode = 'UNKNOWN_ERROR';
      let statusCode = 500;
      let userFacingMessage = "I couldn't answer that right now. Please check your connection and try again.";

      if (errMsg.includes('Access denied') || errMsg.includes('Unauthorized')) {
        errorCode = 'FORBIDDEN';
        statusCode = 403;
        userFacingMessage = "MindVault couldn't access your memories right now. Please try again.";
      } else if (errMsg.includes('GEMINI_CONFIGURATION_ERROR') || errMsg.includes('API key is not configured')) {
        errorCode = 'GEMINI_CONFIGURATION_ERROR';
        statusCode = 500;
        userFacingMessage = 'AI reflection services are currently unavailable.';
      } else if (errMsg.includes('GEMINI_API_ERROR') || errMsg.includes('Gemini API')) {
        errorCode = 'GEMINI_API_ERROR';
        statusCode = 502;
        userFacingMessage = 'AI reflection services experienced a momentary delay. Please try again in a moment.';
      }

      res.status(statusCode).json({
        success: false,
        errorCode,
        error: userFacingMessage,
      });
    }
  });

  /**
   * Phase 4: Growth Intelligence endpoint
   * Analyzes longitudinal journal history, returns mood trends, recurring emotions,
   * recurring themes, growth signals, and longitudinal reflections.
   */
  app.post('/api/growth-insights', verifyAuthToken, async (req: AuthenticatedRequest, res) => {
    const authUid = req.user?.uid;
    const idToken = req.idToken;

    if (!authUid || !idToken) {
      res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        error: 'Authentication is required to view growth intelligence.',
      });
      return;
    }

    const forceRefresh = Boolean(req.body?.forceRefresh);

    try {
      console.log(`[API /api/growth-insights] Fetching longitudinal insights for user ${authUid.slice(0, 6)}...`);
      const insights = await GrowthService.getOrGenerateGrowthInsights(authUid, idToken, forceRefresh);

      res.json({
        success: true,
        insights,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[API /api/growth-insights] Error generating insights:', errMsg);

      res.status(500).json({
        success: false,
        errorCode: 'GROWTH_INSIGHTS_ERROR',
        error: "Couldn't generate growth insights at this time. Please try again in a moment.",
      });
    }
  });

  /**
   * Phase 5: Growth Comparison ("What Changed About Me?")
   * Compares two user-selected date ranges of the authenticated user's journal entries.
   * Compares mood, emotions, themes, challenges, growth signals, and positive moments.
   * Leverages pre-existing AI analysis and grounded Gemini synthesis with supporting entry IDs/dates.
   */
  app.post('/api/growth-comparison', verifyAuthToken, async (req: AuthenticatedRequest, res) => {
    const authUid = req.user?.uid;
    const idToken = req.idToken;

    if (!authUid || !idToken) {
      res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        error: 'Authentication is required to perform growth comparisons.',
      });
      return;
    }

    // Explicit forgery check: If client supplies claimedUserId, it MUST match token's verified UID
    const claimedUserId = req.body?.claimedUserId;
    if (claimedUserId && claimedUserId !== authUid) {
      console.warn(
        `[API /api/growth-comparison] Security violation: claimed UID (${claimedUserId}) does not match token UID (${authUid}). Access denied.`
      );
      res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN',
        error: 'Forbidden: You cannot perform growth comparisons on another user dataset.',
      });
      return;
    }

    // Rate limiting check
    if (!checkRateLimit(authUid, 20, 60000)) {
      res.status(429).json({
        success: false,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        error: 'Too many comparison requests. Please wait a moment before trying again.',
      });
      return;
    }

    const { periodA, periodB } = req.body || {};

    if (!periodA || typeof periodA !== 'object' || !periodA.startDate || !periodA.endDate) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_PERIOD_A',
        error: 'Invalid request: periodA must contain startDate and endDate (e.g. YYYY-MM-DD).',
      });
      return;
    }

    if (!periodB || typeof periodB !== 'object' || !periodB.startDate || !periodB.endDate) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_PERIOD_B',
        error: 'Invalid request: periodB must contain startDate and endDate (e.g. YYYY-MM-DD).',
      });
      return;
    }

    try {
      console.log(
        `[API /api/growth-comparison] Comparing period [${periodA.startDate} - ${periodA.endDate}] vs [${periodB.startDate} - ${periodB.endDate}] for user ${authUid.slice(0, 6)}...`
      );

      const comparison = await GrowthComparisonService.comparePeriods(
        authUid,
        idToken,
        periodA,
        periodB
      );

      res.json({
        success: true,
        comparison,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[API /api/growth-comparison] Error generating comparison:', errMsg);

      let statusCode = 500;
      let errorCode = 'COMPARISON_ERROR';
      let userFacingMessage = "Couldn't generate comparison at this time. Please try again in a moment.";

      if (errMsg.includes('Access denied') || errMsg.includes('Unauthorized')) {
        statusCode = 403;
        errorCode = 'FORBIDDEN';
        userFacingMessage = 'Forbidden: Access to journal entries was denied.';
      } else if (errMsg.includes('GEMINI_CONFIGURATION_ERROR')) {
        errorCode = 'GEMINI_CONFIGURATION_ERROR';
        userFacingMessage = 'AI reflection services are currently unavailable.';
      }

      res.status(statusCode).json({
        success: false,
        errorCode,
        error: userFacingMessage,
      });
    }
  });

  /**
   * Phase 6: Voice-to-Journal Transcription Endpoint
   * Authenticates session via verified Firebase token.
   * Transcribes voice recordings using Gemini multimodal audio model.
   * Extracts clean transcript, suggested title, and detected mood.
   */
  app.post('/api/transcribe-audio', verifyAuthToken, async (req: AuthenticatedRequest, res) => {
    const authUid = req.user?.uid;

    if (!authUid) {
      res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        error: 'Authentication is required to transcribe audio recordings.',
      });
      return;
    }

    // Rate limiting check: max 20 audio transcriptions per minute per user
    if (!checkRateLimit(authUid, 20, 60000)) {
      res.status(429).json({
        success: false,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        error: 'Too many transcription requests. Please wait a moment before trying again.',
      });
      return;
    }

    const { audioBase64, mimeType, durationSeconds } = req.body || {};

    if (!audioBase64 || typeof audioBase64 !== 'string' || !audioBase64.trim()) {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_AUDIO',
        error: 'No audio data received for transcription.',
      });
      return;
    }

    try {
      console.log(
        `[API /api/transcribe-audio] Processing audio transcription for user ${authUid.slice(0, 6)} (MIME: ${mimeType || 'default'}, ${durationSeconds ? `${durationSeconds}s` : 'unknown duration'})...`
      );

      const result = await TranscriptionService.transcribeAudio(audioBase64, mimeType);

      res.json({
        success: true,
        transcript: result.transcript,
        suggestedTitle: result.suggestedTitle,
        suggestedMood: result.suggestedMood,
        durationSeconds,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('[API /api/transcribe-audio] Error during audio transcription:', errMsg);

      let statusCode = 500;
      let errorCode = 'TRANSCRIPTION_ERROR';
      let userFacingMessage = 'Could not transcribe voice note. Please try recording again.';

      if (errMsg.includes('silent') || errMsg.includes('empty')) {
        statusCode = 400;
        errorCode = 'SILENT_AUDIO';
        userFacingMessage = 'The recording appears to be silent or inaudible. Please check your microphone and try again.';
      } else if (errMsg.includes('exceeds maximum allowed size')) {
        statusCode = 400;
        errorCode = 'AUDIO_TOO_LARGE';
        userFacingMessage = 'Audio recording exceeds maximum allowed size (20MB). Please record a shorter reflection.';
      } else if (errMsg.includes('GEMINI_CONFIGURATION_ERROR')) {
        statusCode = 500;
        errorCode = 'GEMINI_CONFIGURATION_ERROR';
        userFacingMessage = 'Voice transcription is currently unavailable.';
      }

      res.status(statusCode).json({
        success: false,
        errorCode,
        error: userFacingMessage,
      });
    }
  });

  // Endpoint to demonstrate server-side authoritative UID derivation & forgery rejection
  app.post('/api/security/verify-identity', verifyAuthToken, (req: AuthenticatedRequest, res) => {
    const authoritativeUid = req.user?.uid;
    const clientSuppliedUid = req.body?.claimedUserId;
    const isMatch = authoritativeUid === clientSuppliedUid;

    res.json({
      authoritativeUid,
      clientSuppliedUid: clientSuppliedUid || null,
      identityVerified: true,
      isForged: clientSuppliedUid ? !isMatch : false,
      message: isMatch
        ? 'Client identity matches verified token.'
        : 'Security Notice: Client claimed UID differed from token; server strictly derives identity from verified token.',
    });
  });

  /**
   * Media Attachment Endpoints backed by Cloudinary Private Assets.
   * Stores image assets as authenticated/private Cloudinary resources.
   * Public IDs are strictly scoped: users/{uid}/memories/{entryId}/{uniqueId}.
   * Signed, time-limited URLs are generated server-side after verifying ownership.
   */
  app.post(
    '/api/upload-media',
    verifyAuthToken,
    upload.single('file'),
    async (req: AuthenticatedRequest, res) => {
      const authUid = req.user?.uid;

      if (!authUid) {
        res.status(401).json({
          success: false,
          errorCode: 'UNAUTHORIZED',
          error: 'Authentication is required to upload media attachments.',
        });
        return;
      }

      const claimedUserId = req.body?.userId;
      if (claimedUserId && claimedUserId !== authUid) {
        console.warn(
          `[API /api/upload-media] Security violation: claimed UID (${claimedUserId}) does not match token UID (${authUid}). Access denied.`
        );
        res.status(403).json({
          success: false,
          errorCode: 'FORBIDDEN',
          error: 'Forbidden: You cannot upload media on behalf of another user account.',
        });
        return;
      }

      if (!req.file || !req.file.buffer) {
        res.status(400).json({
          success: false,
          errorCode: 'NO_FILE',
          error: 'No file received for upload.',
        });
        return;
      }

      const file = req.file;
      const mimeType = (file.mimetype || 'application/octet-stream').toLowerCase();

      if (mimeType.startsWith('video/')) {
        res.status(400).json({
          success: false,
          errorCode: 'VIDEO_NOT_SUPPORTED',
          error: 'Video uploads are currently disabled. Please select an image file.',
        });
        return;
      }

      if (!mimeType.startsWith('image/')) {
        res.status(400).json({
          success: false,
          errorCode: 'UNSUPPORTED_TYPE',
          error: `Unsupported file format "${file.mimetype}". Please select an image file.`,
        });
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        res.status(400).json({
          success: false,
          errorCode: 'FILE_TOO_LARGE',
          error: `Image "${file.originalname}" exceeds the 15MB size limit.`,
        });
        return;
      }

      const entryId = req.body?.entryId || 'temp';

      try {
        const uploadRes = await CloudinaryService.uploadImage(
          file.buffer,
          authUid,
          entryId,
          file.originalname || 'image',
          mimeType
        );

        const attachmentId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        res.json({
          success: true,
          attachment: {
            id: attachmentId,
            type: 'image',
            storagePath: uploadRes.publicId,
            downloadUrl: uploadRes.downloadUrl,
            fileName: file.originalname || 'image',
            fileSize: uploadRes.bytes,
            mimeType,
            uploadedAt: new Date().toISOString(),
            publicId: uploadRes.publicId,
            resourceType: uploadRes.resourceType,
            format: uploadRes.format,
            width: uploadRes.width,
            height: uploadRes.height,
            bytes: uploadRes.bytes,
            createdAt: uploadRes.createdAt,
            entryId: uploadRes.entryId,
            userId: uploadRes.userId,
          },
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('[API /api/upload-media] Cloudinary upload error:', errMsg);
        res.status(500).json({
          success: false,
          errorCode: 'CLOUDINARY_UPLOAD_ERROR',
          error: `Image upload failed: ${errMsg}`,
        });
      }
    }
  );

  /**
   * Endpoint to generate a fresh signed, time-limited Cloudinary URL for a media asset.
   * Strictly enforces that the asset publicId belongs to the authenticated user.
   */
  app.post('/api/media-signed-url', verifyAuthToken, (req: AuthenticatedRequest, res) => {
    const authUid = req.user?.uid;
    const { publicId } = req.body || {};

    if (!authUid) {
      res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        error: 'Authentication is required.',
      });
      return;
    }

    if (!publicId || typeof publicId !== 'string') {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_INPUT',
        error: 'publicId is required.',
      });
      return;
    }

    try {
      const signedUrl = CloudinaryService.generateSignedUrl(publicId, authUid);
      res.json({
        success: true,
        signedUrl,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN',
        error: errMsg,
      });
    }
  });

  /**
   * Endpoint to delete a Cloudinary media asset.
   * Strictly verifies that the asset publicId belongs to the authenticated user.
   */
  app.post('/api/delete-media', verifyAuthToken, async (req: AuthenticatedRequest, res) => {
    const authUid = req.user?.uid;
    const { publicId, storagePath } = req.body || {};
    const targetPublicId = publicId || storagePath;

    if (!authUid) {
      res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        error: 'Authentication is required.',
      });
      return;
    }

    if (!targetPublicId || typeof targetPublicId !== 'string') {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_INPUT',
        error: 'publicId or storagePath is required.',
      });
      return;
    }

    try {
      await CloudinaryService.deleteImage(targetPublicId, authUid);
      res.json({
        success: true,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN',
        error: errMsg,
      });
    }
  });

  /**
   * Secure, authenticated endpoint to retrieve raw media image content as binary buffer.
   * Leverages CloudinaryService.fetchImageData to fetch authenticated media from Cloudinary
   * and stream it back safely.
   */
  app.get('/api/media/fetch-image', verifyAuthToken, async (req: AuthenticatedRequest, res) => {
    const authUid = req.user?.uid;
    const publicId = req.query.publicId as string;

    if (!authUid) {
      res.status(401).json({
        success: false,
        errorCode: 'UNAUTHORIZED',
        error: 'Authentication is required.',
      });
      return;
    }

    if (!publicId || typeof publicId !== 'string') {
      res.status(400).json({
        success: false,
        errorCode: 'INVALID_INPUT',
        error: 'publicId is required.',
      });
      return;
    }

    try {
      const imageResult = await CloudinaryService.fetchImageData(publicId, authUid);
      if (!imageResult) {
        res.status(404).json({
          success: false,
          errorCode: 'IMAGE_NOT_FOUND',
          error: 'Image not found or could not be fetched.',
        });
        return;
      }

      const buffer = Buffer.from(imageResult.data, 'base64');
      res.setHeader('Content-Type', imageResult.mimeType);
      res.send(buffer);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      res.status(403).json({
        success: false,
        errorCode: 'FORBIDDEN',
        error: errMsg,
      });
    }
  });

  // 404 Handler for API routes so they NEVER fall through to Vite SPA or static index.html
  app.all('/api/*', (_req, res) => {
    res.status(404).json({
      success: false,
      errorCode: 'ENDPOINT_NOT_FOUND',
      error: 'The requested API endpoint was not found.',
    });
  });

  // Vite middleware in development vs static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MindVault Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
