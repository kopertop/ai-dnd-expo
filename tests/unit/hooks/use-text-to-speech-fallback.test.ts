import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react-native';

vi.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 13 },
}));

vi.mock('@/stores/settings-store', () => ({
  useSettingsStore: () => ({ voice: undefined }),
}));

import { useTextToSpeech } from '@/hooks/use-text-to-speech.stub';

describe('useTextToSpeech fallback (stub) on non-iOS', () => {
  it('should report unavailable TTS', () => {
    const { result } = renderHook(() => useTextToSpeech());
    expect(result.current.isAvailable).toBe(false);
  });
});
