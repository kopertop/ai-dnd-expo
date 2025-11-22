import { Feather } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { authService, SessionProvider, useAuth } from 'expo-auth-template/frontend';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import {
	ActivityIndicator,
	Image,
	Platform,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AudioProvider, useAudio } from '@/hooks/use-audio-player';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { InputModeProvider } from '@/hooks/use-input-mode';
import { API_BASE_URL } from '@/services/config/api-base-url';

authService.updateConfig({
	apiBaseUrl: API_BASE_URL || '/api/',
});

const AudioButton: React.FC = () => {
	const { isPlaying, togglePlayPause } = useAudio();

	return (
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
	);
};

const UserMenu: React.FC = () => {
	const { user, signOut } = useAuth();
	const [isMenuVisible, setMenuVisible] = React.useState(false);

	useEffect(() => {
		if (!user && isMenuVisible) {
			setMenuVisible(false);
		}
	}, [user, isMenuVisible]);

	if (!user) {
		return null;
	}

	const displayName = user.name || user.email;
	const avatarSource = user.picture ? { uri: user.picture } : null;

	const handleSignOut = async () => {
		try {
			await signOut();
		} finally {
			setMenuVisible(false);
		}
	};

	return (
		<View style={[styles.userMenuContainer, { pointerEvents: 'box-none' }]}>
			<View style={{ pointerEvents: 'auto', alignItems: 'flex-end' }}>
				<TouchableOpacity
					accessibilityLabel="Open account menu"
					style={styles.avatarButton}
					onPress={() => setMenuVisible((prev) => !prev)}
				>
					{avatarSource ? (
						<Image source={avatarSource} style={styles.avatarImage} />
					) : (
						<View style={styles.avatarFallback}>
							<Feather name="user" size={20} color="#3B2F1B" />
						</View>
					)}
				</TouchableOpacity>
				{isMenuVisible && (
					<View style={styles.userMenuDropdown}>
						<ThemedText style={styles.userNameText} numberOfLines={1}>
							{displayName}
						</ThemedText>
						<TouchableOpacity
							style={styles.signOutButton}
							onPress={handleSignOut}
						>
							<ThemedText style={styles.signOutText}>Sign out</ThemedText>
						</TouchableOpacity>
					</View>
				)}
			</View>
		</View>
	);
};

/**
 * Auth Guard Component
 * Redirects to login if not authenticated (except for login and auth callback routes)
 */
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { session, user, isLoading } = useAuth();
	const [isRouterReady, setIsRouterReady] = React.useState(false);
	const [hasRedirected, setHasRedirected] = React.useState(false);
	const [showLoading, setShowLoading] = React.useState(true);

	useEffect(() => {
		// Mark router as ready after a brief delay to ensure it's mounted
		const timer = setTimeout(() => setIsRouterReady(true), 100);
		return () => clearTimeout(timer);
	}, []);

	// Timeout to prevent infinite loading if backend is down
	useEffect(() => {
		const timer = setTimeout(() => setShowLoading(false), 2000); // Max 2 seconds loading
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (!isRouterReady || hasRedirected || isLoading) return;

		// Get current path from window location (web) or router state
		let currentPath = '/';
		if (Platform.OS === 'web' && typeof window !== 'undefined') {
			currentPath = window.location.pathname;
		}

		const isLoginPage = currentPath === '/login' || currentPath.startsWith('/login');
		const isAuthPage = currentPath.startsWith('/auth');
		const inAuthGroup = isLoginPage || isAuthPage;
		const isAuthenticated = !!session && !!user;

		// If not authenticated and not on auth pages, redirect to login
		if (!isAuthenticated && !inAuthGroup) {
			setHasRedirected(true);
			router.replace('/login');
			return;
		}

		// If authenticated and on login page, redirect to home
		if (isAuthenticated && isLoginPage) {
			setHasRedirected(true);
			router.replace('/');
			return;
		}
	}, [session, user, isLoading, isRouterReady, hasRedirected]);

	// Reset redirect flag after navigation
	useEffect(() => {
		const timer = setTimeout(() => setHasRedirected(false), 100);
		return () => clearTimeout(timer);
	}, []);

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
			<SessionProvider>
				<InputModeProvider>
					<AudioProvider>
						<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
							<AuthGuard>
								<Stack initialRouteName="index">
									<Stack.Screen name="index" options={{ headerShown: false }} />
									<Stack.Screen name="login" options={{ headerShown: false }} />
									<Stack.Screen name="auth" options={{ headerShown: false }} />
									<Stack.Screen name="auth/callback" options={{ headerShown: false }} />
									<Stack.Screen name="auth/error" options={{ headerShown: false }} />
									<Stack.Screen name="new-game" options={{ headerShown: false }} />
									<Stack.Screen name="game" options={{ headerShown: false }} />
									<Stack.Screen name="sql" options={{ headerShown: false }} />
									<Stack.Screen name="+not-found" />
								</Stack>
								<StatusBar style="auto" />
								<UserMenu />
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
			</SessionProvider>
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
	userMenuContainer: {
		position: 'absolute',
		top: Platform.OS === 'web' ? 24 : 36,
		right: 16,
		zIndex: 1100,
	},
	avatarButton: {
		backgroundColor: '#F5E6D3',
		borderRadius: 999,
		padding: 2,
		borderWidth: 1,
		borderColor: '#E2D3B3',
	},
	avatarImage: {
		width: 40,
		height: 40,
		borderRadius: 20,
	},
	avatarFallback: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#E2D3B3',
	},
	userMenuDropdown: {
		marginTop: 8,
		minWidth: 160,
		backgroundColor: '#FFFFFF',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 10,
		shadowColor: '#000',
		shadowOpacity: 0.15,
		shadowOffset: { width: 0, height: 4 },
		shadowRadius: 8,
		elevation: 4,
	},
	userNameText: {
		fontWeight: '600',
		marginBottom: 12,
		maxWidth: 180,
	},
	signOutButton: {
		paddingVertical: 6,
	},
	signOutText: {
		color: '#C0392B',
		fontWeight: '600',
	},
});
export default RootLayout;
