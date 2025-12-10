import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import type { CharacterActionResult, DiceRollSummary } from '@/types/combat';
import { parseDiceNotation } from '@/services/dice-roller';

type CombatResultModalProps = {
	visible: boolean;
	result: CharacterActionResult | null;
	onClose: () => void;
	onRerollCriticalMiss?: () => void | Promise<void>;
	canRerollCriticalMiss?: boolean;
	isRerolling?: boolean;
};

const getDiceMeta = (summary?: DiceRollSummary) => {
	if (!summary?.notation) {
		return { count: summary?.rolls?.length ?? 1, dieSize: 20 };
	}
	const parsed = parseDiceNotation(summary.notation);
	return {
		count: summary.rolls?.length ?? parsed?.numDice ?? 1,
		dieSize: parsed?.dieSize ?? 20,
	};
};

const randomRolls = (count: number, dieSize: number) =>
	Array.from({ length: Math.max(1, count) }, () => Math.floor(Math.random() * dieSize) + 1);

const DiceFaces: React.FC<{ rolls: number[]; highlight?: boolean; label?: string }> = ({ rolls, highlight }) => {
	const bounce = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.spring(bounce, {
			toValue: 1,
			useNativeDriver: true,
			bounciness: 12,
			speed: 10,
		}).start(() => bounce.setValue(0));
	}, [rolls, bounce]);

	return (
		<View style={styles.diceRow}>
			{rolls.map((roll, idx) => (
				<Animated.View
					key={`${roll}-${idx}`}
					style={[
						styles.die,
						highlight && styles.dieCritical,
						{ marginRight: idx === rolls.length - 1 ? 0 : 8 },
						{
							transform: [
								{
									scale: bounce.interpolate({
										inputRange: [0, 1],
										outputRange: [1, 1.06],
									}),
								},
							],
						},
					]}
				>
					<ThemedText style={[styles.dieText, highlight && styles.dieTextCritical]}>{roll}</ThemedText>
				</Animated.View>
			))}
		</View>
	);
};

