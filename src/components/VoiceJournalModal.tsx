import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Check,
  X,
  AlertCircle,
  Loader2,
  Upload,
  Heart,
  Volume2,
} from 'lucide-react';
import { fetchWithAuth, safeParseJsonResponse } from '../lib/api';
import { AudioTranscriptionResponse } from '../types';

interface VoiceJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTranscription: (data: {
    transcript: string;
    suggestedTitle?: string;
    suggestedMood?: string;
    mode: 'replace' | 'append';
  }) => void;
  hasExistingContent: boolean;
}

type RecorderState = 'idle' | 'recording' | 'paused' | 'transcribing' | 'review' | 'error';

export const VoiceJournalModal: React.FC<VoiceJournalModalProps> = ({
  isOpen,
  onClose,
  onApplyTranscription,
  hasExistingContent,
}) => {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');
  const [transcript, setTranscript] = useState('');
  const [suggestedTitle, setSuggestedTitle] = useState<string | undefined>();
  const [suggestedMood, setSuggestedMood] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>(hasExistingContent ? 'append' : 'replace');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up media streams and timers
  const cleanupRecording = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupRecording();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      cleanupRecording();
      setState('idle');
      setDuration(0);
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setTranscript('');
      setSuggestedTitle(undefined);
      setSuggestedMood(undefined);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Start recording
  const handleStartRecording = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Determine supported MIME type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      setAudioMimeType(mimeType || 'audio/webm');

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        setAudioBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setAudioUrl(url);
      };

      recorder.start(250); // Collect data every 250ms
      setState('recording');
      setDuration(0);

      timerIntervalRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error('Error starting recording:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Permission') || errMsg.includes('denied') || errMsg.includes('NotAllowedError')) {
        setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser to record voice reflections.');
      } else {
        setErrorMessage(`Could not start audio recording: ${errMsg}`);
      }
      setState('error');
    }
  };

  // Pause recording
  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setState('paused');
    }
  };

  // Resume recording
  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      timerIntervalRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
      setState('recording');
    }
  };

  // Stop recording and send for transcription
  const handleStopAndTranscribe = () => {
    if (!mediaRecorderRef.current) return;

    cleanupRecording();
    setState('transcribing');

    // Give onstop event a moment to finalize blob
    setTimeout(() => {
      const fullBlob = new Blob(audioChunksRef.current, {
        type: audioMimeType || 'audio/webm',
      });
      setAudioBlob(fullBlob);
      sendAudioForTranscription(fullBlob, audioMimeType, duration);
    }, 150);
  };

  // Helper to convert Blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Send audio payload to /api/transcribe-audio
  const sendAudioForTranscription = async (blob: Blob, mimeType: string, recordedSeconds: number) => {
    try {
      if (blob.size === 0) {
        throw new Error('Recorded audio is empty. Please try recording again.');
      }

      const base64Audio = await blobToBase64(blob);

      const res = await fetchWithAuth('/api/transcribe-audio', {
        method: 'POST',
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: mimeType || blob.type || 'audio/webm',
          durationSeconds: recordedSeconds,
        }),
      });

      const data = await safeParseJsonResponse<AudioTranscriptionResponse>(res);

      if (!data.success || !data.transcript) {
        throw new Error(data.error || 'Failed to transcribe audio recording.');
      }

      setTranscript(data.transcript);
      setSuggestedTitle(data.suggestedTitle);
      setSuggestedMood(data.suggestedMood);
      setState('review');
    } catch (err: unknown) {
      console.error('Transcription failed:', err);
      const errMsg = err instanceof Error ? err.message : 'Could not transcribe voice note.';
      setErrorMessage(errMsg);
      setState('error');
    }
  };

  // Upload an audio file directly
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setState('transcribing');

    const mime = file.type || 'audio/webm';
    sendAudioForTranscription(file, mime, 0);
  };

  // Apply transcription to editor
  const handleApply = () => {
    if (!transcript.trim()) return;
    onApplyTranscription({
      transcript: transcript.trim(),
      suggestedTitle,
      suggestedMood,
      mode: applyMode,
    });
    onClose();
  };

  // Discard and restart
  const handleRestart = () => {
    cleanupRecording();
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setTranscript('');
    setSuggestedTitle(undefined);
    setSuggestedMood(undefined);
    setErrorMessage(null);
    setState('idle');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Voice-to-Journal Reflection</h2>
              <p className="text-2xs text-slate-500 dark:text-slate-400">
                Record your voice freely; Gemini will transcribe and structure your thoughts.
              </p>
            </div>
          </div>
          <button
            id="voice-modal-close-btn"
            type="button"
            onClick={onClose}
            disabled={state === 'transcribing'}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
            aria-label="Close voice modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* IDLE STATE */}
          {state === 'idle' && (
            <div className="text-center py-6 space-y-6">
              <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-indigo-50 dark:bg-indigo-950/40 animate-ping opacity-25" />
                <button
                  id="start-voice-record-btn"
                  type="button"
                  onClick={handleStartRecording}
                  className="relative w-20 h-20 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all"
                  title="Click to start recording"
                >
                  <Mic className="w-8 h-8" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Tap to Start Speaking</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  Speak naturally about your day, challenges, gratitude, or emotions. You will be able to review and edit the transcribed text before saving.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="audio-file-upload-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span>Upload audio file (.mp3, .wav, .m4a)</span>
                </button>
              </div>
            </div>
          )}

          {/* RECORDING / PAUSED STATE */}
          {(state === 'recording' || state === 'paused') && (
            <div className="text-center py-6 space-y-6">
              {/* Pulsing Aura & Waveform */}
              <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
                {state === 'recording' && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" />
                    <div className="absolute inset-2 rounded-full bg-red-500/10 animate-pulse" />
                  </>
                )}
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-md transition-all ${
                    state === 'recording' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  <Mic className="w-8 h-8" />
                </div>
              </div>

              {/* Timer & Status */}
              <div>
                <div className="text-3xl font-mono font-bold text-slate-900 dark:text-white tracking-wider">
                  {formatTime(duration)}
                </div>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      state === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {state === 'recording' ? 'Recording in progress...' : 'Recording paused'}
                  </span>
                </div>
              </div>

              {/* Live Waveform Indicator */}
              <div className="flex items-center justify-center gap-1 h-8">
                {[12, 24, 32, 16, 28, 20, 36, 14, 22, 30, 18, 26, 14, 32, 20].map((h, idx) => (
                  <div
                    key={idx}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      state === 'recording' ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                    style={{
                      height: state === 'recording' ? `${Math.max(6, (h * (idx % 3 + 1)) % 32)}px` : '4px',
                    }}
                  />
                ))}
              </div>

              {/* Recording Controls */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  id="cancel-voice-record-btn"
                  type="button"
                  onClick={handleRestart}
                  className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>

                {state === 'recording' ? (
                  <button
                    id="pause-voice-record-btn"
                    type="button"
                    onClick={handlePauseRecording}
                    className="px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    id="resume-voice-record-btn"
                    type="button"
                    onClick={handleResumeRecording}
                    className="px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  id="stop-and-transcribe-btn"
                  type="button"
                  onClick={handleStopAndTranscribe}
                  disabled={duration === 0}
                  className="px-5 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Done & Transcribe</span>
                </button>
              </div>
            </div>
          )}

          {/* TRANSCRIBING LOADING STATE */}
          {state === 'transcribing' && (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Transcribing Reflection...</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  Gemini is converting your spoken audio into clean, structured journal text.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-2xs text-slate-600 dark:text-slate-300">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Extracting transcript, suggested title & tone</span>
              </div>
            </div>
          )}

          {/* REVIEW & EDIT STATE */}
          {state === 'review' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Transcribed Reflection
                </span>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="text-2xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Record Again</span>
                </button>
              </div>

              {/* Audio Playback Preview */}
              {audioUrl && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                    <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Audio Recording ({formatTime(duration)})</span>
                  </div>
                  <audio controls src={audioUrl} className="h-8 max-w-[240px]" />
                </div>
              )}

              {/* AI Suggestions Pill Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {suggestedTitle && (
                  <div className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 text-xs font-medium border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                    <span className="text-2xs text-indigo-500 dark:text-indigo-400 font-bold uppercase">Title:</span>
                    <span>{suggestedTitle}</span>
                  </div>
                )}
                {suggestedMood && (
                  <div className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 text-xs font-medium border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Mood:</span>
                    <span>{suggestedMood}</span>
                  </div>
                )}
              </div>

              {/* Editable Transcript Area */}
              <div>
                <label className="block text-2xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Transcription (Review & Edit before inserting)
                </label>
                <textarea
                  id="review-transcript-textarea"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={8}
                  className="w-full text-xs sm:text-sm p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 leading-relaxed"
                  placeholder="Review or edit your transcribed voice note here..."
                />
              </div>

              {/* Merge / Insertion Mode */}
              {hasExistingContent && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-2xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">
                    Insertion Mode
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setApplyMode('append')}
                      className={`p-2 rounded-lg text-xs font-medium border transition-all text-left ${
                        applyMode === 'append'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="block font-bold">Append to Content</span>
                      <span className="text-2xs text-slate-500 dark:text-slate-400">Keep existing text and add transcript below</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setApplyMode('replace')}
                      className={`p-2 rounded-lg text-xs font-medium border transition-all text-left ${
                        applyMode === 'replace'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="block font-bold">Replace Content</span>
                      <span className="text-2xs text-slate-500 dark:text-slate-400">Overwrite editor with this voice transcript</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ERROR STATE */}
          {state === 'error' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Recording or Transcription Issue</h3>
                <p className="text-xs text-red-700 dark:text-red-300 max-w-sm mx-auto mt-1 leading-relaxed">
                  {errorMessage || 'An error occurred during audio processing.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {state === 'review' && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleRestart}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Discard & Re-record
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                id="apply-transcription-btn"
                type="button"
                onClick={handleApply}
                disabled={!transcript.trim()}
                className="px-5 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Use in Journal</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
