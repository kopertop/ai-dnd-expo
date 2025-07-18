/**
 * Floating Voice Button - Microphone button in lower right corner
 * Simple, always-visible voice input button with visual feedback
 */

import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
	View,
	TouchableOpacity,
	StyleSheet,
	Animated,
	Alert,
	useWindowDimensions,
} from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDMVoice } from '@/hooks/use-text-to-speech';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';
import { Colors } from '@/constants/colors';

interface FloatingVoiceButtonProps {
	onVoiceInput: (transcript: string) => Promise<void>;
	isDisabled?: boolean;
	activeCharacter: 'dm' | 'player' | string;
}

export const FloatingVoiceButton: React.FC<FloatingVoiceButtonProps> = ({
	onVoiceInput,
	isDisabled = false,
	activeCharacter,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const { height: screenHeight } = useWindowDimensions();
	const [pulseAnim] = useState(new Animated.Value(1));
	const [scaleAnim] = useState(new Animated.Value(1));
	const dmVoice = useDMVoice();

	// Voice recognition setup
	const voiceRecognition = useVoiceRecognition({
		language: 'en-US',
		maxDuration: 30000,
		onTranscription: (text, isFinal) => {
			if (isFinal && text.trim()) {
				handleVoiceInput(text);
			}
		},
		onError: error => {
			console.error('Voice recognition error:', error);
			// Don't show alerts for common errors - just log them
			if (__DEV__ && (error.includes('Failed to initialize recognizer') || error.includes('not available'))) {
				console.warn('Voice recognition not available - this is expected on simulator');
			} else if (!__DEV__) {
				Alert.alert('Voice Recognition Error', 'Voice input is not available on this device');
			}
		},
	});

	// Handle successful voice input
	const handleVoiceInput = useCallback(
		async (transcript: string) => {
			try {
				await onVoiceInput(transcript);
			} catch (error) {
				console.error('Error processing voice input:', error);
				Alert.alert('Error', 'Failed to process voice command');
			}
		},
		[onVoiceInput],
	);

	// Toggle voice recording
	const toggleVoiceRecording = useCallback(async () => {
		if (isDisabled || activeCharacter === 'dm') return;

		if (voiceRecognition.isListening) {
			await voiceRecognition.stopListening();
		} else {
			// Check permissions first
			if (!voiceRecognition.hasPermission) {
				const granted = await voiceRecognition.requestPermission();
				if (!granted) return;
			}

			// Stop any current TTS
			if (dmVoice.isSpeaking) {
				dmVoice.stop();
			}

			await voiceRecognition.startListening();
		}
	}, [isDisabled, activeCharacter, voiceRecognition, dmVoice]);

	// Pulse animation while listening
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

	// Scale animation on press
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

	// Get button color based on state
	const getButtonColor = (): string => {
		if (isDisabled || activeCharacter === 'dm' || !voiceRecognition.hasPermission) {
			return '#666666'; // Gray when disabled
		}
		if (voiceRecognition.isListening) {
			return '#ff4444'; // Red when listening
		}
		if (dmVoice.isSpeaking) {
			return '#4CAF50'; // Green when DM is speaking
		}
		return '#007AFF'; // Blue when ready
	};

	// Get icon based on state
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

	// Don't show during DM's turn (except when DM is speaking)
	const shouldShow = activeCharacter !== 'dm' || dmVoice.isSpeaking;

	if (!shouldShow) {
		return null;
	}

	return (
		<Animated.View
			style={[
				styles.container,
				{ bottom: screenHeight > 700 ? 120 : 100 }, // Adjust for screen height
				{
					transform: [
						{ scale: scaleAnim },
						{ scale: voiceRecognition.isListening ? pulseAnim : 1 },
					],
				},
			]}
		>
			<TouchableOpacity
				style={[
					styles.voiceButton,
					{
						backgroundColor: getButtonColor(),
					},
				]}
				onPress={toggleVoiceRecording}
				onPressIn={handlePressIn}
				onPressOut={handlePressOut}
				disabled={isDisabled || activeCharacter === 'dm'}
				activeOpacity={0.8}
			>
				<Feather name={getIconName()} size={24} color="#FFFFFF" />
			</TouchableOpacity>

			{/* Recording indicator */}
			{voiceRecognition.isListening && (
				<View style={styles.recordingIndicator}>
					<View style={styles.recordingDot} />
				</View>
			)}
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		right: 20,
		zIndex: 1000,
	},
	voiceButton: {
		width: 60,
		height: 60,
		borderRadius: 30,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	recordingIndicator: {
		position: 'absolute',
		top: -8,
		right: -8,
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: '#ff4444',
		alignItems: 'center',
		justifyContent: 'center',
	},
	recordingDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#FFFFFF',
	},
});