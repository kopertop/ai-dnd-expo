import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const expoAudio = require('expo-audio');
		useNativeAudioPlayer = expoAudio.useAudioPlayer;
	} catch (error) {
		console.warn('Failed to load expo-audio:', error);
	}
}

const useWebAudioPlayer = (source: string) => {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [playing, setPlaying] = useState(false);
	const [loop, setLoop] = useState(true);
	const [volume, setVolume] = useState(1);

	useEffect(() => {
		if (typeof window === 'undefined' || typeof Audio === 'undefined') {
			return;
		}
		audioRef.current = new Audio(source);
		audioRef.current.loop = loop;
		audioRef.current.volume = volume;

		return () => {
			audioRef.current?.pause();
			audioRef.current = null;
		};
	}, [source]);

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.loop = loop;
		}
	}, [loop]);

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.volume = volume;
		}
	}, [volume]);

	const play = async () => {
		if (!audioRef.current) {
			return;
		}
		try {
			await audioRef.current.play();
			setPlaying(true);
		} catch (error) {
			console.warn('Web audio play failed:', error);
		}
	};

	const pause = () => {
		if (!audioRef.current) {
			return;
		}
		audioRef.current.pause();
		setPlaying(false);
	};

	return {
		playing,
		get loop() {
			return loop;
		},
		set loop(value: boolean) {
			setLoop(value);
		},
		get volume() {
			return volume;
		},
		set volume(value: number) {
			setVolume(value);
		},
		play,
		pause,
	} as ReturnType<any>;
};

const useConditionalAudioPlayer = (source: string) => {
	if (Platform.OS === 'web' || !useNativeAudioPlayer) {
		return useWebAudioPlayer(source);
	}
	return useNativeAudioPlayer(source);
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isPlaying, setIsPlaying] = useState(false);
	const player = useConditionalAudioPlayer(audioSource);
	const { isMusicMuted, musicVolume } = useSettingsStore();

	useEffect(() => {
		if (player.playing) {
			setIsPlaying(true);
		} else {
			setIsPlaying(false);
		}
	}, [player.playing]);

	useEffect(() => {
		if (player) {
			console.log('Setting Music Player Settings', isMusicMuted);
			if (isMusicMuted) {
				player.pause();
			} else {
				player.play();
			}
		}
	}, [isMusicMuted, player]);

	// Set up the player once
	useEffect(() => {
		if (!player) return;

		try {
			player.loop = true;

			// Auto-play on mobile (non-web)
			if (Platform.OS !== 'web') {
				player.play();
				setIsPlaying(true);
			}
		} catch (error) {
			console.warn('Audio setup failed:', error);
		}

		return () => {
			try {
				if (player && typeof player.pause === 'function') {
					player.pause();
					setIsPlaying(false);
				}
			} catch (error) {
				console.warn('Audio cleanup failed:', error);
			}
		};
	}, [player]);

	useEffect(() => {
		if (player) {
			if (isMusicMuted) {
				player.pause();
			} else {
				player.volume = musicVolume;
				if (!player.playing) {
					player.play();
				}
			}
		}
	}, [isMusicMuted, musicVolume, player]);

	const togglePlayPause = async () => {
		try {
			if (player.playing) {
				player.pause();
				setIsPlaying(false);
			} else {
				await player.play();
				setIsPlaying(true);
			}
		} catch (error) {
			console.warn('Audio toggle failed:', error);
		}
	};

	const play = async () => {
		try {
			await player.play();
			setIsPlaying(true);
		} catch (error) {
			console.warn('Audio play failed:', error);
		}
	};

	const pause = () => {
		try {
			player.pause();
			setIsPlaying(false);
		} catch (error) {
			console.warn('Audio pause failed:', error);
		}
	};

	return (
		<AudioContext.Provider value={{ player, togglePlayPause, play, pause, isPlaying }}>
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
