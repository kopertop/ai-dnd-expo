import React, { useEffect } from 'react';
import { LayoutAnimation, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedModal } from './animated-modal';
import { CharacterSheetModal } from './character-sheet-modal';
import { GameCanvas } from './game-canvas';
import { SettingsModal } from './settings-modal';
import { ThemedText } from './themed-text';
import { TurnBasedChat } from './turn-based-chat';

import { ExpoIcon } from '@/components/expo-icon';
import { DMMessage } from '@/services/ai/agents/dungeon-master-agent';
import { useLayoutStore } from '@/stores/use-layout-store';
import { Character } from '@/types/character';
import { GameWorldState, Position } from '@/types/world-map';

interface TabletLayoutProps {
	playerCharacter: Character | null;
	dmMessages: DMMessage[];
	onSendMessage: (message: string, speakerId: string) => Promise<void>;
	activeCharacter: 'dm' | 'player' | string;
	onTurnChange: (newActiveCharacter: 'dm' | 'player' | string) => void;
	isLoading?: boolean;
	worldState?: GameWorldState;
	onPlayerMove?: (newPosition: Position) => void;
	onTileClick?: (position: Position) => void;
}

// Animated control button component
const AnimatedControlButton: React.FC<{
	onPress: () => void;
	icon: string;
	label: string;
	accessibilityLabel: string;
}> = ({ onPress, icon, label, accessibilityLabel }) => {
	const scale = useSharedValue(1);
	const opacity = useSharedValue(1);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: opacity.value,
	}));

	const handlePressIn = () => {
		scale.value = withSpring(0.95, {
			damping: 15,
			stiffness: 300,
		});
		opacity.value = withTiming(0.8, { duration: 100 });
	};

	const handlePressOut = () => {
		scale.value = withSpring(1, {
			damping: 15,
			stiffness: 300,
		});
		opacity.value = withTiming(1, { duration: 100 });
	};

	return (
		<TouchableOpacity
			onPress={onPress}
			onPressIn={handlePressIn}
			onPressOut={handlePressOut}
			accessibilityLabel={accessibilityLabel}
			activeOpacity={1}
		>
			<Animated.View style={[styles.controlButton, animatedStyle]}>
				<ExpoIcon icon={`FontAwesome:${icon}`} size={24} color="white" />
				<ThemedText style={styles.buttonText}>{label}</ThemedText>
			</Animated.View>
		</TouchableOpacity>
	);
};

export const TabletLayout: React.FC<TabletLayoutProps> = ({
	playerCharacter,
	dmMessages,
	onSendMessage,
	activeCharacter,
	onTurnChange,
	isLoading = false,
	worldState,
	onPlayerMove,
	onTileClick,
}) => {
	const { modals, openModal, closeModal } = useLayoutStore();

	// Handle orientation changes with smooth animations
	useEffect(() => {
		const configureLayoutAnimation = () => {
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
		};

		configureLayoutAnimation();
	}, []);

	return (
		<SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
			{/* Left Panel - Chat */}
			<View style={styles.leftPanel}>
				<TurnBasedChat
					playerCharacter={playerCharacter}
					dmMessages={dmMessages}
					onSendMessage={onSendMessage}
					activeCharacter={activeCharacter}
					onTurnChange={onTurnChange}
					isLoading={isLoading}
				/>
			</View>

			{/* Right Panel - Game Map */}
			<View style={styles.rightPanel}>
				<GameCanvas
					worldState={worldState}
					onPlayerMove={onPlayerMove}
					onTileClick={onTileClick}
				/>
			</View>

			{/* Bottom Control Buttons */}
			<View style={styles.bottomControls}>
				<AnimatedControlButton
					onPress={() => openModal('characterSheet')}
					icon="user"
					label="Character"
					accessibilityLabel="Open Character Sheet"
				/>

				<AnimatedControlButton
					onPress={() => openModal('settings')}
					icon="cog"
					label="Settings"
					accessibilityLabel="Open Settings"
				/>
			</View>

			{/* Character Sheet Modal */}
			<AnimatedModal
				visible={modals.characterSheet}
				onClose={() => closeModal('characterSheet')}
				animationType="scale"
			>
				<CharacterSheetModal visible={true} onClose={() => closeModal('characterSheet')} />
			</AnimatedModal>

			{/* Settings Modal */}
			<AnimatedModal
				visible={modals.settings}
				onClose={() => closeModal('settings')}
				animationType="slide"
			>
				<SettingsModal visible={true} onClose={() => closeModal('settings')} />
			</AnimatedModal>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		flexDirection: 'row',
		backgroundColor: '#F9F6EF',
	},
	leftPanel: {
		flex: 1,
		borderRightWidth: 2,
		borderRightColor: '#C9B037',
		backgroundColor: 'rgba(249, 246, 239, 0.95)',
	},
	rightPanel: {
		flex: 2,
		backgroundColor: '#2c5530',
	},
	bottomControls: {
		position: 'absolute',
		bottom: 20,
		right: 20,
		flexDirection: 'row',
		gap: 12,
		zIndex: 200,
	},
	controlButton: {
		backgroundColor: '#8B2323',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: 90,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	buttonText: {
		color: 'white',
		fontSize: 12,
		fontWeight: '600',
		marginTop: 4,
	},
});
