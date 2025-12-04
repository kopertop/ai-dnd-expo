import React from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export type MapElementType = 'fire' | 'water' | 'chest' | 'barrel' | 'rock' | 'tree' | 'bush' | 'rubble';

interface MapElement {
	type: MapElementType;
	label: string;
	icon: string;
}

const MAP_ELEMENTS: MapElement[] = [
	{ type: 'fire', label: 'Fire', icon: '🔥' },
	{ type: 'water', label: 'Water', icon: '💧' },
	{ type: 'chest', label: 'Chest', icon: '📦' },
	{ type: 'barrel', label: 'Barrel', icon: '🛢️' },
	{ type: 'rock', label: 'Rock', icon: '🪨' },
	{ type: 'tree', label: 'Tree', icon: '🌳' },
	{ type: 'bush', label: 'Bush', icon: '🌿' },
	{ type: 'rubble', label: 'Rubble', icon: '🧱' },
];

interface MapElementPickerProps {
	visible: boolean;
	onClose: () => void;
	onSelect: (elementType: MapElementType) => void;
}

export const MapElementPicker: React.FC<MapElementPickerProps> = ({
	visible,
	onClose,
	onSelect,
}) => {
	const handleSelect = (elementType: MapElementType) => {
		onSelect(elementType);
		onClose();
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<TouchableOpacity
				style={styles.overlay}
				activeOpacity={1}
				onPress={onClose}
			>
				<TouchableOpacity
					activeOpacity={1}
					onPress={(e) => e.stopPropagation()}
					style={styles.modal}
				>
					<ThemedView style={styles.content}>
						<ThemedText type="subtitle" style={styles.title}>
							Select Map Element
						</ThemedText>
						<ScrollView style={styles.grid}>
							<View style={styles.gridContainer}>
								{MAP_ELEMENTS.map((element) => (
									<TouchableOpacity
										key={element.type}
										style={styles.elementButton}
										onPress={() => handleSelect(element.type)}
									>
										<ThemedText style={styles.elementIcon}>{element.icon}</ThemedText>
										<ThemedText style={styles.elementLabel}>{element.label}</ThemedText>
									</TouchableOpacity>
								))}
							</View>
						</ScrollView>
						<TouchableOpacity
							style={styles.closeButton}
							onPress={onClose}
						>
							<ThemedText style={styles.closeButtonText}>Close</ThemedText>
						</TouchableOpacity>
					</ThemedView>
				</TouchableOpacity>
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
	modal: {
		width: '90%',
		maxWidth: 500,
		maxHeight: '80%',
	},
	content: {
		backgroundColor: '#FFF9EF',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#C9B037',
		padding: 20,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 16,
		textAlign: 'center',
	},
	grid: {
		maxHeight: 400,
	},
	gridContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		gap: 12,
	},
	elementButton: {
		width: '30%',
		aspectRatio: 1,
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 12,
	},
	elementIcon: {
		fontSize: 32,
		marginBottom: 8,
	},
	elementLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#3B2F1B',
		textAlign: 'center',
	},
	closeButton: {
		marginTop: 16,
		paddingVertical: 12,
		backgroundColor: '#4A6741',
		borderRadius: 8,
		alignItems: 'center',
	},
	closeButtonText: {
		color: '#FFF9EF',
		fontSize: 14,
		fontWeight: '600',
	},
});

