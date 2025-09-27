// iOS specific Text-to-Speech hook using Apple AI SDK and expo-av
import { useCallback, useEffect, useState, useRef } from 'react';
import { Buffer } from 'buffer'; // for base64 conversion
import { Audio } from 'expo-av'; // eslint-disable-line import/no-unresolved
import { useSettingsStore } from '@/stores/use-settings-store';
import { kokoroProvider } from '@/services/ai/providers/kokoro';

// Re-declare types to avoid circular import with generic hook
export interface TTSOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  voice?: string;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: string) => void;
}

export interface TTSVoice {
  identifier: string;
  name: string;
  language: string;
  quality: 'default' | 'enhanced' | 'premium';
  isPersonalVoice?: boolean;
  isNoveltyVoice?: boolean;
}

export interface TextToSpeechResult {
  isSpeaking: boolean;
  availableVoices: TTSVoice[];
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isAvailable: boolean;
}


export const useTextToSpeech = (): TextToSpeechResult => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<TTSVoice[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);

  // Keep a reference to the currently loaded sound
  const soundRef = useRef<any>(null);

  // Load Apple SDK and voices
  const loadVoices = useCallback(async () => {
    // Ensure running on iOS and version >= 13
    if (Platform.OS !== 'ios' || Number(Platform.Version) < 13) {
      setIsAvailable(false);
      setAvailableVoices([]);
      return;
    }
    try {
      const { apple, AppleSpeech } = await import('@react-native-ai/apple');
       // Request personal voice permission if API exists
       (apple as any).speech?.requestPersonalVoicePermission?.();
      const voices = await AppleSpeech.getVoices();
      setAvailableVoices(voices as unknown as TTSVoice[]);
      setIsAvailable(true);
    } catch (e) {
      console.error('Failed to load Apple TTS voices', e);
      setIsAvailable(false);
      setAvailableVoices([]);
    }
  }, []);

  useEffect(() => {
    loadVoices();
    return () => {
      // cleanup sound on unmount
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [loadVoices]);

  const stop = useCallback(() => {
    if (soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const pause = useCallback(() => {
    if (soundRef.current) {
      soundRef.current.pauseAsync().catch(() => {});
    }
  }, []);

  const resume = useCallback(() => {
    if (soundRef.current) {
      soundRef.current.playAsync().catch(() => {});
    }
  }, []);

  const speak = useCallback(
    async (text: string, options: TTSOptions = {}) => {
      if (!text.trim()) return;
      if (!isAvailable) {
        options.onError?.('TTS not available');
        return;
      }
      try {
        // Ensure any previous sound is stopped
        stop();
        setIsSpeaking(true);
        options.onStart?.();
        const { apple, AppleSpeech } = await import('@react-native-ai/apple');
        const voice = options.voice ?? undefined;
        const language = options.language ?? undefined;
        const result = await AppleSpeech.generate(text, { voice, language });
        // result.audio may contain uint8Array or base64
         const base64 =
           // @ts-ignore
           (result as any).audio?.base64 ??
           // fallback: convert Uint8Array to base64
           ((result as any).audio?.uint8Array
             ? Buffer.from((result as any).audio.uint8Array).toString('base64')
             : undefined);
        if (!base64) {
          throw new Error('No audio data returned');
        }
        const sound = new (Audio as any).Sound();
        await sound.loadAsync({ uri: `data:audio/wav;base64,${base64}` }, {}, false);
        soundRef.current = sound;
        await sound.playAsync();
        // Resolve when playback finishes
         const statusListener = sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.setOnPlaybackStatusUpdate(null as any);
            setIsSpeaking(false);
            options.onDone?.();
          }
        });
      } catch (err) {
        console.error('TTS speak error', err);
        setIsSpeaking(false);
        const msg = err instanceof Error ? err.message : 'TTS error';
        options.onError?.(msg);
      }
    },
    [isAvailable, stop]
  );

  return {
    isSpeaking,
    availableVoices,
    speak,
    stop,
    pause,
    resume,
    isAvailable,
  };
};
