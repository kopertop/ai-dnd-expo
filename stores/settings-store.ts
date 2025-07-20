import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const SETTINGS_KEY = 'userSettings';

export interface VoiceSettings {
	ttsEnabled: boolean;
	sttEnabled: boolean;
	autoSpeak: boolean;
	volume: number;
	speechRate: number;
	selectedVoiceId?: string;
	preferredLanguage?: string;
}

export interface UserSettings {
	musicVolume: number;
	isMusicMuted: boolean;
	voice: VoiceSettings;
}

interface SettingsStore extends UserSettings {
	// Actions
	setMusicVolume: (volume: number) => void;
	setMusicMuted: (muted: boolean) => void;
	updateSettings: (settings: Partial<UserSettings>) => void;
	updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>()(
	persist(
		set => ({
			// Initial state
			musicVolume: 1,
			isMusicMuted: false,
			voice: {
				ttsEnabled: true,
				sttEnabled: true,
				autoSpeak: true,
				volume: 1.0,
				speechRate: 1.0,
				selectedVoiceId: undefined,
				preferredLanguage: 'en',
			},

			// Actions
			setMusicVolume: (volume: number) => set({ musicVolume: volume }),
			setMusicMuted: (muted: boolean) => set({ isMusicMuted: muted }),
			updateSettings: (newSettings: Partial<UserSettings>) => set(newSettings),
			updateVoiceSettings: (voiceSettings: Partial<VoiceSettings>) =>
				set(state => ({
					voice: { ...state.voice, ...voiceSettings },
				})),
		}),
		{
			name: SETTINGS_KEY,
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
);
