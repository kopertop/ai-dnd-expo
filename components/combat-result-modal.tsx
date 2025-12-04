import React, { useEffect, useMemo } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import type { CharacterActionResult, DiceRollSummary } from '@/types/combat';

type CombatResultModalProps = {
	visible: boolean;
	result: CharacterActionResult | null;
	onClose: () => void;
	autoCloseMs?: number;
};

const formatRoll = (summary?: DiceRollSummary) => {
	if (!summary) {
		return '—';
	}
	return `${summary.breakdown}${summary.critical ? ' (Critical)' : ''}`;
};

export const CombatResultModal: React.FC<CombatResultModalProps> = ({
	visible,
	result,
	onClose,
	autoCloseMs = 3500,
}) => {
	useEffect(() => {
		if (!visible || !result) {
			return;
		}
		const timeout = setTimeout(() => onClose(), autoCloseMs);
		return () => clearTimeout(timeout);
	}, [visible, result, autoCloseMs, onClose]);

	const headline = useMemo(() => {
		if (!result) {
			return '';
		}
		if (result.type === 'spell') {
			return `Spell: ${result.spellName}`;
		}
		return `Attack (${result.attackStyle})`;
	}, [result]);

	if (!result) {
		return null;
	}

	const hitLabel = result.type === 'spell' ? (result.hit === false ? 'Miss' : 'Hit') : result.hit ? 'Hit' : 'Miss';
	const targetName = result.target?.name ?? 'Unknown Target';
	const damageText =
		typeof result.damageDealt === 'number' ? `${result.damageDealt} damage` : 'No damage dealt';

	return (
		<Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<ThemedView style={styles.card}>
					<ThemedText type="subtitle" style={styles.title}>
						{headline}
					</ThemedText>
					<ThemedText style={styles.target}>
						{hitLabel} • {targetName}
					</ThemedText>
					<ThemedText style={styles.damage}>{damageText}</ThemedText>
					<View style={styles.section}>
						<ThemedText style={styles.sectionLabel}>Attack Roll</ThemedText>
						<ThemedText style={styles.sectionValue}>{formatRoll(result.attackRoll)}</ThemedText>
					</View>
					<View style={styles.section}>
						<ThemedText style={styles.sectionLabel}>Damage Roll</ThemedText>
						<ThemedText style={styles.sectionValue}>{formatRoll(result.damageRoll)}</ThemedText>
					</View>
					<TouchableOpacity style={styles.closeButton} onPress={onClose}>
						<ThemedText style={styles.closeText}>Close</ThemedText>
					</TouchableOpacity>
				</ThemedView>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
	},
	card: {
		width: '100%',
		maxWidth: 420,
		backgroundColor: '#FFF9EF',
		borderRadius: 16,
		padding: 20,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	title: {
		textAlign: 'center',
		marginBottom: 4,
	},
	target: {
		textAlign: 'center',
		fontSize: 14,
		marginBottom: 4,
		color: '#3B2F1B',
	},
	damage: {
		textAlign: 'center',
		fontWeight: '700',
		fontSize: 18,
		marginBottom: 16,
		color: '#4A6741',
	},
	section: {
		marginBottom: 12,
	},
	sectionLabel: {
		fontSize: 12,
		textTransform: 'uppercase',
		color: '#6B5B3D',
		marginBottom: 4,
	},
	sectionValue: {
		fontSize: 14,
		color: '#3B2F1B',
	},
	closeButton: {
		marginTop: 12,
		paddingVertical: 10,
		backgroundColor: '#4A6741',
		borderRadius: 8,
		alignItems: 'center',
	},
	closeText: {
		color: '#FFF9EF',
		fontWeight: '600',
	},
});

