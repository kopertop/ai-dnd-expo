import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { DEFAULT_RACE_SPEED } from '@/constants/race-speed';
import { ThemedText } from './themed-text';
import { Character } from '@/types/character';
import { MapToken } from '@/types/multiplayer-map';
import { getCharacterSpeed } from '@/utils/character-utils';

interface TurnResourceValuesProps {
	character?: Character;
	npcToken?: MapToken;
	activeTurn?: {
		movementUsed?: number;
		majorActionUsed?: boolean;
		minorActionUsed?: boolean;
		speed?: number;
	} | null;
}

const formatMovementValue = (value: number) => {
	return Math.abs(value - Math.round(value)) < 0.01 ? Math.round(value).toString() : value.toFixed(1);
};

export const TurnResourceValues: React.FC<TurnResourceValuesProps> = ({
	character,
	npcToken,
	activeTurn,
}) => {
	const totalMovementSpeed = useMemo(() => {
		if (typeof activeTurn?.speed === 'number') {
			return activeTurn.speed;
		}
		if (character) {
			return getCharacterSpeed(character);
		}
		// For NPCs without speed in activeTurn, use default
		return DEFAULT_RACE_SPEED;
	}, [activeTurn?.speed, character]);

	const movementBudget = useMemo(() => {
		const used = activeTurn?.movementUsed ?? 0;
		return Math.max(0, totalMovementSpeed - used);
	}, [totalMovementSpeed, activeTurn?.movementUsed]);

	if (!activeTurn) {
		return null;
	}

	return (
		<View style={styles.turnResourceRow}>
			<View style={styles.turnResourceBadge}>
				<ThemedText style={styles.turnResourceLabel}>Movement</ThemedText>
				<ThemedText style={styles.turnResourceValue}>
					{formatMovementValue(movementBudget)} / {formatMovementValue(totalMovementSpeed)}
				</ThemedText>
			</View>
			<View
				style={[
					styles.turnResourceBadge,
					activeTurn?.majorActionUsed && styles.turnResourceBadgeUsed,
				]}
			>
				<ThemedText style={styles.turnResourceLabel}>Major</ThemedText>
				<ThemedText style={styles.turnResourceValue}>
					{activeTurn?.majorActionUsed ? 'Used' : 'Ready'}
				</ThemedText>
			</View>
			<View
				style={[
					styles.turnResourceBadge,
					activeTurn?.minorActionUsed && styles.turnResourceBadgeUsed,
				]}
			>
				<ThemedText style={styles.turnResourceLabel}>Minor</ThemedText>
				<ThemedText style={styles.turnResourceValue}>
					{activeTurn?.minorActionUsed ? 'Used' : 'Ready'}
				</ThemedText>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	turnResourceRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 8,
	},
	turnResourceBadge: {
		flexDirection: 'column',
		backgroundColor: '#FFF3CD',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderWidth: 1,
		borderColor: '#F0C36D',
	},
	turnResourceBadgeUsed: {
		opacity: 0.6,
	},
	turnResourceLabel: {
		fontSize: 12,
		color: '#6B4F1D',
		textTransform: 'uppercase',
	},
	turnResourceValue: {
		fontSize: 14,
		fontWeight: '700',
		color: '#2F1B0C',
	},
});

