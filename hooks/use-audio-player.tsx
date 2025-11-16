import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from 'react';
import { Platform } from 'react-native';

import audioSource from '../assets/audio/background.mp3';
import { useSettingsStore } from '../stores/settings-store';

interface AudioPlayer {
	playing: boolean;
	loop: boolean;
	volume: number;
	play: () => Promise<void>;
	pause: () => void;
}

interface AudioContextType {
	player: AudioPlayer;
	togglePlayPause: () => Promise<void>;
	play: () => Promise<void>;
	pause: () => void;
	isPlaying: boolean;
}

const AudioContext = createContext<AudioContextType | null>(null);

let useNativeAudioPlayer: ((source: string) => AudioPlayer) | null = null;

if (Platform.OS !== 'web') {
	try {

		const expoAudio = require('expo-audio');
		useNativeAudioPlayer = expoAudio.useAudioPlayer;
	} catch (error) {
		console.warn('Failed to load expo-audio:', error);
	}
}

const useWebAudioPlayer = (source: string, onPlayingChange?: (playing: boolean) => void) => {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const playingRef = useRef(false);
	const loopRef = useRef(true);
	const volumeRef = useRef(1);
	const onPlayingChangeRef = useRef(onPlayingChange);
	const isInitializedRef = useRef(false);

	// Keep the callback ref up to date without causing effect re-runs
	useEffect(() => {
		onPlayingChangeRef.current = onPlayingChange;
	}, [onPlayingChange]);

	useEffect(() => {
		if (typeof window === 'undefined' || typeof Audio === 'undefined') {
			return;
		}
		
		// Clean up previous audio element if it exists
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current = null;
		}
		
		isInitializedRef.current = false;
		audioRef.current = new Audio(source);
		audioRef.current.loop = loopRef.current;
		audioRef.current.volume = volumeRef.current;

		// Listen to play/pause events to track playing state
		// Use a flag to prevent callbacks during initialization
		const handlePlay = () => {
			playingRef.current = true;
			// Only call callback after initialization to prevent loops
			if (isInitializedRef.current) {
				onPlayingChangeRef.current?.(true);
			}
		};
		const handlePause = () => {
			playingRef.current = false;
			// Only call callback after initialization to prevent loops
			if (isInitializedRef.current) {
				onPlayingChangeRef.current?.(false);
			}
		};

		audioRef.current.addEventListener('play', handlePlay);
		audioRef.current.addEventListener('pause', handlePause);
		
		// Mark as initialized after a brief delay to allow setup to complete
		// This prevents initial play events from triggering callbacks
		const initTimeout = setTimeout(() => {
			isInitializedRef.current = true;
		}, 100);

		return () => {
			clearTimeout(initTimeout);
			audioRef.current?.removeEventListener('play', handlePlay);
			audioRef.current?.removeEventListener('pause', handlePause);
			audioRef.current?.pause();
			audioRef.current = null;
			isInitializedRef.current = false;
		};
	}, [source]); // Only depend on source, not onPlayingChange

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

const useConditionalAudioPlayer = (source: string, onPlayingChange?: (playing: boolean) => void) => {
	if (Platform.OS === 'web' || !useNativeAudioPlayer) {
		return useWebAudioPlayer(source, onPlayingChange);
	}
	return useNativeAudioPlayer(source);
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	// Use separate selectors to avoid creating new objects on every render
	const isMusicMuted = useSettingsStore(state => state.isMusicMuted);
	const musicVolume = useSettingsStore(state => state.musicVolume);
	const toggleMusicMuted = useSettingsStore(state => state.toggleMusicMuted);

	const playerRef = useRef<ReturnType<typeof useConditionalAudioPlayer> | null>(null);
	const isInitializedRef = useRef(false);
	const previousMutedRef = useRef<boolean | null>(null);
	const previousVolumeRef = useRef<number | null>(null);

	// Don't use callback or polling - just derive isPlaying directly
	// This avoids all state update mechanisms that could cause infinite loops
	const playerRaw = useConditionalAudioPlayer(audioSource);
	
	// Memoize player to ensure it's stable across renders
	// This prevents the player from being recreated on every render
	const player = useMemo(() => playerRaw, [playerRaw]);
	playerRef.current = player;
	
	// Derive isPlaying from isMusicMuted - when music is not muted, it's playing
	// This is reactive because isMusicMuted comes from the Zustand store
	const isPlaying = !isMusicMuted;

	// Set up the player once on mount
	useEffect(() => {
		if (isInitializedRef.current || !player) return;
		isInitializedRef.current = true;

		try {
			if (playerRef.current) {
				playerRef.current.loop = true;

				// Auto-play on mobile (non-web)
				if (Platform.OS !== 'web') {
					playerRef.current.play().catch(error => {
						console.warn('Audio auto-play failed:', error);
					});
				}
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run once on mount

	// Handle mute/unmute and volume changes - use refs to prevent infinite loops
	useEffect(() => {
		const currentPlayer = playerRef.current;
		if (!currentPlayer || !isInitializedRef.current) return;

		// Only update if values actually changed
		if (previousMutedRef.current !== isMusicMuted) {
			previousMutedRef.current = isMusicMuted;
			if (isMusicMuted) {
				currentPlayer.pause();
			} else {
				// Only play if not already playing
				if (!currentPlayer.playing) {
					currentPlayer.play().catch(error => {
						console.warn('Audio play failed:', error);
					});
				}
			}
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

	// Memoize the context value to prevent unnecessary re-renders
	// isPlaying is derived from isMusicMuted, which is reactive from the Zustand store
	const contextValue = useMemo(
		() => ({
			player,
			togglePlayPause,
			play,
			pause,
			isPlaying: !isMusicMuted, // When music is not muted, it's playing
		}),
		[player, togglePlayPause, play, pause, isMusicMuted],
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


