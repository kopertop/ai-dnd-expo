import Feather from '@expo/vector-icons/Feather';
import React, { useEffect, useRef, useState } from 'react';
import {
	Animated,
	Easing,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';

import { newGameStyles } from '../styles/new-game.styles';

import { Colors } from '@/constants/colors';
import { ABILITY_COLORS, SKILL_LIST } from '@/constants/skills';
import { ClassOption } from '@/types/class-option';
import { RaceOption } from '@/types/race-option';
import { PartialStatBlock, STAT_KEYS, StatBlock, StatKey } from '@/types/stats';

const POINT_BUY_COST: Record<number, number> = {
	8: 0,
	9: 1,
	10: 2,
	11: 3,
	12: 4,
	13: 5,
	14: 7,
	15: 9,
};
const MIN_STAT = 8;
const MAX_STAT = 15;
const POINT_BUY_TOTAL = 27;

function getPointBuyTotal(stats: StatBlock): number {
	return STAT_KEYS.reduce((sum: number, key: StatKey) => sum + POINT_BUY_COST[stats[key]], 0);
}

interface CharacterReviewProps {
	name: string;
	description: string;
	race: RaceOption;
	classOption: ClassOption;
	baseStats: StatBlock; // before racial bonuses
	racialBonuses: PartialStatBlock;
	onBack: () => void;
	onFinish: (finalData: {
		name: string;
		description: string;
		stats: StatBlock;
		skills: string[];
	}) => void;
	skills: string[];
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
	skills,
}) => {
	const [editableStats, setEditableStats] = useState<StatBlock>({ ...baseStats });
	const [name, setName] = useState(initialName);
	const [description, setDescription] = useState(initialDescription);
	const pointsUsed = getPointBuyTotal(editableStats);
	const pointsRemaining = POINT_BUY_TOTAL - pointsUsed;
	const [invalidFields, setInvalidFields] = useState<{
		name: boolean;
		description: boolean;
		points: boolean;
	}>({ name: false, description: false, points: false });

	// Animated values for pulsing
	const namePulse = useRef(new Animated.Value(0)).current;
	const descPulse = useRef(new Animated.Value(0)).current;
	const pointsPulse = useRef(new Animated.Value(0)).current;

	// Cleanup animations on unmount to prevent memory leaks
	useEffect(() => {
		return () => {
			namePulse.stopAnimation();
			descPulse.stopAnimation();
			pointsPulse.stopAnimation();
		};
	}, [namePulse, descPulse, pointsPulse]);

	// Initial Stats based on Class and Race
	useEffect(() => {
		const initialStats = { ...baseStats };
		for (const key of Object.keys(initialStats)) {
			if (classOption.primaryStats.includes(key as StatKey)) {
				initialStats[key as StatKey] = 15;
			} else if (classOption.secondaryStats?.includes(key as StatKey)) {
				initialStats[key as StatKey] = 12;
			} else {
				initialStats[key as StatKey] = 10;
			}
		}

		setEditableStats(initialStats);
	}, [race, classOption, baseStats]);

	const pulseAnim = (field: 'name' | 'description' | 'points') => {
		const anim =
			field === 'name' ? namePulse : field === 'description' ? descPulse : pointsPulse;
		anim.setValue(0);
		Animated.timing(anim, {
			toValue: 1,
			duration: 900,
			easing: Easing.inOut(Easing.ease),
			useNativeDriver: false,
		}).start(() => {
			anim.setValue(0);
		});
	};

	const isPrimary = classOption.primaryStats.includes.bind(classOption.primaryStats);
	const isSecondary =
		classOption.secondaryStats?.includes.bind(classOption.secondaryStats) ?? (() => false);

	const handleChange = (key: StatKey, delta: number) => {
		const newValue = editableStats[key] + delta;
		if (newValue < MIN_STAT || newValue > MAX_STAT) return;
		const newStats = { ...editableStats, [key]: newValue };
		if (getPointBuyTotal(newStats) > POINT_BUY_TOTAL) return;
		setEditableStats(newStats);
	};

	const getTotal = (key: StatKey) => editableStats[key] + (racialBonuses[key] || 0);

	const validateAndStart = () => {
		const nameValid = name.trim().length > 0;
		const descValid = description.trim().length > 0;
		const pointsValid = pointsRemaining === 0;
		setInvalidFields({ name: !nameValid, description: !descValid, points: !pointsValid });
		if (!nameValid) pulseAnim('name');
		if (!descValid) pulseAnim('description');
		if (!pointsValid) pulseAnim('points');
		if (nameValid && descValid && pointsValid) {
			onFinish({ name, description, stats: editableStats, skills });
		}
	};

	// Reset error on change
	const handleNameChange = (val: string) => {
		setName(val);
		if (invalidFields.name && val.trim().length > 0)
			setInvalidFields(f => ({ ...f, name: false }));
	};
	const handleDescChange = (val: string) => {
		setDescription(val);
		if (invalidFields.description && val.trim().length > 0)
			setInvalidFields(f => ({ ...f, description: false }));
	};

	const nameBg = namePulse.interpolate({
		inputRange: [0, 0.5, 1],
		outputRange: ['transparent', '#FF0000', 'transparent'],
	});
	const descBg = descPulse.interpolate({
		inputRange: [0, 0.5, 1],
		outputRange: ['transparent', '#FF0000', 'transparent'],
	});
	const pointsBg = pointsPulse.interpolate({
		inputRange: [0, 0.5, 1],
		outputRange: ['transparent', '#FF0000', 'transparent'],
	});

	return (
		<ScrollView contentContainerStyle={[newGameStyles.scrollViewContent, styles.container]}>
			<Text style={newGameStyles.title}>Review Character Sheet</Text>
			<View style={styles.centerWrapper}>
				<View style={styles.sheetRow}>
					<View style={styles.portraitCol}>
						<View style={styles.portraitBox}>
							{race.image && <Image source={race.image} style={styles.portrait} />}
						</View>
					</View>
					<View style={styles.leftCol}>
						<View style={styles.infoRow}>
							<Text style={styles.infoText}>{classOption.name}</Text>
							<Text style={styles.infoText}>/ {race.name}</Text>
							<Text style={styles.infoText}>/ Level 1</Text>
						</View>
						<Animated.View
							style={[styles.animatedSection, { backgroundColor: nameBg }]}
						>
							<View>
								<TextInput
									style={[
										styles.nameInput,
										invalidFields.name && styles.inputError,
									]}
									placeholder="Character Name"
									value={name}
									onChangeText={handleNameChange}
									maxLength={32}
								/>
							</View>
						</Animated.View>
						<Animated.View
							style={[styles.animatedSection, { backgroundColor: descBg }]}
						>
							<View>
								<TextInput
									style={[
										styles.backgroundInput,
										invalidFields.description && styles.inputError,
									]}
									placeholder="Background / Description (Tell us about your character's background, goals, personality, or story...)"
									value={description}
									onChangeText={handleDescChange}
									multiline
									scrollEnabled={true}
									textAlignVertical="top"
									maxLength={1000}
									onContentSizeChange={() => {
										// Auto-resize text input
									}}
								/>
							</View>
						</Animated.View>
						{/* Display selected skills as a read-only list */}
						<View style={styles.skillsChooserOuter}>
							<Text style={styles.skillsChooserTitle}>Selected Skills</Text>
							<View style={styles.skillsGrid}>
								{skills.map(skillId => {
									const skill = SKILL_LIST.find(s => s.id === skillId);
									if (!skill) return null;
									return (
										<View
											key={skill.id}
											style={[
												styles.skillPill,
												{
													backgroundColor:
														ABILITY_COLORS[
															skill.ability as keyof typeof ABILITY_COLORS
														] || '#ccc',
												},
											]}
										>
											<Text style={styles.skillPillText}>{skill.name}</Text>
										</View>
									);
								})}
							</View>
						</View>
					</View>
					<View style={styles.statBlockCol}>
						<Animated.View
							style={[styles.animatedSection, { backgroundColor: pointsBg }]}
						>
							<Text
								style={[
									styles.pointsText,
									invalidFields.points && styles.inputError,
								]}
							>
								Points Left: {pointsRemaining}
							</Text>
						</Animated.View>
						<View style={styles.statGrid}>
							{(
								[
									['STR', 'DEX', 'CON'],
									['INT', 'WIS', 'CHA'],
								] as StatKey[][]
							).map(keys => (
								<View key={keys.join(',')} style={styles.statRowGrid}>
									{keys.map(key => (
										<View
											key={key}
											style={[
												styles.statBox,
												isPrimary(key) && styles.primaryStatBox,
												isSecondary(key) && styles.secondaryStatBox,
											]}
										>
											<Text style={styles.statLabel}>{key}</Text>
											<View style={styles.statArrowsRow}>
												<TouchableOpacity
													onPress={() => handleChange(key, 1)}
													disabled={
														editableStats[key] >= MAX_STAT ||
														getPointBuyTotal({
															...editableStats,
															[key]: editableStats[key] + 1,
														}) > POINT_BUY_TOTAL
													}
													style={styles.arrowBtn}
												>
													<Feather
														name="chevron-up"
														size={22}
														color={
															editableStats[key] >= MAX_STAT ||
															getPointBuyTotal({
																...editableStats,
																[key]: editableStats[key] + 1,
															}) > POINT_BUY_TOTAL
																? '#ccc'
																: '#8B2323'
														}
													/>
												</TouchableOpacity>
												<Text style={styles.statValue}>
													{editableStats[key]}
												</Text>
												<TouchableOpacity
													onPress={() => handleChange(key, -1)}
													disabled={editableStats[key] <= MIN_STAT}
													style={styles.arrowBtn}
												>
													<Feather
														name="chevron-down"
														size={22}
														color={
															editableStats[key] <= MIN_STAT
																? '#ccc'
																: '#8B2323'
														}
													/>
												</TouchableOpacity>
											</View>
											<Text style={styles.racialBonus}>
												{racialBonuses[key] ? `+${racialBonuses[key]}` : ''}
											</Text>
											<Text style={styles.statTotal}>{getTotal(key)}</Text>
											{isPrimary(key) && (
												<Text style={styles.textPrimary}>PRIMARY</Text>
											)}
											{!isPrimary(key) && isSecondary(key) && (
												<Text style={styles.textSecondary}>SECONDARY</Text>
											)}
										</View>
									))}
								</View>
							))}
						</View>
					</View>
				</View>
			</View>
			<View style={styles.actionsRow}>
				<TouchableOpacity style={styles.backButton} onPress={onBack}>
					<Text style={styles.backButtonText}>Back</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.finishButton} onPress={validateAndStart}>
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
		maxWidth: 2048,
		alignSelf: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		paddingHorizontal: 16,
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
		fontSize: 18,
		color: '#3B2F1B',
		marginBottom: 12,
		minHeight: 300,
		maxHeight: 500,
		height: 350,
		borderWidth: 1,
		borderColor: '#C9B037',
		padding: 16,
		backgroundColor: '#F9F6EF',
		borderRadius: 6,
		textAlignVertical: 'top',
		width: '100%',
		alignSelf: 'stretch',
		lineHeight: 26,
	},
	statBlockCol: {
		alignItems: 'center',
		justifyContent: 'flex-start',
		minWidth: 400,
		maxWidth: 600,
		marginLeft: 32,
	},
	pointsText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#8B2323',
		marginBottom: 16,
		textAlign: 'center',
	},
	statGrid: {
		flexDirection: 'column',
		alignItems: 'center',
		gap: 12,
	},
	statRowGrid: {
		flexDirection: 'row',
		gap: 16,
	},
	statBox: {
		alignItems: 'center',
		marginVertical: 0,
		padding: 8,
		borderWidth: 2,
		borderColor: '#8B5C2A',
		borderRadius: 10,
		backgroundColor: '#F9F6EF',
		width: 110,
	},
	textPrimary: {
		fontSize: 12,
		color: Colors.primary,
		fontWeight: 'bold',
		textTransform: 'uppercase',
		marginTop: 2,
	},
	textSecondary: {
		fontSize: 12,
		color: Colors.secondary,
		fontWeight: 'bold',
		textTransform: 'uppercase',
		marginTop: 2,
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
	inputError: {
		borderColor: '#B22222',
		backgroundColor: '#FFF0F0',
		color: '#B22222',
	},
	animatedSection: {
		borderRadius: 6,
		marginBottom: 8,
	},
	skillsChooserOuter: {
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 40,
		marginBottom: 24,
		padding: 24,
		backgroundColor: '#F5F2E6',
		borderRadius: 18,
		boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
		maxWidth: 900,
		alignSelf: 'center',
	},
	skillsChooserTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 18,
		color: '#8B2323',
		textAlign: 'center',
	},
	skillsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'center',
		gap: 20,
		rowGap: 20,
		columnGap: 20,
		marginTop: 0,
	},
	skillIconCard: {
		width: 64,
		height: 64,
		borderRadius: 0,
		borderWidth: 0,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F9F6EF',
		margin: 0,
		padding: 0,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 6,
		elevation: 2,
	},
	skillIconCardSelected: {
		width: 64 + 8,
		height: 64 + 8,
		backgroundColor: '#FFF8E1',
		borderWidth: 8,
		borderColor: '#C9B037',
		shadowOpacity: 0.18,
		shadowRadius: 10,
	},
	skillIconFlat: {
		width: 64,
		height: 64,
		resizeMode: 'contain',
	},
	skillPill: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 15,
		alignItems: 'center',
		justifyContent: 'center',
		margin: 5,
	},
	skillPillText: {
		fontSize: 14,
		fontWeight: 'bold',
		color: '#3B2F1B',
	},
});
