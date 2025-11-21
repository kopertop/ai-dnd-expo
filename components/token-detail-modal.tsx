import React from 'react';
import { Image, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MapToken } from '@/types/multiplayer-map';

interface TokenDetailModalProps {
	visible: boolean;
	token: MapToken | null;
	onClose: () => void;
	onMove?: () => void;
	onDelete?: () => void;
	canEdit?: boolean;
}

export const TokenDetailModal: React.FC<TokenDetailModalProps> = ({
	visible,
	token,
	onClose,
	onMove,
	onDelete,
	canEdit = false,
}) => {
	if (!token) {
		return null;
	}

	const icon = token.icon || token.metadata?.icon;
	const isImageIcon = typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('data:'));

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
				<View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
					<View style={styles.header}>
						<ThemedText type="subtitle">{token.label || 'Token'}</ThemedText>
						<TouchableOpacity style={styles.closeButton} onPress={onClose}>
							<ThemedText style={styles.closeButtonText}>✕</ThemedText>
						</TouchableOpacity>
					</View>
					<View style={styles.content}>
						{icon ? (
							<View style={styles.iconContainer}>
								{isImageIcon ? (
									<Image source={{ uri: icon }} style={styles.iconImage} />
								) : (
									<ThemedText style={styles.iconEmoji}>{String(icon)}</ThemedText>
								)}
							</View>
						) : null}
						<View style={styles.infoRow}>
							<ThemedText style={styles.infoLabel}>Type:</ThemedText>
							<ThemedText style={styles.infoValue}>{token.type || 'unknown'}</ThemedText>
						</View>
						<View style={styles.infoRow}>
							<ThemedText style={styles.infoLabel}>Position:</ThemedText>
							<ThemedText style={styles.infoValue}>
								({token.x + 1}, {token.y + 1})
							</ThemedText>
						</View>
						{token.entityId && (
							<View style={styles.infoRow}>
								<ThemedText style={styles.infoLabel}>Entity ID:</ThemedText>
								<ThemedText style={styles.infoValue}>{token.entityId}</ThemedText>
							</View>
						)}
						{canEdit && (
							<View style={styles.actions}>
								{onMove && (
									<TouchableOpacity style={styles.actionButton} onPress={onMove}>
										<ThemedText style={styles.actionButtonText}>Move</ThemedText>
									</TouchableOpacity>
								)}
								{onDelete && (
									<TouchableOpacity
										style={[styles.actionButton, styles.deleteButton]}
										onPress={onDelete}
									>
										<ThemedText style={[styles.actionButtonText, styles.deleteButtonText]}>
											Delete
										</ThemedText>
									</TouchableOpacity>
								)}
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
		borderRadius: 12,
		padding: 20,
		minWidth: 300,
		maxWidth: 400,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
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
		fontSize: 18,
		color: '#3B2F1B',
		fontWeight: 'bold',
	},
	content: {
		gap: 12,
	},
	iconContainer: {
		alignItems: 'center',
		marginBottom: 8,
	},
	iconImage: {
		width: 64,
		height: 64,
		resizeMode: 'contain',
	},
	iconEmoji: {
		fontSize: 64,
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 4,
	},
	infoLabel: {
		fontWeight: '600',
		color: '#6B5B3D',
	},
	infoValue: {
		color: '#3B2F1B',
	},
	actions: {
		flexDirection: 'row',
		gap: 8,
		marginTop: 8,
	},
	actionButton: {
		flex: 1,
		padding: 12,
		borderRadius: 8,
		backgroundColor: '#C9B037',
		alignItems: 'center',
	},
	actionButtonText: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	deleteButton: {
		backgroundColor: '#DC2626',
	},
	deleteButtonText: {
		color: '#FFFFFF',
	},
});

