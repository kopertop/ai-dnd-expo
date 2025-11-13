import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Text, Alert } from 'react-native';

import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDMVoice } from '@/hooks/use-text-to-speech';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';

interface VoiceChatButtonProps {
	onVoiceInput: (transcript: string) => Promise<void>;
	isDisabled?: boolean;
	position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
	onTranscriptChange?: (transcript: string, isListening: boolean) => void;
}

export const VoiceChatButton: React.FC<VoiceChatButtonProps> = ({
	onVoiceInput,
	isDisabled = false,
	position = 'top-right',
	onTranscriptChange,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const [showTranscript, setShowTranscript] = useState(false);
	const [pulseAnim] = useState(new Animated.Value(1));
	const [scaleAnim] = useState(new Animated.Value(1));

	const voiceRecognition = useVoiceRecognition({
		language: 'en-US',
		maxDuration: 30000, // 30 seconds max
		onTranscription: (text, isFinal) => {
			console.log(`🎤 VoiceChatButton onTranscription: "${text}", isFinal: ${isFinal}`);

			// Notify parent about transcript changes
			onTranscriptChange?.(text, voiceRecognition.isListening);

			if (isFinal && text.trim()) {
				console.log('✅ Calling handleVoiceInput');
				handleVoiceInput(text);
			}
		},
		onError: error => {
			console.error('❌ Voice recognition error:', error);
			Alert.alert('Voice Recognition Error', error);
		},
	});

	const dmVoice = useDMVoice();

	// Notify parent when listening state changes
	useEffect(() => {
		onTranscriptChange?.(voiceRecognition.transcript, voiceRecognition.isListening);
	}, [voiceRecognition.isListening, voiceRecognition.transcript, onTranscriptChange]);

	const styles = createStyles(colors, position);

	/**
	 * Handle successful voice input
	 */
	const handleVoiceInput = useCallback(
		async (transcript: string) => {
			try {
				console.log(`🗣️ handleVoiceInput called with: "${transcript}"`);
				setShowTranscript(true);
				console.log('📞 Calling onVoiceInput prop');
				await onVoiceInput(transcript);

				// Hide transcript after a delay
				setTimeout(() => {
					console.log('👻 Hiding transcript');
					setShowTranscript(false);
				}, 3000);
			} catch (error) {
				console.error('❌ Error processing voice input:', error);
				Alert.alert('Error', 'Failed to process voice command');
			}
		},
		[onVoiceInput],
	);

	/**
	 * Toggle voice recording
	 */
	const toggleVoiceRecording = useCallback(async () => {
		if (isDisabled) return;

		console.log(`🎛️ toggleVoiceRecording called, isListening: ${voiceRecognition.isListening}`);

		if (voiceRecognition.isListening) {
			console.log('🛑 Stopping voice recognition');
			await voiceRecognition.stopListening();
		} else {
			// Check permissions first
			if (!voiceRecognition.hasPermission) {
				console.log('🔐 Requesting microphone permission');
				const granted = await voiceRecognition.requestPermission();
				if (!granted) {
					console.log('❌ Permission denied');
					return;
				}
				console.log('✅ Permission granted');
			}

			// Stop any current TTS
			if (dmVoice.isSpeaking) {
				console.log('🔇 Stopping current TTS');
				dmVoice.stop();
			}

			console.log('🎤 Starting voice recognition');
			await voiceRecognition.startListening();
		}
	}, [isDisabled, voiceRecognition, dmVoice]);

	/**
	 * Pulse animation while listening
	 */
	useEffect(() => {
		if (voiceRecognition.isListening) {
			const pulseAnimation = Animated.loop(
				Animated.sequence([
					Animated.timing(pulseAnim, {
						toValue: 1.3,
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
	}, [voiceRecognition.isListening, pulseAnim]);

	/**
	 * Scale animation on press
	 */
	const handlePressIn = useCallback(() => {
		Animated.spring(scaleAnim, {
			toValue: 0.9,
			useNativeDriver: true,
		}).start();
	}, [scaleAnim]);

	const handlePressOut = useCallback(() => {
		Animated.spring(scaleAnim, {
			toValue: 1,
			useNativeDriver: true,
		}).start();
	}, [scaleAnim]);

	/**
	 * Get appropriate icon based on state
	 */
	const getIconName = (): keyof typeof Feather.glyphMap => {
		if (voiceRecognition.isListening) {
			return 'mic';
		}
		if (!voiceRecognition.hasPermission) {
			return 'mic-off';
		}
		if (dmVoice.isSpeaking) {
			return 'volume-2';
		}
		return 'mic';
	};

	/**
	 * Get button color based on state
	 */
	const getButtonColor = (): string => {
		if (isDisabled || !voiceRecognition.hasPermission) {
			return colors.text + '40';
		}
		if (voiceRecognition.isListening) {
			return '#ff4444'; // Red when listening
		}
		if (dmVoice.isSpeaking) {
			return '#4CAF50'; // Green when DM is speaking
		}
		return colors.tint;
	};

	/**
	 * Get icon color based on state
	 */
	const getIconColor = (): string => {
		if (isDisabled || !voiceRecognition.hasPermission) {
			return colors.text + '60';
		}
		return '#FFFFFF';
	};

	return (
		<View style={styles.container}>
			{/* Transcript Display */}
			{showTranscript && voiceRecognition.transcript && (
				<View style={styles.transcriptContainer}>
					<Text style={styles.transcriptText}>
						&quot;{voiceRecognition.transcript}&quot;
					</Text>
				</View>
			)}

			{/* Voice Button */}
			<Animated.View
				style={[
					styles.buttonContainer,
					{
						transform: [
							{ scale: scaleAnim },
							{ scale: voiceRecognition.isListening ? pulseAnim : 1 },
						],
					},
				]}
			>
				<TouchableOpacity
					style={[styles.voiceButton, { backgroundColor: getButtonColor() }]}
					onPress={toggleVoiceRecording}
					onPressIn={handlePressIn}
					onPressOut={handlePressOut}
					disabled={isDisabled}
					activeOpacity={0.8}
				>
					<Feather name={getIconName()} size={24} color={getIconColor()} />
				</TouchableOpacity>

				{/* Recording Indicator */}
				{voiceRecognition.isListening && (
					<View style={styles.recordingIndicator}>
						<Text style={styles.recordingText}>Listening...</Text>
					</View>
				)}

				{/* Speaking Indicator */}
				{dmVoice.isSpeaking && (
					<View style={styles.speakingIndicator}>
						<Text style={styles.speakingText}>DM Speaking...</Text>
					</View>
				)}
			</Animated.View>

			{/* Error Display */}
			{voiceRecognition.error && (
				<View style={styles.errorContainer}>
					<Text style={styles.errorText}>{voiceRecognition.error}</Text>
				</View>
			)}
		</View>
	);
};

const createStyles = (colors: any, position: string) => {
	const basePosition = {
		position: 'absolute' as const,
		zIndex: 1000,
	};

	const positionStyles = {
		'top-right': { top: 60, right: 16 },
		'top-left': { top: 60, left: 16 },
		'bottom-right': { bottom: 100, right: 16 },
		'bottom-left': { bottom: 100, left: 16 },
	};

	return StyleSheet.create({
		container: {
			...basePosition,
			...positionStyles[position as keyof typeof positionStyles],
			alignItems: position.includes('right') ? 'flex-end' : 'flex-start',
		},
		buttonContainer: {
			alignItems: 'center',
		},
		voiceButton: {
			width: 56,
			height: 56,
			borderRadius: 28,
			alignItems: 'center',
			justifyContent: 'center',
			elevation: 8,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.3,
			shadowRadius: 8,
		},
		transcriptContainer: {
			backgroundColor: colors.background + 'E6',
			borderRadius: 12,
			padding: 12,
			marginBottom: 8,
			maxWidth: 250,
			borderWidth: 1,
			borderColor: colors.tint + '40',
		},
		transcriptText: {
			color: colors.text,
			fontSize: 14,
			fontStyle: 'italic',
			textAlign: 'center',
		},
		recordingIndicator: {
			backgroundColor: '#ff4444',
			borderRadius: 8,
			paddingHorizontal: 8,
			paddingVertical: 4,
			marginTop: 8,
		},
		recordingText: {
			color: '#FFFFFF',
			fontSize: 12,
			fontWeight: '600',
		},
		speakingIndicator: {
			backgroundColor: '#4CAF50',
			borderRadius: 8,
			paddingHorizontal: 8,
			paddingVertical: 4,
			marginTop: 8,
		},
		speakingText: {
			color: '#FFFFFF',
			fontSize: 12,
			fontWeight: '600',
		},
		errorContainer: {
			backgroundColor: '#ff4444',
			borderRadius: 8,
			padding: 8,
			marginTop: 8,
			maxWidth: 200,
		},
		errorText: {
			color: '#FFFFFF',
			fontSize: 12,
			textAlign: 'center',
		},
	});
};
