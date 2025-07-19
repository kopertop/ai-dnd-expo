import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

interface VoiceChatInputProps {
	onSend: (message: string) => void;
	placeholder?: string;
	value?: string;
	onChangeText?: (text: string) => void;
	disabled?: boolean;
	multiline?: boolean;
	maxLength?: number;
}

export const VoiceChatInput: React.FC<VoiceChatInputProps> = ({
	onSend,
	placeholder = 'Type or speak your message...',
	value: controlledValue,
	onChangeText: controlledOnChangeText,
	disabled = false,
	multiline = true,
	maxLength = 500,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];

	// Internal state for uncontrolled mode
	const [internalValue, setInternalValue] = useState('');
	const [pulseAnim] = useState(new Animated.Value(1));

	// Use controlled or uncontrolled value
	const message = controlledValue !== undefined ? controlledValue : internalValue;
	const setMessage = controlledOnChangeText || setInternalValue;

	const {
		recognizing,
		transcript,
		error,
		startListening,
		stopListening,
		hasPermission,
		requestPermission,
	} = useSpeechRecognition({
		language: 'en-US',
		continuous: false,
		interimResults: true,
		onStart: () => {
			// Speech recognition started
		},
		onEnd: () => {
			// Speech recognition ended
		},
		onError: errorMessage => {
			console.error('Speech recognition error:', errorMessage);
			Alert.alert('Voice Recognition Error', errorMessage);
		},
	});

	// Update text input with transcript when recognition completes
	useEffect(() => {
		if (transcript && !recognizing) {
			setMessage(transcript);
		}
	}, [transcript, recognizing, setMessage]);

	// Pulse animation while listening
	useEffect(() => {
		if (recognizing) {
			const pulseAnimation = Animated.loop(
				Animated.sequence([
					Animated.timing(pulseAnim, {
						toValue: 1.2,
						duration: 600,
						useNativeDriver: true,
					}),
					Animated.timing(pulseAnim, {
						toValue: 1,
						duration: 600,
						useNativeDriver: true,
					}),
				]),
			);
			pulseAnimation.start();

			return () => {
				pulseAnimation.stop();
				pulseAnim.setValue(1);
			};
		}
	}, [recognizing, pulseAnim]);

	const handleSend = () => {
		if (message.trim() && !disabled) {
			onSend(message.trim());
			setMessage('');
		}
	};

	const handleVoiceToggle = async () => {
		if (disabled) return;

		if (recognizing) {
			stopListening();
		} else {
			// Check permissions first
			if (!hasPermission) {
				const granted = await requestPermission();
				if (!granted) {
					Alert.alert(
						'Permission Required',
						'Microphone permission is needed for voice input. Please enable it in settings.',
						[{ text: 'OK' }],
					);
					return;
				}
			}

			await startListening();
		}
	};

	const getMicButtonColor = () => {
		if (disabled || !hasPermission) {
			return colors.text + '40';
		}
		if (recognizing) {
			return '#ff4444'; // Red when listening
		}
		return colors.tint;
	};

	const getMicIconColor = () => {
		if (disabled || !hasPermission) {
			return colors.text + '60';
		}
		return '#FFFFFF';
	};

	const styles = createStyles(colors);

	return (
		<View style={styles.container}>
			{/* Error display */}
			{error && (
				<View style={styles.errorContainer}>
					<Text style={styles.errorText}>{error}</Text>
				</View>
			)}

			{/* Listening indicator */}
			{recognizing && (
				<View style={styles.listeningContainer}>
					<Text style={styles.listeningText}>🎤 Listening...</Text>
				</View>
			)}

			{/* Input container */}
			<View style={styles.inputContainer}>
				<TextInput
					style={[
						styles.textInput,
						multiline && styles.multilineInput,
						disabled && styles.disabledInput,
					]}
					value={message}
					onChangeText={setMessage}
					placeholder={placeholder}
					placeholderTextColor={colors.text + '60'}
					multiline={multiline}
					maxLength={maxLength}
					editable={!disabled}
					textAlignVertical={multiline ? 'top' : 'center'}
				/>

				{/* Voice button */}
				<Animated.View
					style={[
						styles.micButtonContainer,
						{
							transform: [{ scale: recognizing ? pulseAnim : 1 }],
						},
					]}
				>
					<TouchableOpacity
						style={[
							styles.micButton,
							{ backgroundColor: getMicButtonColor() },
							recognizing && styles.listeningButton,
						]}
						onPress={handleVoiceToggle}
						disabled={disabled}
						activeOpacity={0.8}
					>
						<FontAwesome
							name={
								recognizing
									? 'microphone'
									: hasPermission
										? 'microphone'
										: 'microphone-slash'
							}
							size={20}
							color={getMicIconColor()}
						/>
					</TouchableOpacity>
				</Animated.View>

				{/* Send button */}
				<TouchableOpacity
					style={[
						styles.sendButton,
						(!message.trim() || disabled) && styles.disabledSendButton,
					]}
					onPress={handleSend}
					disabled={!message.trim() || disabled}
					activeOpacity={0.8}
				>
					<FontAwesome
						name="send"
						size={20}
						color={message.trim() && !disabled ? '#FFFFFF' : colors.text + '60'}
					/>
				</TouchableOpacity>
			</View>

			{/* Character count */}
			{maxLength && message.length > maxLength * 0.8 && (
				<Text
					style={[
						styles.characterCount,
						message.length >= maxLength && styles.characterCountLimit,
					]}
				>
					{message.length}/{maxLength}
				</Text>
			)}
		</View>
	);
};

