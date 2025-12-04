import { useCallback, useEffect, useMemo, useRef } from 'react';

import audioSource from '../assets/audio/background.mp3';

import { AudioPlayer, createAudioHooks } from './use-audio-player-base';

const useWebAudioPlayer = (): AudioPlayer => {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const playingRef = useRef(false);
	const loopRef = useRef(true);
	const volumeRef = useRef(1);
	const isInitializedRef = useRef(false);

	useEffect(() => {
		if (typeof window === 'undefined' || typeof Audio === 'undefined') {
			return;
		}

		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current = null;
		}

		isInitializedRef.current = false;
		audioRef.current = new Audio(audioSource);
		audioRef.current.loop = loopRef.current;
		audioRef.current.volume = volumeRef.current;

		const handlePlay = () => {
			playingRef.current = true;
		};
		const handlePause = () => {
			playingRef.current = false;
		};

		audioRef.current.addEventListener('play', handlePlay);
		audioRef.current.addEventListener('pause', handlePause);

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
	}, []);

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

const { AudioProvider, useAudio } = createAudioHooks(useWebAudioPlayer);

export { AudioProvider, useAudio };



