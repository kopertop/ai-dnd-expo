import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from './themed-text';

import { useScreenSize } from '@/hooks/use-screen-size';

interface EmailInputProps {
	value: string;
	onChangeText: (email: string) => void;
	placeholder?: string;
	autoFocus?: boolean;
}

export const EmailInput: React.FC<EmailInputProps> = ({
	value,
	onChangeText,
	placeholder = 'Enter your email address',
	autoFocus = false,
}) => {
	const { isMobile } = useScreenSize();
	const [isFocused, setIsFocused] = useState(false);

	return (
		<View style={styles.container}>
			<ThemedText style={styles.label}>Email Address</ThemedText>
			<ThemedText style={styles.description}>
				We'll use this to save your characters and allow you to resume games later.
			</ThemedText>
			<TextInput
				style={[
					styles.input,
					isMobile && styles.inputMobile,
					isFocused && styles.inputFocused,
				]}
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor="#8B6914"
				keyboardType="email-address"
				autoCapitalize="none"
				autoCorrect={false}
				autoFocus={autoFocus}
				onFocus={() => setIsFocused(true)}
				onBlur={() => setIsFocused(false)}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		width: '100%',
		marginBottom: 20,
	},
	label: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 8,
		color: '#3B2F1B',
	},
	description: {
		fontSize: 14,
		marginBottom: 12,
		color: '#6B5B3D',
		lineHeight: 20,
	},
	input: {
		backgroundColor: '#F5E6D3',
		borderWidth: 2,
		borderColor: '#C9B037',
		borderRadius: 8,
		padding: 16,
		fontSize: 16,
		color: '#3B2F1B',
		minHeight: 50,
	},
	inputMobile: {
		padding: 12,
		fontSize: 16,
	},
	inputFocused: {
		borderColor: '#8B6914',
	},
});