const createStyles = (colors: typeof Colors.light) =>
	StyleSheet.create({
		container: {
			paddingHorizontal: 16,
			paddingVertical: 8,
		},
		errorContainer: {
			backgroundColor: '#ff4444',
			borderRadius: 8,
			padding: 8,
			marginBottom: 8,
		},
		errorText: {
			color: '#FFFFFF',
			fontSize: 12,
			textAlign: 'center',
		},
		listeningContainer: {
			backgroundColor: colors.tint + '20',
			borderRadius: 8,
			padding: 8,
			marginBottom: 8,
			alignItems: 'center',
		},
		listeningText: {
			color: colors.tint,
			fontSize: 14,
			fontWeight: '600',
		},
		inputContainer: {
			flexDirection: 'row',
			alignItems: 'flex-end',
			backgroundColor: colors.background,
			borderRadius: 24,
			borderWidth: 1,
			borderColor: colors.text + '20',
			paddingHorizontal: 16,
			paddingVertical: 8,
			minHeight: 48,
		},
		textInput: {
			flex: 1,
			fontSize: 16,
			color: colors.text,
			paddingVertical: 8,
			paddingRight: 8,
			minHeight: 32,
		},
		multilineInput: {
			maxHeight: 120,
			textAlignVertical: 'top',
		},
		disabledInput: {
			opacity: 0.6,
		},
		micButtonContainer: {
			marginLeft: 8,
		},
		micButton: {
			width: 40,
			height: 40,
			borderRadius: 20,
			alignItems: 'center',
			justifyContent: 'center',
			marginRight: 8,
		},
		listeningButton: {
			shadowColor: '#ff4444',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.5,
			shadowRadius: 4,
			elevation: 4,
		},
		sendButton: {
			width: 40,
			height: 40,
			borderRadius: 20,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: colors.tint,
		},
		disabledSendButton: {
			backgroundColor: colors.text + '20',
		},
		characterCount: {
			fontSize: 12,
			color: colors.text + '60',
			textAlign: 'right',
			marginTop: 4,
			marginRight: 16,
		},
		characterCountLimit: {
			color: '#ff4444',
			fontWeight: '600',
		},
	});
