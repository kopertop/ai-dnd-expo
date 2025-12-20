import * as Clipboard from 'expo-clipboard';
import React, { useMemo, useState } from 'react';
import { Linking, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { useScreenSize } from '@/hooks/use-screen-size';

interface InviteCodeDisplayProps {
	inviteCode: string;
}

// Helper to get the base URL for the game link
const getGameBaseUrl = (): string => {
	if (Platform.OS === 'web' && typeof window !== 'undefined') {
		return window.location.origin;
	}

	// For native apps, try to get from environment variable first
	if (process.env.EXPO_PUBLIC_WEB_BASE_URL) {
		return process.env.EXPO_PUBLIC_WEB_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
	}

	// Try to extract from API base URL by removing /api/ suffix
	const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || '';
	if (apiBaseUrl) {
		// If it's a full URL, extract the origin
		try {
			const url = new URL(apiBaseUrl.replace(/\/api\/?$/, ''));
			return url.origin;
		} catch {
			// If parsing fails, try to extract domain from the URL
			const match = apiBaseUrl.match(/https?:\/\/([^/]+)/);
			if (match) {
				return `https://${match[1]}`;
			}
		}
	}

	// Fallback: use a default
	// In production, EXPO_PUBLIC_WEB_BASE_URL should be set
	return 'https://your-app-domain.com';
};

export const InviteCodeDisplay: React.FC<InviteCodeDisplayProps> = ({
	inviteCode,
}) => {
	const { isMobile } = useScreenSize();
	const [copied, setCopied] = useState(false);

	// Build the full game join link
	const gameLink = useMemo(() => {
		const baseUrl = getGameBaseUrl();
		return `${baseUrl}/game/${inviteCode}`;
	}, [inviteCode]);

	const copyToClipboard = async () => {
		try {
			if (Platform.OS === 'web') {
				await navigator.clipboard.writeText(gameLink);
			} else {
				// For React Native native, use expo-clipboard
				await Clipboard.setStringAsync(gameLink);
			}
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			console.error('Failed to copy link:', error);
		}
	};

	const handleLinkPress = async () => {
		try {
			const canOpen = await Linking.canOpenURL(gameLink);
			if (canOpen) {
				await Linking.openURL(gameLink);
			}
		} catch (error) {
			console.error('Failed to open link:', error);
		}
	};

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="subtitle" style={styles.label}>
				Game Link
			</ThemedText>
			<View style={styles.linkContainer}>
				<TouchableOpacity
					style={styles.linkBox}
					onPress={handleLinkPress}
					activeOpacity={0.7}
				>
					<ThemedText
						style={[styles.linkText, isMobile && styles.linkTextMobile]}
						numberOfLines={2}
					>
						{gameLink}
					</ThemedText>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.copyButton, isMobile && styles.copyButtonMobile]}
					onPress={copyToClipboard}
					activeOpacity={0.7}
				>
					<ThemedText style={styles.copyButtonText}>
						{copied ? 'Copied!' : 'Copy Link'}
					</ThemedText>
				</TouchableOpacity>
			</View>
			<ThemedText style={styles.hint}>
				Share this link with players who want to join your game
			</ThemedText>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 20,
		alignItems: 'center',
	},
	label: {
		fontSize: 18,
		marginBottom: 12,
		color: '#3B2F1B',
	},
	linkContainer: {
		width: '100%',
		alignItems: 'center',
		marginBottom: 12,
	},
	linkBox: {
		width: '100%',
		maxWidth: 600,
		backgroundColor: '#F5E6D3',
		borderRadius: 12,
		padding: 16,
		borderWidth: 2,
		borderColor: '#C9B037',
		marginBottom: 12,
	},
	linkText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#1E40AF',
		textDecorationLine: 'underline',
		textAlign: 'center',
	},
	linkTextMobile: {
		fontSize: 14,
	},
	copyButton: {
		backgroundColor: '#C9B037',
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8,
	},
	copyButtonMobile: {
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	copyButtonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
	hint: {
		fontSize: 14,
		color: '#6B5B3D',
		textAlign: 'center',
	},
});

