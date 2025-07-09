import Feather from '@expo/vector-icons/Feather';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ClassOption } from '../constants/classes';
import { RaceOption } from '../constants/races';
import { PartialStatBlock, STAT_KEYS, StatBlock, StatKey } from '../constants/stats';
import { newGameStyles } from '../styles/new-game.styles';

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
	onFinish: (finalData: { name: string; description: string; stats: StatBlock }) => void;
}

export const CharacterReview: React.FC<CharacterReviewProps> = ({
	name: initialName,
	description: initialDescription,
	race,
	classOption,
	baseStats,
	racialBonuses,
	onBack,
	onFinish,
}) => {
	const [editableStats, setEditableStats] = useState<StatBlock>({ ...baseStats });
	const [name, setName] = useState(initialName);
	const [description, setDescription] = useState(initialDescription);
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
			<View style={styles.centerWrapper}>
				<View style={styles.sheetRow}>
					{/* Portrait on the left, info/name/desc on the right */}
					<View style={styles.portraitCol}>
						<View style={styles.portraitBox}>
							{race.image && (
								<Image source={race.image} style={styles.portrait} />
							)}
						</View>
					</View>
					<View style={styles.leftCol}>
						<View style={styles.infoRow}>
							<Text style={styles.infoText}>{classOption.name}</Text>
							<Text style={styles.infoText}>/ {race.name}</Text>
							<Text style={styles.infoText}>/ Level 1</Text>
						</View>
						<TextInput
							style={styles.nameInput}
							placeholder="Character Name"
							value={name}
							onChangeText={setName}
							maxLength={32}
						/>
						<TextInput
							style={styles.backgroundInput}
							placeholder="Background / Description"
							value={description}
							onChangeText={setDescription}
							multiline
							numberOfLines={5}
							maxLength={400}
						/>
					</View>
					<View style={styles.verticalStatBlock}>
						{STAT_KEYS.map((key) => (
							<View key={key} style={[styles.statBox, isPrimary(key) && styles.primaryStatBox, isSecondary(key) && styles.secondaryStatBox]}>
								<Text style={styles.statLabel}>{key}</Text>
								<View style={styles.statArrowsRow}>
									<TouchableOpacity
										onPress={() => handleChange(key, -1)}
										disabled={editableStats[key] <= MIN_STAT}
										style={styles.arrowBtn}
									>
										<Feather name="chevron-up" size={22} color={editableStats[key] <= MIN_STAT ? '#ccc' : '#8B2323'} />
									</TouchableOpacity>
									<Text style={styles.statValue}>{editableStats[key]}</Text>
									<TouchableOpacity
										onPress={() => handleChange(key, 1)}
										disabled={
											editableStats[key] >= MAX_STAT || getPointBuyTotal({ ...editableStats, [key]: editableStats[key] + 1 }) > POINT_BUY_TOTAL
										}
										style={styles.arrowBtn}
									>
										<Feather name="chevron-down" size={22} color={
											editableStats[key] >= MAX_STAT || getPointBuyTotal({ ...editableStats, [key]: editableStats[key] + 1 }) > POINT_BUY_TOTAL
												? '#ccc' : '#8B2323'
										} />
									</TouchableOpacity>
								</View>
								<Text style={styles.racialBonus}>{racialBonuses[key] ? `+${racialBonuses[key]}` : ''}</Text>
								<Text style={styles.statTotal}>{getTotal(key)}</Text>
							</View>
						))}
						<Text style={styles.pointsText}>Points Left: {pointsRemaining}</Text>
					</View>
				</View>
			</View>

			{/* Actions */}
			<View style={styles.actionsRow}>
				<TouchableOpacity style={styles.backButton} onPress={onBack}>
					<Text style={styles.backButtonText}>Back</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.finishButton} onPress={() => onFinish({ name, description, stats: editableStats })}>
					<Text style={styles.finishButtonText}>Start</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		paddingBottom: 32,
	},
	centerWrapper: {
		width: '100%',
		maxWidth: 1024,
		alignSelf: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
	},
	sheetRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'flex-start',
		gap: 32,
	},
	portraitCol: {
		alignItems: 'flex-start',
		justifyContent: 'flex-start',
	},
	portraitBox: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	portrait: {
		width: 140,
		height: 140,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#C9B037',
		backgroundColor: '#F9F6EF',
		marginBottom: 8,
	},
	leftCol: {
		flex: 1,
		minWidth: 320,
		maxWidth: 480,
	},
	infoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 8,
	},
	infoText: {
		fontSize: 16,
		color: '#8B5C2A',
		marginRight: 8,
	},
	nameInput: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#8B2323',
		marginBottom: 8,
		borderBottomWidth: 2,
		borderColor: '#C9B037',
		paddingVertical: 4,
		paddingHorizontal: 8,
		backgroundColor: '#F9F6EF',
		borderRadius: 6,
	},
	backgroundInput: {
		fontSize: 16,
		color: '#3B2F1B',
		marginBottom: 12,
		minHeight: 80,
		borderWidth: 1,
		borderColor: '#C9B037',
		padding: 8,
		backgroundColor: '#F9F6EF',
		borderRadius: 6,
		textAlignVertical: 'top',
	},
	verticalStatBlock: {
		alignItems: 'center',
		marginLeft: 32,
		width: 120,
	},
	statBox: {
		alignItems: 'center',
		marginVertical: 6,
		padding: 8,
		borderWidth: 2,
		borderColor: '#8B5C2A',
		borderRadius: 10,
		backgroundColor: '#F9F6EF',
		width: 110,
	},
	primaryStatBox: {
		borderColor: '#C9B037',
		backgroundColor: '#FFF8E1',
	},
	secondaryStatBox: {
		borderColor: '#8B2323',
	},
	statLabel: {
		fontWeight: 'bold',
		fontSize: 16,
		color: '#8B2323',
		marginBottom: 2,
	},
	statArrowsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: 2,
		gap: 4,
	},
	arrowBtn: {
		padding: 0,
		marginHorizontal: 2,
		backgroundColor: 'transparent',
	},
	statValue: {
		fontSize: 20,
		color: '#8B2323',
		fontWeight: 'bold',
		marginHorizontal: 6,
		minWidth: 28,
		textAlign: 'center',
	},
	racialBonus: {
		fontSize: 14,
		color: '#C9B037',
		marginTop: 2,
		minHeight: 18,
	},
	statTotal: {
		fontSize: 22,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginTop: 2,
	},
	pointsText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#8B2323',
		marginTop: 12,
		textAlign: 'center',
	},
	actionsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 32,
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
