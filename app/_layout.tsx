import { Feather } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useAudioPlayer } from 'expo-audio';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

const audioSource = require('../assets/audio/background.mp3');

const useMobileAudioAutoplay = () => {
	const player = useAudioPlayer(audioSource);
	useEffect(() => {
		if (Platform.OS !== 'web' && player) {
			player.loop = true;
			player.volume = 0.5;
			player.play();
			return () => {
				player.pause();
			};
		}
	}, [player]);
};

const AudioButton: React.FC = () => {
	const player = useAudioPlayer(audioSource);
	const [isPlaying, setIsPlaying] = useState(player.playing);

	useEffect(() => {
		setIsPlaying(player.playing);
	}, [player.playing]);

	// Set up looping, volume, and try autoplay on mount
	useEffect(() => {
		if (!player) return;
		player.loop = true;
		player.volume = 0.5;
		// Clean up on unmount
		return () => {
			player.pause();
		};
	}, [player]);

	const handleToggleSound = async () => {
		if (isPlaying) {
			player.pause();
			setIsPlaying(false);
		} else {
			try {
				await player.play();
				setIsPlaying(true);
			} catch (e) {
				console.error('PLAYBACK FAILED', e);
			}
		}
	};

	return (
		<View pointerEvents="box-none" style={styles.soundButtonContainer}>
			<TouchableOpacity
				accessibilityLabel={isPlaying ? 'Mute background music' : 'Unmute background music'}
				onPress={handleToggleSound}
				style={styles.soundButton}
			>
				<Feather
					name={player.playing ? 'volume-2' : 'volume-x'}
					size={28}
					color={player.playing ? '#4caf50' : '#f44336'}
				/>
			</TouchableOpacity>
		</View>
	);
};

const RootLayout: React.FC = () => {
	const colorScheme = useColorScheme();
	const [loaded] = useFonts({
		SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
	});

	// Auto-play audio on mobile (non-web)
	useMobileAudioAutoplay();

	if (!loaded) {
		// Async font loading only occurs in development.
		return null;
	}

	return (
		<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
			<Stack initialRouteName="index">
				<Stack.Screen name="index" options={{ headerShown: false }} />
				<Stack.Screen name="new-game" options={{ headerShown: false }} />
				<Stack.Screen name="+not-found" />
			</Stack>
			<StatusBar style="auto" />
			{/* Only show sound button on web */}
			{Platform.OS === 'web' && (
				<View pointerEvents="box-none" style={styles.soundButtonContainer}>
					<AudioButton />
				</View>
			)}
		</ThemeProvider>
	);
};

const styles = StyleSheet.create({
	soundButtonContainer: {
		position: 'absolute',
		left: 16,
		bottom: Platform.OS === 'web' ? 24 : 36,
		zIndex: 1000,
	},
	soundButton: {
		padding: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
});
export default RootLayout;
