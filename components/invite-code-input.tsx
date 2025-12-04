import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { useScreenSize } from '@/hooks/use-screen-size';

interface InviteCodeInputProps {
	onSubmit: (code: string) => void;
	loading?: boolean;
}

export const InviteCodeInput: React.FC<InviteCodeInputProps> = ({
	onSubmit,
	loading = false,
}) => {
	const [code, setCode] = useState('');
	const { isMobile } = useScreenSize();

	const handleSubmit = () => {
		const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
		if (normalizedCode.length === 6) {
			onSubmit(normalizedCode);
		}
	};

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="title" style={styles.title}>
				Enter Invite Code
			</ThemedText>
			<ThemedText style={styles.hint}>
				Ask the host for the 6-character invite code
			</ThemedText>
			<View style={styles.inputContainer}>
				<TextInput
					style={[styles.input, isMobile && styles.inputMobile]}
					value={code}
					onChangeText={(text) => {
						// Only allow alphanumeric, max 6 characters
						const normalized = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
						setCode(normalized);
					}}
					placeholder="ABC123"
					placeholderTextColor="#9B8B7A"
					maxLength={6}
					autoCapitalize="characters"
					autoCorrect={false}
					editable={!loading}
				/>
			</View>
			<TouchableOpacity
				style={[
					styles.button,
					(code.length !== 6 || loading) && styles.buttonDisabled,
				]}
				onPress={handleSubmit}
				disabled={code.length !== 6 || loading}
				activeOpacity={0.7}
			>
				<ThemedText style={styles.buttonText}>
					{loading ? 'Joining...' : 'Join Game'}
				</ThemedText>
			</TouchableOpacity>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		marginBottom: 12,
		color: '#3B2F1B',
	},
	hint: {
		fontSize: 16,
		color: '#6B5B3D',
		marginBottom: 24,
		textAlign: 'center',
	},
	inputContainer: {
		width: '100%',
		marginBottom: 24,
	},
	input: {
		width: '100%',
		height: 60,
		backgroundColor: '#F5E6D3',
		borderRadius: 12,
		paddingHorizontal: 20,
		fontSize: 32,
		fontWeight: 'bold',
		letterSpacing: 4,
		textAlign: 'center',
		color: '#3B2F1B',
		borderWidth: 2,
		borderColor: '#C9B037',
		fontFamily: 'monospace',
	},
	inputMobile: {
		height: 56,
		fontSize: 28,
		letterSpacing: 3,
	},
	button: {
		backgroundColor: '#C9B037',
		paddingVertical: 16,
		paddingHorizontal: 48,
		borderRadius: 12,
		minWidth: 200,
		alignItems: 'center',
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	buttonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 18,
	},
});

