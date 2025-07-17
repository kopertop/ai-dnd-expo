import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const SETTINGS_KEY = 'userSettings';

export interface UserSettings {
	musicVolume: number;
	isMusicMuted: boolean;
}

interface SettingsStore extends UserSettings {
	// Actions
	setMusicVolume: (volume: number) => void;
	setMusicMuted: (muted: boolean) => void;
	updateSettings: (settings: Partial<UserSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>()(
	persist(
		(set) => ({
			// Initial state
			musicVolume: 1,
			isMusicMuted: false,

			// Actions
			setMusicVolume: (volume: number) => set({ musicVolume: volume }),
			setMusicMuted: (muted: boolean) => set({ isMusicMuted: muted }),
			updateSettings: (newSettings: Partial<UserSettings>) => set(newSettings),
		}),
		{
			name: SETTINGS_KEY,
			storage: createJSONStorage(() => AsyncStorage),
		},
	),
);
