import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export type PlayerAction =
	| 'move'
	| 'talk'
	| 'inspect'
	| 'cast_spell'
	| 'basic_attack'
	| 'use_item'
	| 'disarm'
	| 'open'
	| 'pick_up';

interface PlayerActionMenuProps {
	visible: boolean;
	x: number;
	y: number;
	availableActions: PlayerAction[];
	onAction: (action: PlayerAction, x: number, y: number) => void;
	onClose: () => void;
	targetLabel?: string;
}

const ACTION_LABELS: Record<PlayerAction, string> = {
	move: 'Move',
	talk: 'Talk',
	inspect: 'Inspect (Perception Check)',
	cast_spell: 'Cast Spell',
	basic_attack: 'Basic Attack',
	use_item: 'Use Item',
	disarm: 'Disarm',
	open: 'Open',
	pick_up: 'Pick Up',
};

export const PlayerActionMenu: React.FC<PlayerActionMenuProps> = ({
	visible,
	x,
	y,
	availableActions,
	onAction,
	onClose,
	targetLabel,
}) => {
	const handleAction = (action: PlayerAction) => {
		onAction(action, x, y);
		onClose();
	};

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
				<View style={styles.menuContainer}>
					<ThemedText type="subtitle" style={styles.menuTitle}>
						{targetLabel ? `${targetLabel} (${x + 1}, ${y + 1})` : `Tile (${x + 1}, ${y + 1})`}
					</ThemedText>
					{availableActions.length === 0 ? (
						<ThemedText style={styles.emptyText}>No actions available</ThemedText>
					) : (
						availableActions.map(action => (
							<TouchableOpacity
								key={action}
								style={styles.actionButton}
								onPress={() => handleAction(action)}
							>
								<ThemedText style={styles.actionText}>{ACTION_LABELS[action]}</ThemedText>
							</TouchableOpacity>
						))
					)}
					<TouchableOpacity style={styles.cancelButton} onPress={onClose}>
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