export const CombatResultModal: React.FC<CombatResultModalProps> = ({
	visible,
	result,
	onClose,
	onRerollCriticalMiss,
	canRerollCriticalMiss = false,
	isRerolling = false,
}) => {
	const [rolling, setRolling] = useState(false);
	const [displayAttackRolls, setDisplayAttackRolls] = useState<number[]>([]);
	const [displayDamageRolls, setDisplayDamageRolls] = useState<number[]>([]);
	const [attackRevealed, setAttackRevealed] = useState(false);
	const [damageRevealed, setDamageRevealed] = useState(false);
	const [damageRolling, setDamageRolling] = useState(false);

	useEffect(() => {
		if (!visible || !result) {
			return;
		}

		const primaryRoll = result.type === 'spell' && result.saveRoll ? result.saveRoll : result.attackRoll;
		const attackMeta = getDiceMeta(primaryRoll);
		const damageMeta = getDiceMeta(result.damageRoll);

		setRolling(true);
		setAttackRevealed(false);
		setDamageRevealed(false);
		setDamageRolling(false);
		setDisplayAttackRolls(randomRolls(attackMeta.count, attackMeta.dieSize));
		if (result.damageRoll) {
			setDisplayDamageRolls(randomRolls(damageMeta.count, damageMeta.dieSize));
		} else {
			setDisplayDamageRolls([]);
		}

		const spinInterval = setInterval(() => {
			setDisplayAttackRolls(randomRolls(attackMeta.count, attackMeta.dieSize));
		}, 90);

		const revealTimeout = setTimeout(() => {
			setRolling(false);
			if (primaryRoll?.rolls?.length) {
				setDisplayAttackRolls(primaryRoll.rolls);
			}
			setAttackRevealed(true);
			clearInterval(spinInterval);

			if ((result.hit || (result.type === 'spell' && result.saveResult)) && result.damageRoll) {
				setDamageRolling(true);
				const damageSpin = setInterval(() => {
					setDisplayDamageRolls(randomRolls(damageMeta.count, damageMeta.dieSize));
				}, 90);
				setTimeout(() => {
					setDamageRolling(false);
					setDamageRevealed(true);
					if (result.damageRoll?.rolls?.length) {
						setDisplayDamageRolls(result.damageRoll.rolls);
					}
					clearInterval(damageSpin);
				}, 900);
			}
		}, 1100);

		return () => {
			clearInterval(spinInterval);
			clearTimeout(revealTimeout);
		};
	}, [visible, result]);

	const headline = useMemo(() => {
		if (!result) {
			return '';
		}
		if (result.type === 'spell') {
			return `Spell: ${result.spellName}`;
		}
		return `Attack (${result.attackStyle})`;
	}, [result]);

	const hitLabel = useMemo(() => {
		if (!result) return '';
		if (result.type === 'spell') {
			if (result.saveResult) {
				return result.saveResult === 'success' ? 'Saved' : 'Failed Save';
			}
			return result.hit === false ? 'Miss' : 'Hit';
		}
		return result.hit ? 'Hit' : 'Miss';
	}, [result]);

	const targetName = result?.target?.name ?? 'Unknown Target';
	const damageText =
		typeof result?.damageDealt === 'number'
			? `${result.damageDealt} damage`
			: result?.hit
				? 'No damage dealt'
				: '—';
	
	const primaryRoll = result?.type === 'spell' && result?.saveRoll ? result.saveRoll : result?.attackRoll;
	const naturalRoll = primaryRoll?.natural;
	const isCritical = primaryRoll?.critical;
	const isFumble = (primaryRoll as any)?.fumble;
	const rollLabel = result?.type === 'spell' && result?.saveRoll ? 'Saving Throw' : 'Attack Roll';
	const rollBreakdown = result?.type === 'spell' && result?.saveRoll 
		? `${primaryRoll?.breakdown} vs DC ${result.saveDC}` 
		: `${primaryRoll?.breakdown} vs AC ${(primaryRoll as any)?.targetAC}`;

	if (!result) {
		return null;
	}

	const showRerollButton = canRerollCriticalMiss && typeof onRerollCriticalMiss === 'function' && isFumble;

	return (
		<Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<ThemedView style={styles.card}>
					<ThemedText type="subtitle" style={styles.title}>
						{headline}
					</ThemedText>
					<ThemedText style={[styles.target, hitLabel === 'Hit' ? styles.hitText : styles.missText]}>
						{hitLabel} • {targetName}
					</ThemedText>
					<View style={styles.outcomeRow}>
						<ThemedText style={styles.damage}>{damageText}</ThemedText>
						{naturalRoll !== undefined && (
							<ThemedText style={[styles.natural, isCritical && styles.criticalText, isFumble && styles.fumbleText]}>
								d20: {naturalRoll} {isCritical ? '• Critical Hit' : ''} {isFumble ? '• Critical Miss' : ''}
							</ThemedText>
						)}
					</View>

					<View style={styles.section}>
						<ThemedText style={styles.sectionLabel}>{rollLabel}</ThemedText>
						{primaryRoll ? (
							<>
								<DiceFaces
									rolls={displayAttackRolls.length ? displayAttackRolls : primaryRoll.rolls}
									highlight={isCritical || isFumble}
								/>
								<ThemedText style={styles.sectionValue}>
									{rolling ? 'Rolling…' : rollBreakdown}
								</ThemedText>
							</>
						) : (
							<ThemedText style={styles.sectionValue}>—</ThemedText>
						)}
					</View>

					<View style={styles.section}>
						<ThemedText style={styles.sectionLabel}>Damage Roll</ThemedText>
						{!attackRevealed ? (
							<ThemedText style={styles.sectionValue}>Waiting for hit...</ThemedText>
						) : !result.hit ? (
							<ThemedText style={styles.sectionValue}>Missed</ThemedText>
						) : result.damageRoll ? (
							<>
								<DiceFaces
									rolls={damageRevealed ? (displayDamageRolls.length ? displayDamageRolls : result.damageRoll.rolls) : displayDamageRolls}
									highlight={isCritical}
								/>
								<ThemedText style={styles.sectionValue}>
									{damageRolling
										? 'Calculating…'
										: damageRevealed
											? `${result.damageRoll.breakdown}${result.damageRoll.critical ? ' (Critical)' : ''}`
											: 'Rolling…'}
								</ThemedText>
							</>
						) : (
							<ThemedText style={styles.sectionValue}>—</ThemedText>
						)}
					</View>

					{result.target?.remainingHealth !== undefined && (
						<View style={styles.section}>
							<ThemedText style={styles.sectionLabel}>Target Health</ThemedText>
							<ThemedText style={styles.sectionValue}>
								{result.target.remainingHealth}/{result.target.maxHealth ?? '—'}
							</ThemedText>
						</View>
					)}

					<View style={styles.buttonRow}>
						{showRerollButton && (
							<TouchableOpacity
								style={[styles.actionButton, styles.rerollButton, isRerolling && styles.disabledButton]}
								onPress={onRerollCriticalMiss}
								disabled={isRerolling}
							>
								<ThemedText style={[styles.buttonText, styles.rerollText]}>
									{isRerolling ? 'Re-rolling…' : 'Re-roll (skill)'}
								</ThemedText>
							</TouchableOpacity>
						)}
						<TouchableOpacity style={styles.actionButton} onPress={onClose}>
							<ThemedText style={styles.buttonText}>Close</ThemedText>
						</TouchableOpacity>
					</View>
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
	buttonRow: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 10,
		marginTop: 8,
	},
	actionButton: {
		paddingVertical: 10,
		paddingHorizontal: 14,
		backgroundColor: '#4A6741',
		borderRadius: 8,
		alignItems: 'center',
	},
	buttonText: {
		color: '#FFF9EF',
		fontWeight: '600',
	},
	rerollButton: {
		backgroundColor: '#A14B3F',
	},
	rerollText: {
		color: '#FFF5E1',
	},
	disabledButton: {
		opacity: 0.6,
	},
	diceRow: {
		flexDirection: 'row',
		marginBottom: 4,
	},
	die: {
		minWidth: 42,
		minHeight: 42,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#C9B037',
		backgroundColor: '#FFF',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOpacity: 0.08,
		shadowRadius: 4,
	},
	dieCritical: {
		backgroundColor: '#F8E5E0',
		borderColor: '#A14B3F',
	},
	dieText: {
		fontWeight: '700',
		color: '#3B2F1B',
	},
	dieTextCritical: {
		color: '#A14B3F',
	},
	outcomeRow: {
		alignItems: 'center',
		marginBottom: 12,
		gap: 4,
	},
	natural: {
		fontSize: 12,
		color: '#6B5B3D',
	},
	criticalText: {
		color: '#A14B3F',
		fontWeight: '700',
	},
	fumbleText: {
		color: '#8B3A3A',
		fontWeight: '700',
	},
	hitText: {
		color: '#2E6C40',
		fontWeight: '600',
	},
	missText: {
		color: '#8B3A3A',
		fontWeight: '600',
	},
});
