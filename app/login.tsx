/**
 * Login Page
 *
 * Provides Google and Apple (iOS) authentication
 */

import * as AppleAuthentication from 'expo-apple-authentication';
import {
	TokenResponse,
	useAuthRequest,
} from 'expo-auth-session';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI, authService } from '@/services/auth-service';
import { API_BASE_URL } from '@/services/config/api-base-url';

// Required for Auth
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const GOOGLE_DISCOVERY = {
	authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
	tokenEndpoint: 'https://oauth2.googleapis.com/token',
	revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const LoginScreen: React.FC = () => {
	const { isAuthenticated, isLoading: authLoading } = useAuth();
	const [googleLoading, setGoogleLoading] = useState(false);
	const [appleLoading, setAppleLoading] = useState(false);
	const [appleAvailable, setAppleAvailable] = useState(false);
	const searchParams = useLocalSearchParams();

	// Also parse URL directly as fallback (useLocalSearchParams might not catch query params on redirect)
	const [urlParams, setUrlParams] = useState<{ code?: string; state?: string; error?: string }>({});

	useEffect(() => {
		if (Platform.OS === 'web' && typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			const params: { code?: string; state?: string; error?: string } = {};
			if (url.searchParams.get('code')) params.code = url.searchParams.get('code') || undefined;
			if (url.searchParams.get('state')) params.state = url.searchParams.get('state') || undefined;
			if (url.searchParams.get('error')) params.error = url.searchParams.get('error') || undefined;
			setUrlParams(params);
		}
	}, []);

	// Use URL params if searchParams don't have them (fallback for redirect scenarios)
	const code = (searchParams.code as string | undefined) || urlParams.code;
	const state = (searchParams.state as string | undefined) || urlParams.state;

	// Set up Google Auth
	const [googleRequest, googleResponse, promptGoogleAsync] = useAuthRequest(
		{
			clientId: GOOGLE_CLIENT_ID,
			scopes: ['openid', 'profile', 'email'],
			redirectUri: GOOGLE_REDIRECT_URI,
		},
		GOOGLE_DISCOVERY,
	);

	// Check Apple Authentication availability
	useEffect(() => {
		const checkAppleAvailability = async () => {
			if (Platform.OS === 'ios') {
				try {
					const isAvailable = await AppleAuthentication.isAvailableAsync();
					setAppleAvailable(isAvailable);
				} catch (error) {
					console.log('Apple Authentication not available:', error);
					setAppleAvailable(false);
				}
			}
		};

		checkAppleAvailability();
	}, []);

	// Redirect if already authenticated
	useEffect(() => {
		if (!authLoading && isAuthenticated) {
			router.replace('/');
		}
	}, [isAuthenticated, authLoading]);

	// Handle Google OAuth response from useAuthRequest hook
	useEffect(() => {
		const processGoogleAuth = async () => {
			console.log('Checking Google auth response:', {
				hasRequest: !!googleRequest,
				responseType: googleResponse?.type,
				response: googleResponse,
				urlParams: urlParams,
			});

			if (googleRequest && googleResponse?.type === 'success') {
				try {
					setGoogleLoading(true);
					console.log('Exchanging code for token via backend...');

					// Exchange the code for access token via backend (secure, uses client secret)
					const exchangeResponse = await fetch(`${API_BASE_URL}/api/auth/exchange`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							code: googleResponse.params.code,
							redirectUri: GOOGLE_REDIRECT_URI,
							codeVerifier: googleRequest.codeVerifier,
						}),
					});

					if (!exchangeResponse.ok) {
						const errorData = await exchangeResponse.json();
						throw new Error(errorData.error || 'Token exchange failed');
					}

					const tokenData = await exchangeResponse.json() as {
						accessToken: string;
						refreshToken?: string;
						idToken?: string;
						expiresIn?: number;
						tokenType?: string;
					};

					// Convert to TokenResponse format for authService
					// Cast to TokenResponse since we only need the properties, not the class methods
					const result = {
						accessToken: tokenData.accessToken,
						refreshToken: tokenData.refreshToken,
						idToken: tokenData.idToken,
						expiresIn: tokenData.expiresIn,
						tokenType: tokenData.tokenType || 'Bearer',
					} as unknown as TokenResponse; // TokenResponse is a class but we only need the properties

					console.log('Token exchange successful:', result);
					// Sign in with the token
					const session = await authService.signIn(result);
					console.log('Sign-in complete, session:', session);

					// Wait for state to propagate
					await new Promise(resolve => setTimeout(resolve, 500));

					// Navigate to home
					router.replace('/');
				} catch (error) {
					console.error('Error exchanging code for token:', error);
					Alert.alert('Authentication Error', 'Failed to sign in with Google. Please try again.');
				} finally {
					setGoogleLoading(false);
				}
			} else if (googleResponse?.type === 'error') {
				console.error('Google auth error:', googleResponse.error);
				Alert.alert('Authentication Error', 'Google sign-in failed. Please try again.');
				setGoogleLoading(false);
			} else if (googleResponse?.type === 'cancel') {
				console.log('Google auth cancelled by user');
				setGoogleLoading(false);
			} else if (googleResponse?.type === 'dismiss') {
				console.log('Google auth dismissed by user');
				setGoogleLoading(false);
			}
		};

		void processGoogleAuth();
	}, [googleResponse, googleRequest, urlParams]);

	// Track if we've already processed this code to prevent duplicate processing
	const [processedCode, setProcessedCode] = useState<string | null>(null);

	// Manually process OAuth redirect if useAuthRequest doesn't catch it
	useEffect(() => {
		// Only process if we have code/state in URL but useAuthRequest hasn't processed it yet
		// AND we haven't already processed this specific code
		if (
			Platform.OS === 'web'
			&& code
			&& state
			&& (!googleResponse || googleResponse.type === undefined)
			&& processedCode !== code
		) {
			// Get stored state and code verifier from sessionStorage (if we redirected manually)
			const storedState = typeof window !== 'undefined' && window.sessionStorage
				? sessionStorage.getItem('oauth_state')
				: null;
			const storedCodeVerifier = typeof window !== 'undefined' && window.sessionStorage
				? sessionStorage.getItem('oauth_code_verifier')
				: null;

			// If we have stored state from sessionStorage (from manual redirect), use that for validation
			// Otherwise, try to match against googleRequest state (for popup flows)
			// IMPORTANT: When using manual redirect, googleRequest will be recreated with a new state
			// so we MUST prioritize storedState over googleRequest.state
			const expectedState = storedState || googleRequest?.state;

			// Only validate state if we have an expected value
			// If we have storedState, that's the source of truth (we stored it before redirect)
			// If we don't have storedState but have googleRequest.state, validate against that
			// BUT: If we don't have storedState AND googleRequest has a different state (new request),
			// we should still proceed if we have a stored code verifier (from a previous redirect)
			if (expectedState && expectedState !== state) {
				// If we have storedState but it doesn't match, that's a real error
				if (storedState) {
					console.error('State mismatch in OAuth redirect - security issue, aborting');
					return;
				}
				// If no storedState, googleRequest might be a new request, so continue anyway
				// BUT only if we have a stored code verifier (from a previous redirect attempt)
				if (!storedCodeVerifier) {
					return;
				}
			}

			// Wait for googleRequest to be ready if we don't have stored code verifier
			if (!storedCodeVerifier && !googleRequest) {
				return;
			}

			// Mark this code as being processed to prevent duplicate attempts
			setProcessedCode(code);

			// Manually exchange the code for tokens
			const exchangeCode = async () => {
				try {
					setGoogleLoading(true);

					const codeVerifier = storedCodeVerifier || googleRequest?.codeVerifier;
					if (!codeVerifier) {
						console.error('No code verifier available for PKCE');
						setGoogleLoading(false);
						setProcessedCode(null);
						return;
					}

					// Exchange the code for access token via backend (secure, uses client secret)
					const exchangeResponse = await fetch(`${API_BASE_URL}/api/auth/exchange`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							code,
							redirectUri: GOOGLE_REDIRECT_URI,
							codeVerifier,
						}),
					});

					if (!exchangeResponse.ok) {
						const errorData = await exchangeResponse.json();
						throw new Error(errorData.error || 'Token exchange failed');
					}

					const tokenData = await exchangeResponse.json() as {
						accessToken: string;
						refreshToken?: string;
						idToken?: string;
						expiresIn?: number;
						tokenType?: string;
					};

					// Convert to TokenResponse format for authService
					// Cast to TokenResponse since we only need the properties, not the class methods
					const result = {
						accessToken: tokenData.accessToken,
						refreshToken: tokenData.refreshToken,
						idToken: tokenData.idToken,
						expiresIn: tokenData.expiresIn,
						tokenType: tokenData.tokenType || 'Bearer',
					} as unknown as TokenResponse; // TokenResponse is a class but we only need the properties

					// Clear stored OAuth data
					if (typeof window !== 'undefined' && window.sessionStorage) {
						sessionStorage.removeItem('oauth_state');
						sessionStorage.removeItem('oauth_code_verifier');
					}

					// Clear the URL parameters after successful auth BEFORE signing in
					// This prevents the useEffect from running again
					if (typeof window !== 'undefined') {
						window.history.replaceState({}, '', '/login');
					}

					console.log('Token exchange successful:', result);

					// Sign in with the token
					const session = await authService.signIn(result);
					console.log('Sign-in complete, session:', session);

					// Wait for state to propagate
					await new Promise(resolve => setTimeout(resolve, 500));

					// Navigate to home
					router.replace('/');
				} catch (error) {
					console.error('Error exchanging code for token manually:', error);
					setGoogleLoading(false);
					setProcessedCode(null);
				}
			};

			exchangeCode();
		}
	}, [code, state, googleRequest, googleResponse, processedCode]);

	const handleGoogleSignIn = async () => {
		if (!googleRequest) {
			console.error('Google auth request not ready');
			return;
		}

		setGoogleLoading(true);
		try {
			// Detect if we're in an embedded browser (like Cursor's browser)
			// Embedded browsers often have COOP restrictions that block popups
			const isEmbeddedBrowser = Platform.OS === 'web' && typeof window !== 'undefined' && (
				window.parent !== window // In an iframe
				|| window.opener !== null // Opened as a popup
				|| (typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')) // Electron-based apps
			);

			// Use redirect mode for embedded browsers to avoid COOP issues
			if (isEmbeddedBrowser && Platform.OS === 'web' && typeof window !== 'undefined') {
				// Build the authorization URL manually and redirect
				if (googleRequest && GOOGLE_DISCOVERY.authorizationEndpoint) {
					// Store state and code verifier in sessionStorage so we can retrieve them after redirect
					if (typeof window !== 'undefined' && window.sessionStorage) {
						sessionStorage.setItem('oauth_state', googleRequest.state || '');
						if (googleRequest.codeVerifier) {
							sessionStorage.setItem('oauth_code_verifier', googleRequest.codeVerifier);
						}
					}

					const authUrl = new URL(GOOGLE_DISCOVERY.authorizationEndpoint);
					authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
					authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
					authUrl.searchParams.set('response_type', 'code');
					authUrl.searchParams.set('scope', googleRequest.scopes?.join(' ') || '');
					authUrl.searchParams.set('state', googleRequest.state || '');
					if (googleRequest.codeChallenge) {
						authUrl.searchParams.set('code_challenge', googleRequest.codeChallenge);
						authUrl.searchParams.set('code_challenge_method', 'S256');
					}
					// Redirect to Google login
					window.location.href = authUrl.toString();
					return; // Don't reset loading state, redirect will happen
				}
			}

			// Try popup mode first for regular browsers
			try {
				await promptGoogleAsync();
			} catch (popupError: unknown) {
				// If popup fails due to COOP or other restrictions, fall back to redirect
				const error = popupError as { message?: string; code?: string };
				if (
					error?.message?.includes('Cross-Origin-Opener-Policy')
					|| error?.message?.includes('COOP')
					|| error?.message?.includes('popup')
					|| error?.code === 'ERR_CANCELED'
				) {
					if (Platform.OS === 'web' && typeof window !== 'undefined' && googleRequest && GOOGLE_DISCOVERY.authorizationEndpoint) {
						// Store state and code verifier in sessionStorage so we can retrieve them after redirect
						if (window.sessionStorage) {
							sessionStorage.setItem('oauth_state', googleRequest.state || '');
							if (googleRequest.codeVerifier) {
								sessionStorage.setItem('oauth_code_verifier', googleRequest.codeVerifier);
							}
						}

						const authUrl = new URL(GOOGLE_DISCOVERY.authorizationEndpoint);
						authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
						authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
						authUrl.searchParams.set('response_type', 'code');
						authUrl.searchParams.set('scope', googleRequest.scopes?.join(' ') || '');
						authUrl.searchParams.set('state', googleRequest.state || '');
						if (googleRequest.codeChallenge) {
							authUrl.searchParams.set('code_challenge', googleRequest.codeChallenge);
							authUrl.searchParams.set('code_challenge_method', 'S256');
						}
						// Redirect to Google login
						window.location.href = authUrl.toString();
						return; // Don't reset loading state, redirect will happen
					}
				}
				// Re-throw if it's not a COOP/popup error
				throw popupError;
			}
		} catch (error) {
			console.error('Error prompting Google sign-in:', error);
			Alert.alert('Authentication Error', 'Failed to start Google sign-in. Please try again.');
			setGoogleLoading(false);
		}
	};

	const handleAppleSignIn = async () => {
		if (Platform.OS !== 'ios') return;

		setAppleLoading(true);
		try {
			// Check if Apple Authentication is available
			const isAvailable = await AppleAuthentication.isAvailableAsync();
			if (!isAvailable) {
				console.error('Apple Authentication is not available on this device');
				Alert.alert('Error', 'Apple Sign In is not available on this device. Please use a different sign-in method.');
				return;
			}

			console.log('Starting Apple Sign-In process...');

			const credential = await AppleAuthentication.signInAsync({
				requestedScopes: [
					AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
					AppleAuthentication.AppleAuthenticationScope.EMAIL,
				],
			});

			console.log('Apple credential received:', {
				user: credential.user,
				email: credential.email,
				hasIdentityToken: !!credential.identityToken,
			});

			if (!credential.identityToken) {
				console.error('No identity token received from Apple');
				Alert.alert('Error', 'Sign in failed. No identity token received. Please try again.');
				return;
			}

			// Use the auth service to handle Apple sign-in
			console.log('Processing Apple Sign-In with auth service...');
			await authService.signInWithApple(credential.identityToken, {
				fullName: credential.fullName ? {
					givenName: credential.fullName.givenName || undefined,
					familyName: credential.fullName.familyName || undefined,
				} : undefined,
				email: credential.email || undefined,
			});

			console.log('Apple Sign-In completed, waiting for user to be fetched...');

			// Wait for user to be fetched and state to update
			await new Promise(resolve => setTimeout(resolve, 500));
			router.replace('/');

		} catch (error: unknown) {
			console.error('Apple Sign-In error:', error);

			const errorObj = error as { code?: string; message?: string };
			if (errorObj.code === 'ERR_REQUEST_CANCELED') {
				// User canceled the sign-in flow
				console.log('Apple Sign-In was canceled by user');
			} else if (errorObj.code === 'ERR_REQUEST_NOT_HANDLED') {
				console.error('Apple Sign-In request not handled - this may indicate a configuration issue');
				Alert.alert('Error', 'Sign in with Apple is not properly configured. Please contact support.');
			} else if (errorObj.code === 'ERR_REQUEST_NOT_INTERACTIVE') {
				console.error('Apple Sign-In request not interactive - user may need to sign in through Settings');
				Alert.alert('Error', 'Please sign in with Apple through your device Settings first, then try again.');
			} else {
				console.error('Unexpected Apple Sign-In error:', error);
				Alert.alert('Error', 'Sign in failed. Please try again or contact support if the problem persists.');
			}
		} finally {
			setAppleLoading(false);
		}
	};

	const isLoading = googleLoading || appleLoading || authLoading;

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="title" style={styles.title}>
				Welcome to AI D&D
			</ThemedText>
			<ThemedText style={styles.subtitle}>
				Sign in to continue your adventure
			</ThemedText>

			{/* Google Sign In */}
			{GOOGLE_CLIENT_ID ? (
				<TouchableOpacity
					style={[styles.button, styles.googleButton]}
					onPress={handleGoogleSignIn}
					disabled={!googleRequest || isLoading}
				>
					{isLoading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<>
							<ThemedText style={styles.googleButtonText}>Sign in with Google</ThemedText>
						</>
					)}
				</TouchableOpacity>
			) : (
				<ThemedView style={styles.errorContainer}>
					<ThemedText style={styles.errorText}>
						Google Sign-In is not configured.{'\n'}
						Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file.
					</ThemedText>
				</ThemedView>
			)}

			{/* Apple Sign In (iOS only, when available) */}
			{Platform.OS === 'ios' && appleAvailable && (
				<TouchableOpacity
					style={[styles.button, styles.appleButton]}
					onPress={handleAppleSignIn}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<>
							<ThemedText style={styles.appleButtonText}>Sign in with Apple</ThemedText>
						</>
					)}
				</TouchableOpacity>
			)}
		</ThemedView>
	);
};

LoginScreen.displayName = 'Login';

export default LoginScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	title: {
		marginBottom: 10,
		textAlign: 'center',
	},
	subtitle: {
		marginBottom: 40,
		textAlign: 'center',
		opacity: 0.7,
	},
	button: {
		width: '100%',
		paddingVertical: 15,
		paddingHorizontal: 32,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		marginBottom: 15,
		minHeight: 50,
	},
	googleButton: {
		backgroundColor: '#4285F4',
	},
	googleButtonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	appleButton: {
		backgroundColor: '#000',
	},
	appleButtonText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 16,
	},
	buttonIcon: {
		marginRight: 10,
	},
	errorContainer: {
		width: '100%',
		padding: 16,
		backgroundColor: 'rgba(255, 0, 0, 0.1)',
		borderRadius: 8,
		marginBottom: 15,
		borderWidth: 1,
		borderColor: 'rgba(255, 0, 0, 0.3)',
	},
	errorText: {
		color: '#d32f2f',
		textAlign: 'center',
		fontSize: 14,
	},
});
