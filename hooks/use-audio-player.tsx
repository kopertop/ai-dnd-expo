import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Platform } from 'react-native';

import audioSource from '../assets/audio/background.mp3';
import { useSettingsStore } from '../stores/settings-store';

interface AudioContextType {
	player: ReturnType<typeof useAudioPlayer>;
	togglePlayPause: () => Promise<void>;
	play: () => Promise<void>;
	pause: () => void;
	isPlaying: boolean;
}

const AudioContext = createContext<AudioContextType | null>(null);

let useNativeAudioPlayer: ((source: string) => ReturnType<any>) | null = null;

if (Platform.OS !== 'web') {
	try {

		const expoAudio = require('expo-audio');
		useNativeAudioPlayer = expoAudio.useAudioPlayer;
	} catch (error) {
		console.warn('Failed to load expo-audio:', error);
	}
}

const useWebAudioPlayer = (source: string) => {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const playingRef = useRef(false);
	const loopRef = useRef(true);
	const volumeRef = useRef(1);

	useEffect(() => {
		if (typeof window === 'undefined' || typeof Audio === 'undefined') {
			return;
		}
		audioRef.current = new Audio(source);
		audioRef.current.loop = loopRef.current;
		audioRef.current.volume = volumeRef.current;

		// Listen to play/pause events to track playing state
		const handlePlay = () => {
			playingRef.current = true;
		};
		const handlePause = () => {
			playingRef.current = false;
		};

		audioRef.current.addEventListener('play', handlePlay);
		audioRef.current.addEventListener('pause', handlePause);

		return () => {
			audioRef.current?.removeEventListener('play', handlePlay);
			audioRef.current?.removeEventListener('pause', handlePause);
			audioRef.current?.pause();
			audioRef.current = null;
		};
	}, [source]);

	const play = useCallback(async () => {
		if (!audioRef.current) {
			return;
		}
		try {
			await audioRef.current.play();
		} catch (error) {
			console.warn('Web audio play failed:', error);
		}
	}, []);

	const pause = useCallback(() => {
		if (!audioRef.current) {
			return;
		}
		audioRef.current.pause();
	}, []);

	// Return a stable object that doesn't change on every render
	return useMemo(
		() => ({
			get playing() {
				return playingRef.current;
			},
			get loop() {
				return loopRef.current;
			},
			set loop(value: boolean) {
				loopRef.current = value;
				if (audioRef.current) {
					audioRef.current.loop = value;
				}
			},
			get volume() {
				return volumeRef.current;
			},
			set volume(value: number) {
				volumeRef.current = value;
				if (audioRef.current) {
					audioRef.current.volume = value;
				}
			},
			play,
			pause,
		}),
		[play, pause],
	);
};

const useConditionalAudioPlayer = (source: string) => {
	if (Platform.OS === 'web' || !useNativeAudioPlayer) {
		return useWebAudioPlayer(source);
	}
	return useNativeAudioPlayer(source);
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isPlaying, setIsPlaying] = useState(false);
	const isMusicMuted = useSettingsStore(state => state.isMusicMuted);
	const musicVolume = useSettingsStore(state => state.musicVolume);
	const toggleMusicMuted = useSettingsStore(state => state.toggleMusicMuted);

	const player = useConditionalAudioPlayer(audioSource);
	const playerRef = useRef<ReturnType<typeof useConditionalAudioPlayer> | null>(null);
	const isInitializedRef = useRef(false);
	const previousMutedRef = useRef<boolean | null>(null);
	const previousVolumeRef = useRef<number | null>(null);
	const isUpdatingRef = useRef(false);

	// Store player in ref only once, keep it stable
	if (!playerRef.current) {
		playerRef.current = player;
	}

	// Set up the player once on mount
	useEffect(() => {
		if (isInitializedRef.current || !playerRef.current) return;
		isInitializedRef.current = true;

		try {
			playerRef.current.loop = true;

			// Auto-play on mobile (non-web)
			if (Platform.OS !== 'web') {
				playerRef.current.play();
			}
		} catch (error) {
			console.warn('Audio setup failed:', error);
		}

		return () => {
			try {
				if (playerRef.current && typeof playerRef.current.pause === 'function') {
					playerRef.current.pause();
				}
			} catch (error) {
				console.warn('Audio cleanup failed:', error);
			}
		};

	}, []); // Only run once on mount

	// Handle mute/unmute and volume changes - use refs to prevent infinite loops
	useEffect(() => {
		if (isUpdatingRef.current) return;

		const currentPlayer = playerRef.current;
		if (!currentPlayer || !isInitializedRef.current) return;

		// Only update if values actually changed
		if (previousMutedRef.current !== isMusicMuted) {
			isUpdatingRef.current = true;
			previousMutedRef.current = isMusicMuted;
			if (isMusicMuted) {
				currentPlayer.pause();
				setIsPlaying(false);
			} else {
				// Always try to play when unmuting (browser will handle if already playing)
				currentPlayer.play().catch(error => {
					console.warn('Audio play failed:', error);
				});
				setIsPlaying(true);
			}
			isUpdatingRef.current = false;
		}

		// Only update volume if it actually changed and not muted
		if (previousVolumeRef.current !== musicVolume && !isMusicMuted) {
			previousVolumeRef.current = musicVolume;
			currentPlayer.volume = musicVolume;
		}
	}, [isMusicMuted, musicVolume]);

	const togglePlayPause = useCallback(async () => {
		toggleMusicMuted();
	}, [toggleMusicMuted]);

	const play = useCallback(async () => {
		if (isUpdatingRef.current) return;
		try {
			isUpdatingRef.current = true;
			await playerRef.current?.play();
			setIsPlaying(true);
			isUpdatingRef.current = false;
		} catch (error) {
			isUpdatingRef.current = false;
			console.warn('Audio play failed:', error);
		}
	}, []);

	const pause = useCallback(() => {
		if (isUpdatingRef.current) return;
		try {
			isUpdatingRef.current = true;
			playerRef.current?.pause();
			setIsPlaying(false);
			isUpdatingRef.current = false;
		} catch (error) {
			isUpdatingRef.current = false;
			console.warn('Audio pause failed:', error);
		}
	}, []);

	// Create a stable player object - remove playing getter to avoid dependency on isPlaying
	const stablePlayer = useMemo(
		() => ({
			get loop() {
				return playerRef.current?.loop ?? false;
			},
			set loop(value: boolean) {
				if (playerRef.current) {
					playerRef.current.loop = value;
				}
			},
			get volume() {
				return playerRef.current?.volume ?? 0;
			},
			set volume(value: number) {
				if (playerRef.current) {
					playerRef.current.volume = value;
				}
			},
			play: async () => {
				await play();
			},
			pause: () => {
				pause();
			},
		}),
		[play, pause],
	);

	// Memoize the context value to prevent unnecessary re-renders
	const contextValue = useMemo(
		() => ({
			player: stablePlayer,
			togglePlayPause,
			play,
			pause,
			isPlaying,
		}),
		[stablePlayer, togglePlayPause, play, pause, isPlaying],
	);

	return (
		<AudioContext.Provider value={contextValue}>
			{children}
		</AudioContext.Provider>
	);
};

export const useAudio = (): AudioContextType => {
	const context = useContext(AudioContext);
	if (!context) {
		throw new Error('useAudio must be used within an AudioProvider');
	}
	return context;
};


