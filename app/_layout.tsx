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

const RootLayout: React.FC = () => {
	const colorScheme = useColorScheme();
	const [loaded] = useFonts({
		SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
	});

	const [autoplayFailed, setAutoplayFailed] = useState(false);
	const player = useAudioPlayer(audioSource, {
		isLooping: true,
		volume: 0.5,
		autoPlay: true,
	});

	useEffect(() => {
		if (player.error) {
			setAutoplayFailed(true);
		}
	}, [player.error]);

	const handleToggleSound = () => {
		if (player.isPlaying) {
			player.pause();
		} else {
			player.play();
			setAutoplayFailed(false);
		}
	};

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
			<View pointerEvents="box-none" style={styles.soundButtonContainer}>
				<TouchableOpacity
					accessibilityLabel={player.isPlaying ? 'Mute background music' : 'Unmute background music'}
					onPress={handleToggleSound}
					style={styles.soundButton}
				>
					<Feather
						name={player.isPlaying ? 'volume-2' : 'volume-x'}
						size={28}
						color={player.isPlaying ? '#4caf50' : '#f44336'}
					/>
				</TouchableOpacity>
			</View>
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
		backgroundColor: 'rgba(0,0,0,0.5)',
		borderRadius: 24,
		padding: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
});
export default RootLayout;
