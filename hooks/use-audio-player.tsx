import { useAudioPlayer } from 'expo-audio';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const audioSource = require('../assets/audio/background.mp3');

interface AudioContextType {
	player: ReturnType<typeof useAudioPlayer>;
	togglePlayPause: () => Promise<void>;
	play: () => Promise<void>;
	pause: () => void;
	isPlaying: boolean;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isPlaying, setIsPlaying] = useState(false);
	const player = useAudioPlayer(audioSource);

	useEffect(() => {
		if (player.playing) {
			setIsPlaying(true);
		} else {
			setIsPlaying(false);
		}
	}, [player.playing]);

	// Set up the player once
	useEffect(() => {
		if (!player) return;

		try {
			player.loop = true;
			player.volume = 0.5;

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
