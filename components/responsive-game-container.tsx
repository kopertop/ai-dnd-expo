import React, { useEffect } from 'react';
import { ActivityIndicator, Dimensions, LayoutAnimation, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabletLayout } from './tablet-layout';
import { ThemedText } from './themed-text';

import { useScreenSize } from '@/hooks/use-screen-size';
import { DMMessage } from '@/services/ai/agents/dungeon-master-agent';
import { useLayoutStore } from '@/stores/use-layout-store';
import { Character } from '@/types/character';
import { GameWorldState, Position } from '@/types/world-map';

interface ResponsiveGameContainerProps {
	playerCharacter: Character | null;
	dmMessages: DMMessage[];
	onSendMessage: (message: string, speakerId: string) => Promise<void>;
	activeCharacter: 'dm' | 'player' | string;
	onTurnChange: (newActiveCharacter: 'dm' | 'player' | string) => void;
	isLoading?: boolean;
	worldState?: GameWorldState;
	onPlayerMove?: (newPosition: Position) => void;
	onTileClick?: (position: Position) => void;
	gameLoading?: boolean;
	gameError?: string | null;
}

/**
 * ResponsiveGameContainer detects device type and routes to appropriate layout
 * - Phone devices: Redirects to tab-based layout at /(tabs)
 * - Tablet devices: Renders side-by-side tablet layout directly
 */
export const ResponsiveGameContainer: React.FC<ResponsiveGameContainerProps> = ({
	playerCharacter,
	dmMessages,
	onSendMessage,
	activeCharacter,
	onTurnChange,
	isLoading = false,
	worldState,
	onPlayerMove,
	onTileClick,
	gameLoading = false,
	gameError = null,
}) => {
	const { isPhone, isTablet } = useScreenSize();
	const { setLayout, currentLayout, setTransitioning } = useLayoutStore();

	// Update layout store based on device detection
	useEffect(() => {
		const newLayout = isPhone ? 'phone' : 'tablet';
		if (currentLayout !== newLayout) {
			// Configure smooth layout animation
			LayoutAnimation.configureNext({
				duration: 300,
				create: {
					type: LayoutAnimation.Types.easeInEaseOut,
					property: LayoutAnimation.Properties.opacity,
				},
				update: {
					type: LayoutAnimation.Types.easeInEaseOut,
				},
			});

			setTransitioning(true);
			setLayout(newLayout);
			// Small delay to allow for smooth transitions
			setTimeout(() => setTransitioning(false), 300);
		}
	}, [isPhone, isTablet, currentLayout, setLayout, setTransitioning]);

	// Handle orientation changes
	useEffect(() => {
		const subscription = Dimensions.addEventListener('change', () => {
			LayoutAnimation.configureNext({
				duration: 300,
				create: {
					type: LayoutAnimation.Types.easeInEaseOut,
					property: LayoutAnimation.Properties.opacity,
				},
				update: {
					type: LayoutAnimation.Types.easeInEaseOut,
				},
			});
		});

		return () => subscription?.remove();
	}, []);

	// Show loading state while game is initializing
	if (gameLoading) {
		return (
			<SafeAreaView
				style={styles.loadingContainer}
				edges={['top', 'left', 'right', 'bottom']}
			>
				<ActivityIndicator size="large" color="#C9B037" />
				<ThemedText style={styles.loadingText}>
					<Text>Loading your adventure...</Text>
				</ThemedText>
			</SafeAreaView>
		);
	}

	// Show error state if game failed to load
	if (gameError) {
		return (
			<SafeAreaView style={styles.errorContainer} edges={['top', 'left', 'right', 'bottom']}>
				<ThemedText type="title" style={styles.errorTitle}>
					<Text>Game Error</Text>
				</ThemedText>
				<ThemedText style={styles.errorMessage}>
					<Text>{gameError}</Text>
				</ThemedText>
			</SafeAreaView>
		);
	}

	// This component should only be used for tablet layouts
	// Phone layouts are handled by the app routing system
	if (isPhone) {
		throw new Error(
			'ResponsiveGameContainer should not be used for phone layouts. Use tab navigation instead.',
		);
	}

	// Tablet layout: Render side-by-side layout directly
	return (
		<SafeAreaView style={styles.tabletContainer} edges={['bottom']}>
			<TabletLayout
				playerCharacter={playerCharacter}
				dmMessages={dmMessages}
				onSendMessage={onSendMessage}
				activeCharacter={activeCharacter}
				onTurnChange={onTurnChange}
				isLoading={isLoading}
				worldState={worldState}
				onPlayerMove={onPlayerMove}
				onTileClick={onTileClick}
			/>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
		backgroundColor: '#F9F6EF',
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
		textAlign: 'center',
	},
	errorContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
		backgroundColor: '#F9F6EF',
	},
	errorTitle: {
		marginBottom: 16,
		color: '#8B2323',
	},
	errorMessage: {
		textAlign: 'center',
		color: '#8B2323',
		fontSize: 14,
	},
	tabletContainer: {
		flex: 1,
		width: '100%',
		height: '100%',
	},
});
