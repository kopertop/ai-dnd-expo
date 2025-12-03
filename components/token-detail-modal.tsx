import React, { useState } from 'react';
import { Alert, Image, Modal, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MapToken } from '@/types/multiplayer-map';

interface TokenDetailModalProps {
	visible: boolean;
	token: MapToken | null;
	onClose: () => void;
	onMove?: () => void;
	onDelete?: () => void;
	onDamage?: (amount: number) => void;
	onHeal?: (amount: number) => void;
	canEdit?: boolean;
}

export const TokenDetailModal: React.FC<TokenDetailModalProps> = ({
	visible,
	token,
	onClose,
	onMove,
	onDelete,
	onDamage,
	onHeal,
	canEdit = false,
}) => {
	const [damageAmount, setDamageAmount] = useState('');
	const [healAmount, setHealAmount] = useState('');

	if (!token) {
		return null;
	}

	const icon = token.icon || token.metadata?.icon;
	const isImageIcon = typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('data:'));
	const isCharacterOrNpc = token.type === 'player' || token.type === 'npc';
	const showDamageHeal = canEdit && isCharacterOrNpc && (onDamage || onHeal);

	const handleDamage = () => {
		const amount = parseInt(damageAmount, 10);
		if (!isNaN(amount) && amount > 0 && onDamage) {
			onDamage(amount);
			setDamageAmount('');
		}
	};

	const handleHeal = () => {
		const amount = parseInt(healAmount, 10);
		if (!isNaN(amount) && amount > 0 && onHeal) {
			onHeal(amount);
			setHealAmount('');
		}
	};

	const handleDelete = () => {
		if (!onDelete) return;

		const tokenName = token.label || token.type || 'this token';

		// Alert button callbacks are ignored on web; use confirm instead
		if (Platform.OS === 'web') {
			const confirmed = typeof window !== 'undefined'
				? window.confirm(`Are you sure you want to remove ${tokenName} from the map?`)
				: false;
			if (confirmed) {
				onDelete();
			}
			return;
		}

		Alert.alert(
			'Remove Token',
			`Are you sure you want to remove ${tokenName} from the map?`,
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{
					text: 'Remove',
					style: 'destructive',
					onPress: onDelete,
				},
			],
		);
	};

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
						{token.hitPoints !== undefined && token.maxHitPoints !== undefined && (
							<View style={styles.infoRow}>
								<ThemedText style={styles.infoLabel}>HP:</ThemedText>
								<ThemedText style={styles.infoValue}>
									{token.hitPoints} / {token.maxHitPoints}
								</ThemedText>
							</View>
						)}
						{showDamageHeal && (
							<View style={styles.damageHealSection}>
								<ThemedText style={styles.sectionTitle}>Damage / Heal</ThemedText>
								<View style={styles.damageHealRow}>
									{onDamage && (
										<View style={styles.damageHealInput}>
											<TextInput
												style={styles.amountInput}
												value={damageAmount}
												onChangeText={setDamageAmount}
												placeholder="Amount"
												placeholderTextColor="#9B8B7A"
												keyboardType="numeric"
											/>
											<TouchableOpacity
												style={[styles.damageHealButton, styles.damageButton]}
												onPress={handleDamage}
												disabled={!damageAmount || isNaN(parseInt(damageAmount, 10))}
											>
												<ThemedText style={styles.damageHealButtonText}>Damage</ThemedText>
											</TouchableOpacity>
										</View>
									)}
									{onHeal && (
										<View style={styles.damageHealInput}>
											<TextInput
												style={styles.amountInput}
												value={healAmount}
												onChangeText={setHealAmount}
												placeholder="Amount"
												placeholderTextColor="#9B8B7A"
												keyboardType="numeric"
											/>
											<TouchableOpacity
												style={[styles.damageHealButton, styles.healButton]}
												onPress={handleHeal}
												disabled={!healAmount || isNaN(parseInt(healAmount, 10))}
											>
												<ThemedText style={styles.damageHealButtonText}>Heal</ThemedText>
											</TouchableOpacity>
										</View>
									)}
								</View>
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
										onPress={handleDelete}
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
	damageHealSection: {
		marginTop: 12,
		padding: 12,
		backgroundColor: '#E2D3B3',
		borderRadius: 8,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginBottom: 8,
	},
	damageHealRow: {
		flexDirection: 'row',
		gap: 8,
	},
	damageHealInput: {
		flex: 1,
		gap: 4,
	},
	amountInput: {
		backgroundColor: '#F5E6D3',
		borderRadius: 6,
		padding: 8,
		borderWidth: 1,
		borderColor: '#C9B037',
		color: '#3B2F1B',
		fontSize: 14,
		textAlign: 'center',
	},
	damageHealButton: {
		padding: 8,
		borderRadius: 6,
		alignItems: 'center',
	},
	damageButton: {
		backgroundColor: '#DC2626',
	},
	healButton: {
		backgroundColor: '#059669',
	},
	damageHealButtonText: {
		color: '#FFFFFF',
		fontWeight: '600',
		fontSize: 12,
	},
});
