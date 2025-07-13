import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface LiveTranscriptDisplayProps {
	transcript: string;
	isListening: boolean;
	isVisible: boolean;
}

export const LiveTranscriptDisplay: React.FC<LiveTranscriptDisplayProps> = ({
	transcript,
	isListening,
	isVisible,
}) => {
	const opacity = useSharedValue(isVisible ? 1 : 0);
	const translateY = useSharedValue(isVisible ? 0 : -50);

	React.useEffect(() => {
		opacity.value = withSpring(isVisible ? 1 : 0);
		translateY.value = withSpring(isVisible ? 0 : -50);
	}, [isVisible, opacity, translateY]);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
		transform: [{ translateY: translateY.value }],
	}));

	if (!isVisible) return null;

	return (
		<Animated.View style={[styles.container, animatedStyle]}>
			<ThemedView style={styles.content}>
				{/* Status indicator */}
				<View style={styles.statusRow}>
					<View style={[
						styles.statusDot,
						{ backgroundColor: isListening ? '#22C55E' : '#EF4444' }
					]} />
					<ThemedText style={styles.statusText}>
						{isListening ? 'Listening...' : 'Not listening'}
					</ThemedText>
				</View>

				{/* Live transcript */}
				<View style={styles.transcriptContainer}>
					<ThemedText style={styles.transcriptLabel}>
						Live Transcript:
					</ThemedText>
					<ThemedText style={styles.transcriptText}>
						{transcript || 'Say something...'}
					</ThemedText>
				</View>

				{/* Microphone visualization */}
				{isListening && (
					<View style={styles.visualizer}>
						<View style={[styles.bar, styles.bar1]} />
						<View style={[styles.bar, styles.bar2]} />
						<View style={[styles.bar, styles.bar3]} />
						<View style={[styles.bar, styles.bar4]} />
						<View style={[styles.bar, styles.bar5]} />
					</View>
				)}
			</ThemedView>
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		top: 60, // Below status bar
		left: 10,
		right: 10,
		zIndex: 1000,
	},
	content: {
		backgroundColor: 'rgba(0, 0, 0, 0.8)',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.2)',
	},
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginRight: 8,
	},
	statusText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#FFFFFF',
	},
	transcriptContainer: {
		marginBottom: 12,
	},
	transcriptLabel: {
		fontSize: 11,
		fontWeight: '500',
		color: '#9CA3AF',
		marginBottom: 4,
	},
	transcriptText: {
		fontSize: 16,
		fontWeight: '500',
		color: '#FFFFFF',
		minHeight: 24,
		lineHeight: 24,
	},
	visualizer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		height: 20,
		gap: 2,
	},
	bar: {
		width: 3,
		backgroundColor: '#22C55E',
		borderRadius: 1.5,
	},
	bar1: {
		height: 6,
		animationDelay: '0ms',
	},
	bar2: {
		height: 12,
		animationDelay: '100ms',
	},
	bar3: {
		height: 18,
		animationDelay: '200ms',
	},
	bar4: {
		height: 12,
		animationDelay: '300ms',
	},
	bar5: {
		height: 6,
		animationDelay: '400ms',
	},
});