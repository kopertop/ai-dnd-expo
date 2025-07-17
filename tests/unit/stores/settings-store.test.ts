import { act, renderHook } from '@testing-library/react-native';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSettingsStore } from '../../../stores/settings-store';

describe('Settings Store', () => {
	beforeEach(() => {
		// Reset the store to initial state before each test
		act(() => {
			useSettingsStore.setState({
				musicVolume: 1,
				isMusicMuted: false,
			});
		});
	});

	it('should have initial state', () => {
		const { result } = renderHook(() => useSettingsStore());

		expect(result.current.musicVolume).toBe(1);
		expect(result.current.isMusicMuted).toBe(false);
	});

	it('should update music volume', () => {
		const { result } = renderHook(() => useSettingsStore());

		act(() => {
			result.current.setMusicVolume(0.5);
		});

		expect(result.current.musicVolume).toBe(0.5);
	});

	it('should toggle music mute', () => {
		const { result } = renderHook(() => useSettingsStore());

		act(() => {
			result.current.setMusicMuted(true);
		});

		expect(result.current.isMusicMuted).toBe(true);

		act(() => {
			result.current.setMusicMuted(false);
		});

		expect(result.current.isMusicMuted).toBe(false);
	});

	it('should update multiple settings at once', () => {
		const { result } = renderHook(() => useSettingsStore());

		act(() => {
			result.current.updateSettings({
				musicVolume: 0.3,
				isMusicMuted: true,
			});
		});

		expect(result.current.musicVolume).toBe(0.3);
		expect(result.current.isMusicMuted).toBe(true);
	});
});
