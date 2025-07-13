/**
 * Character Skills Tab - Skills and saving throws display
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AnyCharacter, Skills, SavingThrows } from '@/types/characters';

interface CharacterSkillsTabProps {
	character: AnyCharacter;
	isEditable: boolean;
	onUpdate: (updates: Partial<AnyCharacter>) => void;
}

export const CharacterSkillsTab: React.FC<CharacterSkillsTabProps> = ({
	character,
	isEditable,
	onUpdate,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const styles = createStyles(colors);

	/**
	 * Render skill item
	 */
	const renderSkill = (skillKey: keyof Skills, label: string) => {
		const value = character.skills[skillKey];
		const modifier = value >= 0 ? `+${value}` : `${value}`;

		return (
			<View key={skillKey} style={styles.skillItem}>
				<ThemedText style={styles.skillName}>{label}</ThemedText>
				<ThemedText style={styles.skillValue}>{modifier}</ThemedText>
			</View>
		);
	};

	/**
	 * Render saving throw
	 */
	const renderSavingThrow = (saveKey: keyof SavingThrows, label: string) => {
		const value = character.savingThrows[saveKey];
		const modifier = value >= 0 ? `+${value}` : `${value}`;

		return (
			<View key={saveKey} style={styles.saveItem}>
				<ThemedText style={styles.saveName}>{label}</ThemedText>
				<ThemedText style={styles.saveValue}>{modifier}</ThemedText>
			</View>
		);
	};

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Saving Throws */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Saving Throws</ThemedText>
				<View style={styles.savesGrid}>
					{renderSavingThrow('strength', 'Strength')}
					{renderSavingThrow('dexterity', 'Dexterity')}
					{renderSavingThrow('constitution', 'Constitution')}
					{renderSavingThrow('intelligence', 'Intelligence')}
					{renderSavingThrow('wisdom', 'Wisdom')}
					{renderSavingThrow('charisma', 'Charisma')}
				</View>
			</ThemedView>

			{/* Skills */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Skills</ThemedText>
				<View style={styles.skillsGrid}>
					{renderSkill('athletics', 'Athletics (Str)')}
					{renderSkill('acrobatics', 'Acrobatics (Dex)')}
					{renderSkill('sleightOfHand', 'Sleight of Hand (Dex)')}
					{renderSkill('stealth', 'Stealth (Dex)')}
					{renderSkill('arcana', 'Arcana (Int)')}
					{renderSkill('history', 'History (Int)')}
					{renderSkill('investigation', 'Investigation (Int)')}
					{renderSkill('nature', 'Nature (Int)')}
					{renderSkill('religion', 'Religion (Int)')}
					{renderSkill('animalHandling', 'Animal Handling (Wis)')}
					{renderSkill('insight', 'Insight (Wis)')}
					{renderSkill('medicine', 'Medicine (Wis)')}
					{renderSkill('perception', 'Perception (Wis)')}
					{renderSkill('survival', 'Survival (Wis)')}
					{renderSkill('deception', 'Deception (Cha)')}
					{renderSkill('intimidation', 'Intimidation (Cha)')}
					{renderSkill('performance', 'Performance (Cha)')}
					{renderSkill('persuasion', 'Persuasion (Cha)')}
				</View>
			</ThemedView>
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
	savesGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	saveItem: {
		width: '30%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 12,
		borderRadius: 8,
		backgroundColor: colors.background,
	},
	saveName: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
		flex: 1,
	},
	saveValue: {
		fontSize: 16,
		fontWeight: 'bold',
		color: colors.primary,
	},
	skillsGrid: {
		gap: 8,
	},
	skillItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 12,
		borderRadius: 8,
		backgroundColor: colors.background,
	},
	skillName: {
		fontSize: 14,
		color: colors.text,
		flex: 1,
	},
	skillValue: {
		fontSize: 16,
		fontWeight: 'bold',
		color: colors.primary,
	},
});