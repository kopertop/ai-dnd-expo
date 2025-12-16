import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export type TileAction = 'placeNpc' | 'placePlayer' | 'changeTerrain' | 'placeWater' | 'placeRoad' | 'clearTile';

interface TileActionMenuProps {
	visible: boolean;
	x: number;
	y: number;
	availableActions: TileAction[];
	onAction: (action: TileAction, x: number, y: number) => void;
	onClose: () => void;
}

const ACTION_LABELS: Record<TileAction, string> = {
	placeNpc: 'Place NPC',
	placePlayer: 'Place Player',
	changeTerrain: 'Change Terrain',
	placeWater: 'Place Water',
	placeRoad: 'Place Road',
	clearTile: 'Clear Tile',
};

export const TileActionMenu: React.FC<TileActionMenuProps> = ({
	visible,
	x,
	y,
	availableActions,
	onAction,
	onClose,
}) => {
	const handleAction = (action: TileAction) => {
		onAction(action, x, y);
		onClose();
	};

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} testID="tile-action-overlay">
				<View style={styles.menuContainer} testID="tile-action-menu">
					<ThemedText type="subtitle" style={styles.menuTitle}>
						Tile ({x + 1}, {y + 1})
					</ThemedText>
					{availableActions.length === 0 ? (
						<ThemedText style={styles.emptyText} testID="tile-action-empty">No actions available</ThemedText>
					) : (
						availableActions.map(action => (
							<TouchableOpacity
								key={action}
								style={styles.actionButton}
								onPress={() => handleAction(action)}
								testID={`tile-action-${action}`}
							>
								<ThemedText style={styles.actionText}>{ACTION_LABELS[action]}</ThemedText>
							</TouchableOpacity>
						))
					)}
					<TouchableOpacity style={styles.cancelButton} onPress={onClose} testID="tile-action-cancel">
						<ThemedText style={styles.cancelText}>Cancel</ThemedText>
					</TouchableOpacity>
				</View>
			</TouchableOpacity>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	menuContainer: {
		backgroundColor: '#FFF9EF',
		borderRadius: 12,
		padding: 16,
		minWidth: 200,
		maxWidth: 300,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	menuTitle: {
		marginBottom: 12,
		textAlign: 'center',
	},
	emptyText: {
		color: '#6B5B3D',
		textAlign: 'center',
		padding: 8,
	},
	actionButton: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: '#E6DDC6',
		marginBottom: 8,
		alignItems: 'center',
	},
	actionText: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	cancelButton: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: '#D4BC8B',
		marginTop: 8,
		alignItems: 'center',
	},
	cancelText: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
});
