import { useAudioPlayer as useExpoAudioPlayer } from 'expo-audio';
import { useMemo } from 'react';

import audioSource from '../assets/audio/background.mp3';

import { AudioPlayer, createAudioHooks } from './use-audio-player-base';

const useNativeAudioPlayer = (): AudioPlayer => {
	const player = useExpoAudioPlayer(audioSource);

	return useMemo<AudioPlayer>(
		() => ({
			get playing() {
				return player.playing;
			},
			get loop() {
				return player.loop;
			},
			set loop(value: boolean) {
				player.loop = value;
			},
			get volume() {
				return player.volume;
			},
			set volume(value: number) {
				player.volume = value;
			},
			play: () => Promise.resolve(player.play()),
			pause: () => {
				player.pause();
			},
		}),
		[player],
	);
};

const { AudioProvider, useAudio } = createAudioHooks(useNativeAudioPlayer, {
	autoPlayOnMount: true,
});

export { AudioProvider, useAudio };


