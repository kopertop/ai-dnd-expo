import { Feather } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AudioProvider, useAudio } from '@/hooks/use-audio-player';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { InputModeProvider } from '@/hooks/use-input-mode';

const AudioButton: React.FC = () => {
	const { player, togglePlayPause } = useAudio();

	return (
		<View pointerEvents="box-none" style={styles.soundButtonContainer}>
			<TouchableOpacity
				accessibilityLabel={player.playing ? 'Mute background music' : 'Unmute background music'}
				onPress={togglePlayPause}
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

	if (!loaded) {
		// Async font loading only occurs in development.
		return null;
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<InputModeProvider>
				<AudioProvider>
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
				</AudioProvider>
			</InputModeProvider>
		</GestureHandlerRootView>
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
