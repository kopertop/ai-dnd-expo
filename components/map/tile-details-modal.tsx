import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';

interface TileDetailsModalProps {
	visible: boolean;
	x: number;
	y: number;
	terrain: string;
	elevation: number;
	isBlocked: boolean;
	hasFog: boolean;
	featureType: string | null;
	metadata?: Record<string, unknown>;
	isHost: boolean;
	onClose: () => void;
}

export const TileDetailsModal: React.FC<TileDetailsModalProps> = ({
	visible,
	x,
	y,
	terrain,
	elevation,
	isBlocked,
	hasFog,
	featureType,
	metadata = {},
	isHost,
	onClose,
}) => {
	const { width: screenWidth, height: screenHeight } = useWindowDimensions();
	const modalWidth = screenWidth * 0.9;
	const modalHeight = screenHeight * 0.9;

	// Filter out trap information for non-host users
	const shouldShowTrapInfo = isHost || featureType !== 'trap';
	const filteredMetadata = shouldShowTrapInfo
		? metadata
		: Object.fromEntries(Object.entries(metadata).filter(([key]) => !key.toLowerCase().includes('trap') && !key.toLowerCase().includes('triggered')));

	const formatMetadata = (meta: Record<string, unknown>): Array<{ key: string; value: string }> => {
		return Object.entries(meta)
			.map(([key, value]) => {
				if (value === null || value === undefined) {
					return null;
				}
				let displayValue: string;
				if (typeof value === 'object') {
					displayValue = JSON.stringify(value, null, 2);
				} else {
					displayValue = String(value);
				}
				return { key, value: displayValue };
			})
			.filter((item): item is { key: string; value: string } => item !== null);
	};

	const metadataItems = formatMetadata(filteredMetadata);

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} testID="tile-details-overlay">
				<View
					style={[
						styles.modalContainer,
						{
							width: modalWidth,
							height: modalHeight,
						},
					]}
					onStartShouldSetResponder={() => true}
					testID="tile-details-modal"
				>
					<View style={styles.header}>
						<ThemedText type="title" style={styles.title}>
							Tile Details
						</ThemedText>
						<TouchableOpacity style={styles.closeButton} onPress={onClose} testID="tile-details-close">
							<ThemedText style={styles.closeButtonText}>✕</ThemedText>
						</TouchableOpacity>
					</View>

					<View style={styles.content}>
						{/* Top Row: Position and Terrain */}
						<View style={styles.topRow}>
							<View style={[styles.card, { marginRight: 6 }]}>
								<ThemedText type="subtitle" style={styles.cardTitle}>
									Position
								</ThemedText>
								<View style={styles.gridRow}>
									<View style={styles.gridItem}>
										<ThemedText style={styles.label}>X</ThemedText>
										<ThemedText style={styles.value}>{x}</ThemedText>
									</View>
									<View style={styles.gridItem}>
										<ThemedText style={styles.label}>Y</ThemedText>
										<ThemedText style={styles.value}>{y}</ThemedText>
									</View>
								</View>
							</View>

							<View style={[styles.card, { marginRight: 0 }]}>
								<ThemedText type="subtitle" style={styles.cardTitle}>
									Terrain
								</ThemedText>
								<View style={styles.gridRow}>
									<View style={styles.gridItem}>
										<ThemedText style={styles.label}>Type</ThemedText>
										<ThemedText style={styles.value}>{terrain}</ThemedText>
									</View>
									<View style={styles.gridItem}>
										<ThemedText style={styles.label}>Elevation</ThemedText>
										<ThemedText style={styles.value}>{elevation}</ThemedText>
									</View>
								</View>
							</View>
						</View>

						{/* Middle Row: Properties */}
						<View style={styles.middleRow}>
							<View style={styles.card}>
								<ThemedText type="subtitle" style={styles.cardTitle}>
									Properties
								</ThemedText>
								<View style={styles.gridRow}>
									<View style={styles.gridItem}>
										<ThemedText style={styles.label}>Blocked</ThemedText>
										<ThemedText style={[styles.value, isBlocked && styles.valueWarning]}>
											{isBlocked ? 'Yes' : 'No'}
										</ThemedText>
									</View>
									<View style={styles.gridItem}>
										<ThemedText style={styles.label}>Fogged</ThemedText>
										<ThemedText style={[styles.value, hasFog && styles.valueInfo]}>
											{hasFog ? 'Yes' : 'No'}
										</ThemedText>
									</View>
									{featureType && (
										<View style={styles.gridItem}>
											<ThemedText style={styles.label}>Feature</ThemedText>
											<ThemedText style={[styles.value, featureType === 'trap' && styles.valueDanger]}>
												{featureType}
											</ThemedText>
										</View>
									)}
								</View>
							</View>
						</View>

						{/* Bottom: Metadata */}
						{metadataItems.length > 0 && (
							<View style={styles.metadataSection}>
								<ThemedText type="subtitle" style={styles.cardTitle}>
									Metadata
								</ThemedText>
								<View style={styles.metadataGrid}>
									{metadataItems.map((item, index) => (
										<View key={index} style={styles.metadataItem}>
											<ThemedText style={styles.metadataKey}>{item.key}</ThemedText>
											<ThemedText style={styles.metadataValue} numberOfLines={3}>
												{item.value}
											</ThemedText>
										</View>
									))}
								</View>
							</View>
						)}
					</View>
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
	modalContainer: {
		backgroundColor: '#FFF9EF',
		borderRadius: 16,
		borderWidth: 2,
		borderColor: '#C9B037',
		overflow: 'hidden',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#E6DDC6',
		backgroundColor: '#F5F0E1',
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
	},
	closeButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#D4BC8B',
		justifyContent: 'center',
		alignItems: 'center',
	},
	closeButtonText: {
		color: '#3B2F1B',
		fontSize: 18,
		fontWeight: '700',
	},
	content: {
		flex: 1,
		padding: 16,
	},
	topRow: {
		flexDirection: 'row',
		marginBottom: 12,
	},
	middleRow: {
		marginBottom: 12,
	},
	card: {
		flex: 1,
		backgroundColor: '#F9F6F0',
		borderRadius: 8,
		padding: 12,
		borderWidth: 1,
		borderColor: '#E6DDC6',
	},
	cardTitle: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 8,
		color: '#6B5B3D',
	},
	gridRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	gridItem: {
		flex: 1,
		minWidth: '30%',
		marginRight: 8,
		marginBottom: 8,
	},
	label: {
		color: '#6B5B3D',
		fontSize: 11,
		fontWeight: '500',
		marginBottom: 2,
		textTransform: 'uppercase',
	},
	value: {
		color: '#3B2F1B',
		fontSize: 16,
		fontWeight: '600',
	},
	valueWarning: {
		color: '#D97706',
	},
	valueInfo: {
		color: '#2563EB',
	},
	valueDanger: {
		color: '#DC143C',
		fontWeight: '700',
	},
	metadataSection: {
		flex: 1,
		minHeight: 100,
	},
	metadataGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 8,
	},
	metadataItem: {
		width: '48%',
		backgroundColor: '#F9F6F0',
		borderRadius: 6,
		padding: 8,
		borderWidth: 1,
		borderColor: '#E6DDC6',
		marginRight: '2%',
		marginBottom: 8,
	},
	metadataKey: {
		color: '#6B5B3D',
		fontSize: 11,
		fontWeight: '600',
		marginBottom: 4,
		textTransform: 'uppercase',
	},
	metadataValue: {
		color: '#3B2F1B',
		fontSize: 12,
		fontFamily: 'monospace',
	},
});
