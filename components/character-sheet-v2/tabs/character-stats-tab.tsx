/**
 * Character Stats Tab - Core ability scores and vitals
 * Displays and allows editing of character's primary statistics
 */

import React, { useState } from 'react';
import {
	View,
	ScrollView,
	TouchableOpacity,
	TextInput,
	StyleSheet,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AnyCharacter, AbilityScores } from '@/types/characters';

interface CharacterStatsTabProps {
	character: AnyCharacter;
	isEditable: boolean;
	onUpdate: (updates: Partial<AnyCharacter>) => void;
}

export const CharacterStatsTab: React.FC<CharacterStatsTabProps> = ({
	character,
	isEditable,
	onUpdate,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const styles = createStyles(colors);

	/**
	 * Handle ability score updates
	 */
	const handleAbilityScoreChange = (ability: keyof AbilityScores, value: string) => {
		const numValue = parseInt(value) || 0;
		if (numValue < 1 || numValue > 30) return;

		const newAbilityScores = {
			...character.abilityScores,
			[ability]: numValue,
		};

		// Recalculate modifiers
		const calculateModifier = (score: number) => Math.floor((score - 10) / 2);
		const newAbilityModifiers = {
			...character.abilityModifiers,
			[ability]: calculateModifier(numValue),
		};

		onUpdate({
			abilityScores: newAbilityScores,
			abilityModifiers: newAbilityModifiers,
		});
	};

	/**
	 * Handle hit point changes
	 */
	const handleHitPointChange = (field: 'current' | 'maximum' | 'temporary', value: string) => {
		const numValue = Math.max(0, parseInt(value) || 0);
		
		const newHitPoints = {
			...character.vitals.hitPoints,
			[field]: numValue,
		};

		onUpdate({
			vitals: {
				...character.vitals,
				hitPoints: newHitPoints,
			},
		});
	};

	/**
	 * Render ability score block
	 */
	const renderAbilityScore = (ability: keyof AbilityScores, label: string) => {
		const score = character.abilityScores[ability];
		const modifier = character.abilityModifiers[ability];
		const modifierString = modifier >= 0 ? `+${modifier}` : `${modifier}`;

		return (
			<View key={ability} style={styles.abilityBlock}>
				<ThemedText style={styles.abilityLabel}>{label}</ThemedText>
				
				{isEditable ? (
					<TextInput
						style={[styles.abilityScoreInput, { color: colors.text }]}
						value={score.toString()}
						onChangeText={(value) => handleAbilityScoreChange(ability, value)}
						keyboardType="numeric"
						maxLength={2}
					/>
				) : (
					<View style={styles.abilityScoreDisplay}>
						<ThemedText style={styles.abilityScore}>{score}</ThemedText>
					</View>
				)}
				
				<View style={styles.abilityModifier}>
					<ThemedText style={styles.abilityModifierText}>{modifierString}</ThemedText>
				</View>
			</View>
		);
	};

	/**
	 * Render vital statistic
	 */
	const renderVitalStat = (
		label: string,
		value: number,
		isEditable: boolean,
		onEdit?: (value: string) => void,
		suffix?: string
	) => (
		<View style={styles.vitalStat}>
			<ThemedText style={styles.vitalLabel}>{label}</ThemedText>
			{isEditable && onEdit ? (
				<TextInput
					style={[styles.vitalInput, { color: colors.text }]}
					value={value.toString()}
					onChangeText={onEdit}
					keyboardType="numeric"
				/>
			) : (
				<ThemedText style={styles.vitalValue}>
					{value}{suffix}
				</ThemedText>
			)}
		</View>
	);

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Basic Information */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Character Information</ThemedText>
				
				<View style={styles.infoGrid}>
					<View style={styles.infoItem}>
						<ThemedText style={styles.infoLabel}>Race</ThemedText>
						<ThemedText style={styles.infoValue}>{character.race}</ThemedText>
					</View>
					
					<View style={styles.infoItem}>
						<ThemedText style={styles.infoLabel}>Class</ThemedText>
						<ThemedText style={styles.infoValue}>{character.characterClass}</ThemedText>
					</View>
					
					<View style={styles.infoItem}>
						<ThemedText style={styles.infoLabel}>Level</ThemedText>
						<ThemedText style={styles.infoValue}>{character.level}</ThemedText>
					</View>
					
					<View style={styles.infoItem}>
						<ThemedText style={styles.infoLabel}>Alignment</ThemedText>
						<ThemedText style={styles.infoValue}>{character.alignment}</ThemedText>
					</View>
				</View>
			</ThemedView>

			{/* Ability Scores */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Ability Scores</ThemedText>
				
				<View style={styles.abilityGrid}>
					{renderAbilityScore('strength', 'STR')}
					{renderAbilityScore('dexterity', 'DEX')}
					{renderAbilityScore('constitution', 'CON')}
					{renderAbilityScore('intelligence', 'INT')}
					{renderAbilityScore('wisdom', 'WIS')}
					{renderAbilityScore('charisma', 'CHA')}
				</View>
			</ThemedView>

			{/* Combat Stats */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Combat Statistics</ThemedText>
				
				<View style={styles.combatGrid}>
					{renderVitalStat('Armor Class', character.vitals.armorClass.total, false)}
					{renderVitalStat('Initiative', character.vitals.initiative, false, undefined, character.vitals.initiative >= 0 ? '+' : '')}
					{renderVitalStat('Speed', character.vitals.speed, false, undefined, ' ft')}
					{renderVitalStat('Proficiency Bonus', character.vitals.proficiencyBonus, false, undefined, '+')}
				</View>
			</ThemedView>

			{/* Hit Points */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Hit Points</ThemedText>
				
				<View style={styles.hitPointsContainer}>
					<View style={styles.hitPointsRow}>
						{renderVitalStat(
							'Current HP',
							character.vitals.hitPoints.current,
							isEditable,
							(value) => handleHitPointChange('current', value)
						)}
						
						{renderVitalStat(
							'Maximum HP',
							character.vitals.hitPoints.maximum,
							isEditable,
							(value) => handleHitPointChange('maximum', value)
						)}
					</View>
					
					{renderVitalStat(
						'Temporary HP',
						character.vitals.hitPoints.temporary,
						isEditable,
						(value) => handleHitPointChange('temporary', value)
					)}
				</View>
			</ThemedView>

			{/* Death Saves (Player Characters Only) */}
			{character.type === 'player' && (
				<ThemedView style={styles.section}>
					<ThemedText style={styles.sectionTitle}>Death Saves</ThemedText>
					
					<View style={styles.deathSavesContainer}>
						<View style={styles.deathSaveRow}>
							<ThemedText style={styles.deathSaveLabel}>Successes</ThemedText>
							<View style={styles.deathSaveBoxes}>
								{[0, 1, 2].map(index => (
									<View
										key={`success-${index}`}
										style={[
											styles.deathSaveBox,
											character.deathSaves.successes > index && styles.deathSaveBoxFilled,
										]}
									/>
								))}
							</View>
						</View>
						
						<View style={styles.deathSaveRow}>
							<ThemedText style={styles.deathSaveLabel}>Failures</ThemedText>
							<View style={styles.deathSaveBoxes}>
								{[0, 1, 2].map(index => (
									<View
										key={`failure-${index}`}
										style={[
											styles.deathSaveBox,
											character.deathSaves.failures > index && styles.deathSaveBoxFilledRed,
										]}
									/>
								))}
							</View>
						</View>
					</View>
				</ThemedView>
			)}

			{/* Companion Stats */}
			{character.type === 'companion' && (
				<ThemedView style={styles.section}>
					<ThemedText style={styles.sectionTitle}>Companion Status</ThemedText>
					
					<View style={styles.companionStats}>
						<View style={styles.loyaltyContainer}>
							<ThemedText style={styles.infoLabel}>Loyalty</ThemedText>
							<View style={styles.loyaltyBar}>
								<View 
									style={[
										styles.loyaltyFill,
										{ 
											width: `${character.loyalty}%`,
											backgroundColor: character.loyalty > 75 ? '#22C55E' : 
															 character.loyalty > 50 ? '#F59E0B' : 
															 character.loyalty > 25 ? '#EF4444' : '#991B1B'
										}
									]} 
								/>
							</View>
							<ThemedText style={styles.loyaltyText}>{character.loyalty}%</ThemedText>
						</View>
						
						<View style={styles.infoItem}>
							<ThemedText style={styles.infoLabel}>Type</ThemedText>
							<ThemedText style={styles.infoValue}>{character.companionType}</ThemedText>
						</View>
						
						<View style={styles.infoItem}>
							<ThemedText style={styles.infoLabel}>Status</ThemedText>
							<ThemedText style={[
								styles.infoValue,
								{ color: character.isActive ? colors.success : colors.textSecondary }
							]}>
								{character.isActive ? 'In Party' : 'Available'}
							</ThemedText>
						</View>
					</View>
				</ThemedView>
			)}
		</ScrollView>
	);
};

const createStyles = (colors: any) => StyleSheet.create({
	container: {
		flex: 1,
		padding: 16,
	},
	section: {
		marginBottom: 24,
		padding: 16,
		borderRadius: 12,
		backgroundColor: colors.backgroundSecondary,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 16,
		color: colors.text,
	},
	infoGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 16,
	},
	infoItem: {
		flex: 1,
		minWidth: '45%',
	},
	infoLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.textSecondary,
		marginBottom: 4,
		textTransform: 'uppercase',
	},
	infoValue: {
		fontSize: 16,
		color: colors.text,
		textTransform: 'capitalize',
	},
	abilityGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
		justifyContent: 'space-between',
	},
	abilityBlock: {
		width: '30%',
		minWidth: 80,
		alignItems: 'center',
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.border,
	},
	abilityLabel: {
		fontSize: 12,
		fontWeight: 'bold',
		color: colors.textSecondary,
		marginBottom: 8,
	},
	abilityScoreDisplay: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
	},
	abilityScore: {
		fontSize: 18,
		fontWeight: 'bold',
		color: colors.primaryText,
	},
	abilityScoreInput: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: colors.primary,
		textAlign: 'center',
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 8,
	},
	abilityModifier: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
		backgroundColor: colors.background,
	},
	abilityModifierText: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
	},
	combatGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 16,
	},
	vitalStat: {
		flex: 1,
		minWidth: '45%',
		alignItems: 'center',
		padding: 12,
		borderRadius: 8,
		backgroundColor: colors.background,
	},
	vitalLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.textSecondary,
		marginBottom: 8,
		textAlign: 'center',
	},
	vitalValue: {
		fontSize: 20,
		fontWeight: 'bold',
		color: colors.text,
	},
	vitalInput: {
		fontSize: 20,
		fontWeight: 'bold',
		textAlign: 'center',
		minWidth: 60,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	hitPointsContainer: {
		gap: 16,
	},
	hitPointsRow: {
		flexDirection: 'row',
		gap: 16,
	},
	deathSavesContainer: {
		gap: 12,
	},
	deathSaveRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	deathSaveLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
	},
	deathSaveBoxes: {
		flexDirection: 'row',
		gap: 8,
	},
	deathSaveBox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 2,
		borderColor: colors.border,
		backgroundColor: colors.background,
	},
	deathSaveBoxFilled: {
		backgroundColor: colors.success,
		borderColor: colors.success,
	},
	deathSaveBoxFilledRed: {
		backgroundColor: colors.error,
		borderColor: colors.error,
	},
	companionStats: {
		gap: 16,
	},
	loyaltyContainer: {
		gap: 8,
	},
	loyaltyBar: {
		height: 8,
		backgroundColor: colors.border,
		borderRadius: 4,
		overflow: 'hidden',
	},
	loyaltyFill: {
		height: '100%',
		borderRadius: 4,
	},
	loyaltyText: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
		textAlign: 'center',
	},
});