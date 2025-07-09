import Feather from '@expo/vector-icons/Feather';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ClassOption } from '../constants/classes';
import { RaceOption } from '../constants/races';
import { PartialStatBlock, STAT_KEYS, StatBlock, StatKey } from '../constants/stats';
import { newGameStyles } from '../styles/new-game.styles';

// 5e point-buy cost table
const POINT_BUY_COST: Record<number, number> = {
	8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};
const MIN_STAT = 8;
const MAX_STAT = 15;
const POINT_BUY_TOTAL = 27;

function getPointBuyTotal(stats: StatBlock): number {
	return STAT_KEYS.reduce((sum, key) => sum + POINT_BUY_COST[stats[key]], 0);
}

interface CharacterReviewProps {
	name: string;
	description: string;
	race: RaceOption;
	classOption: ClassOption;
	baseStats: StatBlock; // before racial bonuses
	racialBonuses: PartialStatBlock;
	onBack: () => void;
	onFinish: () => void;
}

export const CharacterReview: React.FC<CharacterReviewProps> = ({
	name,
	description,
	race,
	classOption,
	baseStats,
	racialBonuses,
	onBack,
	onFinish,
}) => {
	const [editableStats, setEditableStats] = useState<StatBlock>({ ...baseStats });
	const pointsUsed = getPointBuyTotal(editableStats);
	const pointsRemaining = POINT_BUY_TOTAL - pointsUsed;

	const isPrimary = classOption.primaryStats.includes.bind(classOption.primaryStats);
	const isSecondary = classOption.secondaryStats?.includes.bind(classOption.secondaryStats) ?? (() => false);

	const handleChange = (key: StatKey, delta: number) => {
		const newValue = editableStats[key] + delta;
		if (newValue < MIN_STAT || newValue > MAX_STAT) return;
		const newStats = { ...editableStats, [key]: newValue };
		if (getPointBuyTotal(newStats) > POINT_BUY_TOTAL) return;
		setEditableStats(newStats);
	};

	const getTotal = (key: StatKey) => editableStats[key] + (racialBonuses[key] || 0);

	return (
		<ScrollView contentContainerStyle={[newGameStyles.scrollViewContent, styles.container]}>
			<Text style={newGameStyles.title}>Review Character Sheet</Text>

			{/* Header */}
			<View style={styles.headerRow}>
				{race.image && (
					<Image source={race.image} style={styles.icon} />
				)}
				{classOption.image && (
					<Image source={classOption.image} style={styles.icon} />
				)}
				<View style={styles.headerTextCol}>
					<Text style={styles.name}>{name}</Text>
					<Text style={styles.raceClass}>{race.name} {classOption.name ? `/ ${classOption.name}` : ''}</Text>
				</View>
			</View>

			{/* Description */}
			<View style={newGameStyles.sectionBox}>
				<Text style={newGameStyles.label}>Background</Text>
				<Text style={styles.description}>{description}</Text>
			</View>

			{/* Points Remaining */}
			<View style={styles.pointsRow}>
				<Text style={styles.pointsText}>Points Remaining: {pointsRemaining}</Text>
			</View>

			{/* Horizontal Stat Block */}
			<View style={[newGameStyles.sectionBox, styles.horizontalBlock]}>
				<Text style={newGameStyles.label}>Ability Scores</Text>
				<View style={styles.statRow}>
					{STAT_KEYS.map((key) => (
						<View key={key} style={styles.statCol}>
							<Text style={[
								styles.statKey,
								isPrimary(key) && styles.primaryStat,
								isSecondary(key) && styles.secondaryStat,
							]}>{key}</Text>
							<View style={styles.arrowRow}>
								<TouchableOpacity
									onPress={() => handleChange(key, -1)}
									disabled={editableStats[key] <= MIN_STAT}
									style={styles.arrowBtn}
								>
									<Feather name="chevron-left" size={24} color={editableStats[key] <= MIN_STAT ? '#ccc' : '#8B2323'} />
								</TouchableOpacity>
								<Text style={styles.statValue}>{editableStats[key]}</Text>
								<TouchableOpacity
									onPress={() => handleChange(key, 1)}
									disabled={
										editableStats[key] >= MAX_STAT || getPointBuyTotal({ ...editableStats, [key]: editableStats[key] + 1 }) > POINT_BUY_TOTAL
									}
									style={styles.arrowBtn}
								>
									<Feather name="chevron-right" size={24} color={
										editableStats[key] >= MAX_STAT || getPointBuyTotal({ ...editableStats, [key]: editableStats[key] + 1 }) > POINT_BUY_TOTAL
											? '#ccc' : '#8B2323'
									} />
								</TouchableOpacity>
							</View>
							<Text style={styles.racialBonus}>{racialBonuses[key] ? `+${racialBonuses[key]}` : ''}</Text>
							<Text style={styles.statTotal}>{getTotal(key)}</Text>
						</View>
					))}
				</View>
				<View style={styles.statLabelsRow}>
					{STAT_KEYS.map((key) => (
						<View key={key} style={styles.statLabelCol}>
							<Text style={styles.statLabel}>Base</Text>
							<Text style={styles.statLabel}>Racial</Text>
							<Text style={styles.statLabel}>Total</Text>
						</View>
					))}
				</View>
			</View>

			{/* Actions */}
			<View style={styles.actionsRow}>
				<TouchableOpacity style={styles.backButton} onPress={onBack}>
					<Text style={styles.backButtonText}>Back</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.finishButton} onPress={onFinish}>
					<Text style={styles.finishButtonText}>Finish</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		paddingBottom: 32,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	headerTextCol: {
		marginLeft: 16,
	},
	icon: {
		width: 48,
		height: 48,
		borderRadius: 8,
		marginRight: 4,
	},
	name: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#8B2323',
	},
	raceClass: {
		fontSize: 16,
		color: '#3B2F1B',
		marginTop: 2,
	},
	description: {
		fontSize: 16,
		color: '#3B2F1B',
		marginTop: 4,
	},
	pointsRow: {
		alignItems: 'center',
		marginVertical: 8,
	},
	pointsText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#8B2323',
	},
	horizontalBlock: {
		alignItems: 'center',
	},
	statRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginVertical: 12,
		gap: 8,
	},
	statCol: {
		alignItems: 'center',
		marginHorizontal: 8,
	},
	arrowRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: 2,
	},
	arrowBtn: {
		padding: 0,
		marginHorizontal: 2,
		backgroundColor: 'transparent',
	},
	statKey: {
		fontWeight: 'bold',
		color: '#3B2F1B',
		fontSize: 16,
		marginBottom: 2,
	},
	primaryStat: {
		color: '#C9B037',
		textShadowColor: '#8B2323',
		textShadowOffset: { width: 1, height: 1 },
		textShadowRadius: 1,
	},
	secondaryStat: {
		color: '#8B5C2A',
	},
	statValue: {
		fontSize: 18,
		color: '#8B2323',
		fontWeight: 'bold',
		marginHorizontal: 6,
		minWidth: 24,
		textAlign: 'center',
	},
	racialBonus: {
		fontSize: 14,
		color: '#C9B037',
		marginTop: 2,
		minHeight: 18,
	},
	statTotal: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#8B2323',
		marginTop: 2,
	},
	statLabelsRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginTop: 8,
		gap: 8,
	},
	statLabelCol: {
		alignItems: 'center',
		marginHorizontal: 8,
	},
	statLabel: {
		fontSize: 12,
		color: '#8B5C2A',
		marginTop: 2,
	},
	actionsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 24,
		paddingHorizontal: 16,
	},
	backButton: {
		backgroundColor: '#E2D3B3',
		paddingVertical: 10,
		paddingHorizontal: 24,
		borderRadius: 8,
	},
	backButtonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
	finishButton: {
		backgroundColor: '#C9B037',
		paddingVertical: 10,
		paddingHorizontal: 24,
		borderRadius: 8,
	},
	finishButtonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
});
