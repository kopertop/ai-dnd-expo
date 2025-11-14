import { Feather } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ThemedView } from '@/components/themed-view';
import { AudioProvider, useAudio } from '@/hooks/use-audio-player';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { InputModeProvider } from '@/hooks/use-input-mode';
import { useAuthStore } from '@/stores/use-auth-store';

const AudioButton: React.FC = () => {
	const { isPlaying, togglePlayPause } = useAudio();

	return (
		<View style={[styles.soundButtonContainer, { pointerEvents: 'box-none' }]}>
			<TouchableOpacity
				accessibilityLabel={
					isPlaying ? 'Mute background music' : 'Unmute background music'
				}
				onPress={togglePlayPause}
				style={styles.soundButton}
			>
				<Feather
					name={isPlaying ? 'volume-2' : 'volume-x'}
					size={28}
					color={isPlaying ? '#4caf50' : '#f44336'}
				/>
			</TouchableOpacity>
		</View>
	);
};

// Global flag to track if auth has been initialized (persists across component mounts)
let globalAuthInitialized = false;

/**
 * Auth Guard Component
 * Redirects to login if not authenticated (except for login and auth callback routes)
 */
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const segments = useSegments();
	const { isAuthenticated, isLoading, initialize } = useAuthStore();
	const [isRouterReady, setIsRouterReady] = React.useState(false);
	const [hasRedirected, setHasRedirected] = React.useState(false);
	const [showLoading, setShowLoading] = React.useState(true);

	useEffect(() => {
		// Initialize auth globally (only once across all mounts)
		if (!globalAuthInitialized) {
			globalAuthInitialized = true;
			initialize();
		}
		// Mark router as ready after a brief delay to ensure it's mounted
		const timer = setTimeout(() => setIsRouterReady(true), 100);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run once on mount

	// Timeout to prevent infinite loading if backend is down
	useEffect(() => {
		const timer = setTimeout(() => setShowLoading(false), 2000); // Max 2 seconds loading
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (!isRouterReady || hasRedirected) return;

		const currentSegment = segments[0];
		const inAuthGroup = currentSegment === 'login' || currentSegment === 'auth';

		// If not authenticated and not on auth pages, redirect to login
		if (!isLoading && !isAuthenticated && !inAuthGroup) {
			setHasRedirected(true);
			router.replace('/login');
			return;
		}

		// If authenticated and on login page, redirect to home
		if (!isLoading && isAuthenticated && inAuthGroup && currentSegment === 'login') {
			setHasRedirected(true);
			router.replace('/');
			return;
		}
	}, [isAuthenticated, isLoading, segments, isRouterReady, hasRedirected]);

	// Reset redirect flag when segments change (after navigation completes)
	useEffect(() => {
		const timer = setTimeout(() => setHasRedirected(false), 100);
		return () => clearTimeout(timer);
	}, [segments]);

	// Show loading only briefly, then allow redirect even if backend is down
	if (((isLoading && isRouterReady) || !isRouterReady) && showLoading) {
		return (
			<ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
				<ActivityIndicator size="large" color="#C9B037" />
			</ThemedView>
		);
	}

	return <>{children}</>;
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
						<AuthGuard>
							<Stack initialRouteName="index">
								<Stack.Screen name="index" options={{ headerShown: false }} />
								<Stack.Screen name="login" options={{ headerShown: false }} />
								<Stack.Screen name="auth" options={{ headerShown: false }} />
								<Stack.Screen name="new-game" options={{ headerShown: false }} />
								<Stack.Screen name="game" options={{ headerShown: false }} />
								<Stack.Screen name="+not-found" />
							</Stack>
							<StatusBar style="auto" />
							{/* Only show sound button on web */}
							{Platform.OS === 'web' && (
								<View style={[styles.soundButtonContainer, { pointerEvents: 'box-none' }]}>
									<AudioButton />
								</View>
							)}
						</AuthGuard>
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
