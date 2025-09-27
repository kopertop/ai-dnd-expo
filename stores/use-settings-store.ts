import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface VoiceSettings {
  onDeviceTTS: boolean;
	voiceEnabled: boolean;
	ttsEnabled: boolean;
	sttEnabled: boolean;
	volume: number;
	speechRate: number;
	language: string;
	selectedVoiceId?: string;
	autoSpeak: boolean;
}

export interface AppSettings {
	theme: 'light' | 'dark' | 'auto';
	soundEffectsEnabled: boolean;
	backgroundMusicEnabled: boolean;
	hapticFeedbackEnabled: boolean;
	autoSaveEnabled: boolean;
	debugMode: boolean;
}

interface SettingsState {
	voice: VoiceSettings;
	app: AppSettings;
	updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
	updateAppSettings: (settings: Partial<AppSettings>) => void;
	resetVoiceSettings: () => void;
	resetAppSettings: () => void;
	resetAllSettings: () => void;
}

const defaultVoiceSettings: VoiceSettings = {
  onDeviceTTS: false,
	voiceEnabled: true,
	ttsEnabled: true,
	sttEnabled: true,
	volume: 1.0,
	speechRate: 1.0,
	language: 'en-US',
	selectedVoiceId: undefined,
	autoSpeak: true,
};

const defaultAppSettings: AppSettings = {
	theme: 'auto',
	soundEffectsEnabled: true,
	backgroundMusicEnabled: true,
	hapticFeedbackEnabled: true,
	autoSaveEnabled: true,
	debugMode: false,
};

export const useSettingsStore = create<SettingsState>()(
	persist(
		set => ({
			voice: defaultVoiceSettings,
			app: defaultAppSettings,
			updateVoiceSettings: settings =>
				set(state => ({
					voice: { ...state.voice, ...settings },
				})),
			updateAppSettings: settings =>
				set(state => ({
					app: { ...state.app, ...settings },
				})),
			resetVoiceSettings: () =>
				set({
					voice: defaultVoiceSettings,
				}),
			resetAppSettings: () =>
				set({
					app: defaultAppSettings,
				}),
			resetAllSettings: () =>
				set({
					voice: defaultVoiceSettings,
					app: defaultAppSettings,
				}),
		}),
		{
			name: 'settings-storage',
		},
	),
);
