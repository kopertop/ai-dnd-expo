import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { CharacterSheetModal } from './character-sheet-modal';
import { GameCanvas } from './game-canvas';
import { SettingsModal } from './settings-modal';
import { ThemedText } from './themed-text';
import { TurnBasedChat } from './turn-based-chat';

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

	return (
		<View style={styles.container}>
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
				<TouchableOpacity
					style={styles.controlButton}
					onPress={() => openModal('characterSheet')}
					accessibilityLabel="Open Character Sheet"
				>
					<FontAwesome name="user" size={24} color="white" />
					<ThemedText style={styles.buttonText}>Character</ThemedText>
				</TouchableOpacity>

				<TouchableOpacity
					style={styles.controlButton}
					onPress={() => openModal('settings')}
					accessibilityLabel="Open Settings"
				>
					<FontAwesome name="cog" size={24} color="white" />
					<ThemedText style={styles.buttonText}>Settings</ThemedText>
				</TouchableOpacity>
			</View>

			{/* Character Sheet Modal */}
			<CharacterSheetModal
				visible={modals.characterSheet}
				onClose={() => closeModal('characterSheet')}
			/>

			{/* Settings Modal */}
			<SettingsModal visible={modals.settings} onClose={() => closeModal('settings')} />
		</View>
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
