import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from 'react';

import { useSettingsStore } from '../stores/settings-store';

export interface AudioPlayer {
	playing: boolean;
	loop: boolean;
	volume: number;
	play: () => Promise<void>;
	pause: () => void;
}

export interface AudioContextType {
	player: AudioPlayer;
	togglePlayPause: () => Promise<void>;
	play: () => Promise<void>;
	pause: () => void;
	isPlaying: boolean;
}

interface CreateAudioHooksOptions {
	autoPlayOnMount?: boolean;
}

export const createAudioHooks = (
	usePlatformAudioPlayer: () => AudioPlayer,
	options: CreateAudioHooksOptions = {},
) => {
	const AudioContext = createContext<AudioContextType | null>(null);

	const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
		const isMusicMuted = useSettingsStore(state => state.isMusicMuted);
		const musicVolume = useSettingsStore(state => state.musicVolume);
		const toggleMusicMuted = useSettingsStore(state => state.toggleMusicMuted);

		const player = usePlatformAudioPlayer();
		const playerRef = useRef<AudioPlayer | null>(null);
		playerRef.current = player;

		const isInitializedRef = useRef(false);
		const previousMutedRef = useRef<boolean | null>(null);
		const previousVolumeRef = useRef<number | null>(null);

		const isPlaying = !isMusicMuted;

		useEffect(() => {
			if (isInitializedRef.current || !playerRef.current) {
				return;
			}
			isInitializedRef.current = true;

			const currentPlayer = playerRef.current;

			try {
				currentPlayer.loop = true;

				if (options.autoPlayOnMount) {
					currentPlayer.play().catch(error => {
						console.warn('Audio auto-play failed:', error);
					});
				}
			} catch (error) {
				console.warn('Audio setup failed:', error);
			}

			return () => {
				try {
					currentPlayer.pause();
				} catch (error) {
					console.warn('Audio cleanup failed:', error);
				}
			};
			 
		}, []);

		useEffect(() => {
			const currentPlayer = playerRef.current;
			if (!currentPlayer || !isInitializedRef.current) return;

			if (previousMutedRef.current !== isMusicMuted) {
				previousMutedRef.current = isMusicMuted;
				if (isMusicMuted) {
					currentPlayer.pause();
				} else if (!currentPlayer.playing) {
					currentPlayer.play().catch(error => {
						console.warn('Audio play failed:', error);
					});
				}
			}

			if (previousVolumeRef.current !== musicVolume && !isMusicMuted) {
				previousVolumeRef.current = musicVolume;
				currentPlayer.volume = musicVolume;
			}
		}, [isMusicMuted, musicVolume]);

		const togglePlayPause = useCallback(async () => {
			toggleMusicMuted();
		}, [toggleMusicMuted]);

		const play = useCallback(async () => {
			try {
				await playerRef.current?.play();
			} catch (error) {
				console.warn('Audio play failed:', error);
			}
		}, []);

		const pause = useCallback(() => {
			try {
				playerRef.current?.pause();
			} catch (error) {
				console.warn('Audio pause failed:', error);
			}
		}, []);

		const contextValue = useMemo(
			() => ({
				player,
				togglePlayPause,
				play,
				pause,
				isPlaying,
			}),
			[player, togglePlayPause, play, pause, isPlaying],
		);

		return <AudioContext.Provider value={contextValue}>{children}</AudioContext.Provider>;
	};

	const useAudio = (): AudioContextType => {
		const context = useContext(AudioContext);
		if (!context) {
			throw new Error('useAudio must be used within an AudioProvider');
		}
		return context;
	};

	return { AudioProvider, useAudio };
};



