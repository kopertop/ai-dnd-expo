import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View, Platform } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useScreenSize } from '@/hooks/use-screen-size';

interface InviteCodeDisplayProps {
	inviteCode: string;
}

export const InviteCodeDisplay: React.FC<InviteCodeDisplayProps> = ({
	inviteCode,
}) => {
	const { isMobile } = useScreenSize();
	const [copied, setCopied] = useState(false);

	const copyToClipboard = async () => {
		try {
			// Use native clipboard API if available
			if (Platform.OS === 'web') {
				await navigator.clipboard.writeText(inviteCode);
			} else {
				// For React Native, we'll show the code in an alert for now
				// In production, you'd use @react-native-clipboard/clipboard
				Alert.alert('Invite Code', inviteCode, [
					{ text: 'OK' },
				]);
				return;
			}
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			// Fallback: show alert with code
			Alert.alert('Invite Code', inviteCode, [
				{ text: 'OK' },
			]);
		}
	};

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="subtitle" style={styles.label}>
				Invite Code
			</ThemedText>
			<View style={styles.codeContainer}>
				<ThemedText style={[styles.code, isMobile && styles.codeMobile]}>
					{inviteCode}
				</ThemedText>
				<TouchableOpacity
					style={[styles.copyButton, isMobile && styles.copyButtonMobile]}
					onPress={copyToClipboard}
					activeOpacity={0.7}
				>
					<ThemedText style={styles.copyButtonText}>
						{copied ? 'Copied!' : 'Copy'}
					</ThemedText>
				</TouchableOpacity>
			</View>
			<ThemedText style={styles.hint}>
				Share this code with players who want to join your game
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
	codeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F5E6D3',
		borderRadius: 12,
		padding: 16,
		borderWidth: 2,
		borderColor: '#C9B037',
		marginBottom: 12,
	},
	code: {
		fontSize: 32,
		fontWeight: 'bold',
		letterSpacing: 4,
		color: '#3B2F1B',
		marginRight: 16,
		fontFamily: 'monospace',
	},
	codeMobile: {
		fontSize: 28,
		letterSpacing: 3,
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

