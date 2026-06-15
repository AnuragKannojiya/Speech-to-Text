import { useState, useEffect, useRef, useCallback } from 'react';
import { TranscriptionService } from '../services/transcriptionService';
import type { ConnectionState, TranscriptEvent } from '../services/transcriptionService';

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: string;
  wordCount: number;
}

export function useLiveTranscription() {
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0); // seconds

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const transcriptionServiceRef = useRef<TranscriptionService | null>(null);
  const timerRef = useRef<number | null>(null);

  const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY || '';

  // Initialize deepgram transcription service
  useEffect(() => {
    const service = new TranscriptionService(
      apiKey,
      (event: TranscriptEvent) => {
        if (event.isFinal) {
          if (event.text.trim()) {
            const wordCount = event.text.trim().split(/\s+/).filter(Boolean).length;
            const now = new Date();
            const formattedTime = now.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            
            setSegments((prev) => [
              ...prev,
              {
                id: `${event.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
                text: event.text.trim(),
                timestamp: formattedTime,
                wordCount,
              },
            ]);
          }
          // Reset interim when final lands
          setInterimTranscript('');
        } else {
          setInterimTranscript(event.text.trim());
        }
      },
      (err: Error) => {
        setError(err.message);
      },
      (status: ConnectionState) => {
        setConnectionStatus(status);
      }
    );

    transcriptionServiceRef.current = service;

    return () => {
      service.disconnect();
    };
  }, [apiKey]);

  const startRecording = useCallback(async () => {
    setError(null);
    setSegments([]);
    setInterimTranscript('');
    setDuration(0);

    if (!apiKey || apiKey === 'your-deepgram-api-key') {
      setError(
        'Deepgram API Key is missing or using placeholder. Please set VITE_DEEPGRAM_API_KEY in your local .env file.'
      );
      return;
    }

    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      audioStreamRef.current = stream;

      // 2. Open WebSocket to Deepgram
      if (transcriptionServiceRef.current) {
        transcriptionServiceRef.current.connect();
      }

      // 3. Setup MediaRecorder
      // Identify supported browser mime types
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/ogg' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/mp4' };
      }
      
      const mediaRecorder = new MediaRecorder(
        stream,
        MediaRecorder.isTypeSupported(options.mimeType) ? options : undefined
      );
      
      mediaRecorderRef.current = mediaRecorder;

      // 4. Pipe chunks to transcriptionService when they arrive
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && transcriptionServiceRef.current) {
          // Send raw blob chunk to WebSocket
          transcriptionServiceRef.current.sendAudio(event.data);
        }
      };

      // Emit dataavailable event every 250ms for low latency transcription
      mediaRecorder.start(250);
      setIsRecording(true);

      // Start duration elapsed timer
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Microphone setup failed:', err);
      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        err.message?.includes('Permission denied')
      ) {
        setError(
          'Microphone permission denied. To transcribe, please enable microphone permissions in your browser address bar/settings.'
        );
      } else {
        setError(`Failed to access microphone: ${err.message || 'Unknown error'}`);
      }
      stopRecording();
    }
  }, [apiKey]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);

    // Stop duration timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Failed to stop MediaRecorder:', e);
      }
    }
    mediaRecorderRef.current = null;

    // Stop and release audio tracks (turns off microphone indicator in browser)
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    // Disconnect websocket
    if (transcriptionServiceRef.current) {
      transcriptionServiceRef.current.disconnect();
    }

    setInterimTranscript('');
  }, []);

  const clearTranscript = useCallback(() => {
    setSegments([]);
    setInterimTranscript('');
  }, []);

  // Make sure we clean up on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (transcriptionServiceRef.current) {
        transcriptionServiceRef.current.disconnect();
      }
    };
  }, []);

  // Compute stats on the fly
  const totalWords = segments.reduce((sum, s) => sum + s.wordCount, 0);

  return {
    isRecording,
    segments,
    interimTranscript,
    connectionStatus,
    error,
    duration,
    totalWords,
    startRecording,
    stopRecording,
    clearTranscript,
    setError,
  };
}
