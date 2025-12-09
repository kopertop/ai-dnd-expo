import { Feather } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { authService, QueryProvider, SessionProvider, useAuth } from 'expo-auth-template/frontend';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
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
import { useUserInfo } from '@/hooks/api/use-auth-queries';
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

const GlobalHomeButton: React.FC = () => (
	<View style={[styles.globalHomeButtonContainer, { pointerEvents: 'box-none' }]}>
		<View style={{ pointerEvents: 'auto' }}>
			<TouchableOpacity
				accessibilityLabel="Go to Home"
				style={styles.globalHomeButton}
				onPress={() => router.push('/')}
				hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
			>
				<Feather name="home" size={20} color="#3B2F1B" />
			</TouchableOpacity>
		</View>
	</View>
);

const UserMenu: React.FC = () => {
	const { user, signOut } = useAuth();
	const { data: userInfo } = useUserInfo();
	const [isMenuVisible, setMenuVisible] = React.useState(false);

	useEffect(() => {
		if (!user && isMenuVisible) {
			setMenuVisible(false);
		}
	}, [user, isMenuVisible]);

	if (!user) {
		return null;
	}

	const isAdmin = userInfo?.is_admin === true;
	const displayName = user.name || user.email;
	const avatarSource = user.picture ? { uri: user.picture } : null;

	const handleSignOut = async () => {
		try {
			await signOut();
		} finally {
			setMenuVisible(false);
		}
	};

	const handleAdminPress = () => {
		setMenuVisible(false);
		router.push('/admin');
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
						{isAdmin && (
							<TouchableOpacity
								style={styles.adminButton}
								onPress={handleAdminPress}
							>
								<Feather name="settings" size={16} color="#8B6914" style={styles.adminIcon} />
								<ThemedText style={styles.adminText}>Admin</ThemedText>
							</TouchableOpacity>
						)}
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
	// Test hook: allow e2e to bypass auth redirect when a global flag is set
	const bypassAuth = (globalThis as any).__E2E_BYPASS_AUTH === true || process.env.EXPO_PUBLIC_E2E_BYPASS_AUTH === 'true';
	const devTestTokenRef = useRef(false);

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

	// Dev-only: support ?token=TEST to inject a mock session/user (simulates OAuth callback)
	// Runs as early as possible to minimize AuthGuard redirects.
	useEffect(() => {
		if (!__DEV__) return;
		if (devTestTokenRef.current) return;
		if (Platform.OS !== 'web') return;
		if (typeof window === 'undefined') return;

		try {
			const params = new URLSearchParams(window.location.search);
			const token = params.get('token');
			if (!token) return;

			devTestTokenRef.current = true;
			const mockSession = {
				id: 'dev-test-session',
				name: 'Test User',
				email: 'test@example.com',
				accessToken: token,
				provider: 'google' as const,
			};
			const mockUser = {
				id: 'dev-test-user',
				email: 'test@example.com',
				name: 'Test User',
				role: 'tester',
			};
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(authService as any).setSession?.(mockSession);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(authService as any).setUser?.(mockUser);
		} catch (error) {
			console.warn('Failed to set dev test session', error);
		}
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
		const isPartyTest = currentPath.startsWith('/party-test');
		const inAuthGroup = isLoginPage || isAuthPage;
		const isAuthenticated = !!session && !!user;

		// In E2E mode, bypass redirects entirely
		if (bypassAuth) {
			return;
		}

		// Allow unauthenticated access to the PartyServer test page
		if (isPartyTest) {
			return;
		}

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
				<QueryProvider
					config={{
						defaultOptions: {
							queries: {
								staleTime: 30 * 1000, // 30 seconds
								gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
								refetchOnWindowFocus: false,
								retry: 2,
							},
						},
					}}
				>
					<InputModeProvider>
						<AudioProvider>
							<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
								<AuthGuard>
									<Stack
										initialRouteName="index"
										screenOptions={{
											headerBackVisible: false,
											headerLeft: () => null,
											headerTitleAlign: 'center',
										}}
									>
									<Stack.Screen name="index" options={{ headerShown: false }} />
									<Stack.Screen name="login" options={{ headerShown: false }} />
									<Stack.Screen name="auth" options={{ headerShown: false }} />
									<Stack.Screen name="auth/callback" options={{ headerShown: false }} />
									<Stack.Screen name="auth/error" options={{ headerShown: false }} />
									<Stack.Screen name="new-game" options={{ headerShown: false }} />
									<Stack.Screen name="game" options={{ headerShown: false }} />
									<Stack.Screen name="sql" options={{ headerShown: false }} />
									<Stack.Screen name="admin" options={{ headerShown: false }} />
									<Stack.Screen name="party-test" options={{ headerShown: true, title: 'PartyServer Test' }} />
									<Stack.Screen name="+not-found" />
									</Stack>
									<StatusBar style="auto" />
									<GlobalHomeButton />
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
				</QueryProvider>
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
	globalHomeButtonContainer: {
		position: 'absolute',
		top: Platform.OS === 'web' ? 8 : 18,
		left: 8,
		zIndex: 1050,
	},
	globalHomeButton: {
		backgroundColor: 'rgba(255,255,255,0.95)',
		padding: 10,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: 'rgba(0,0,0,0.08)',
		shadowColor: '#000',
		shadowOpacity: 0.12,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 4,
		elevation: 3,
	},
	userMenuContainer: {
		position: 'absolute',
		top: Platform.OS === 'web' ? 8 : 18,
		right: 8,
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
	adminButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 4,
		marginBottom: 8,
		borderTopWidth: 1,
		borderTopColor: '#E2D3B3',
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
	},
	adminIcon: {
		marginRight: 8,
	},
	adminText: {
		color: '#8B6914',
		fontWeight: '600',
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
