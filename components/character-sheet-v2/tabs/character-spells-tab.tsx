/**
 * Character Spells Tab - Spellcasting information
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AnyCharacter } from '@/types/characters';

interface CharacterSpellsTabProps {
	character: AnyCharacter;
	isEditable: boolean;
	onUpdate: (updates: Partial<AnyCharacter>) => void;
}

export const CharacterSpellsTab: React.FC<CharacterSpellsTabProps> = ({
	character,
	isEditable,
	onUpdate,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const styles = createStyles(colors);

	const spellcasting = character.progression.spellcasting;

	if (!spellcasting) {
		return (
			<View style={styles.container}>
				<ThemedView style={styles.section}>
					<ThemedText style={styles.placeholderText}>
						This character is not a spellcaster.
					</ThemedText>
				</ThemedView>
			</View>
		);
	}

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Spellcasting Stats */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Spellcasting</ThemedText>
				<View style={styles.statsGrid}>
					<View style={styles.statItem}>
						<ThemedText style={styles.statLabel}>Ability</ThemedText>
						<ThemedText style={styles.statValue}>
							{spellcasting.spellcastingAbility?.toUpperCase()}
						</ThemedText>
					</View>
					<View style={styles.statItem}>
						<ThemedText style={styles.statLabel}>Save DC</ThemedText>
						<ThemedText style={styles.statValue}>
							{spellcasting.spellSaveDC || 'N/A'}
						</ThemedText>
					</View>
					<View style={styles.statItem}>
						<ThemedText style={styles.statLabel}>Attack Bonus</ThemedText>
						<ThemedText style={styles.statValue}>
							+{spellcasting.spellAttackBonus || 0}
						</ThemedText>
					</View>
				</View>
			</ThemedView>

			{/* Spell Slots */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Spell Slots</ThemedText>
				<View style={styles.slotsContainer}>
					{spellcasting.spellSlots.length > 0 ? (
						spellcasting.spellSlots.map((slot) => (
							<View key={slot.level} style={styles.slotLevel}>
								<ThemedText style={styles.slotLevelText}>
									Level {slot.level}
								</ThemedText>
								<View style={styles.slotBoxes}>
									{Array.from({ length: slot.total }, (_, index) => (
										<View
											key={index}
											style={[
												styles.slotBox,
												index < slot.used && styles.slotBoxUsed,
											]}
										/>
									))}
								</View>
								<ThemedText style={styles.slotCount}>
									{slot.total - slot.used}/{slot.total}
								</ThemedText>
							</View>
						))
					) : (
						<ThemedText style={styles.placeholderText}>
							No spell slots available at this level.
						</ThemedText>
					)}
				</View>
			</ThemedView>

			{/* Cantrips */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Cantrips</ThemedText>
				<View style={styles.spellsList}>
					{spellcasting.cantripsKnown.length > 0 ? (
						spellcasting.cantripsKnown.map((cantrip, index) => (
							<View key={index} style={styles.spellItem}>
								<ThemedText style={styles.spellName}>{cantrip}</ThemedText>
							</View>
						))
					) : (
						<ThemedText style={styles.placeholderText}>
							No cantrips known.
						</ThemedText>
					)}
				</View>
			</ThemedView>

			{/* Known Spells */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Known Spells</ThemedText>
				<View style={styles.spellsList}>
					{spellcasting.spellsKnown.length > 0 ? (
						spellcasting.spellsKnown.map((spell, index) => (
							<View key={index} style={styles.spellItem}>
								<ThemedText style={styles.spellName}>{spell}</ThemedText>
							</View>
						))
					) : (
						<ThemedText style={styles.placeholderText}>
							No spells known.
						</ThemedText>
					)}
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
	statsGrid: {
		flexDirection: 'row',
		gap: 16,
		justifyContent: 'space-between',
	},
	statItem: {
		flex: 1,
		alignItems: 'center',
		padding: 12,
		borderRadius: 8,
		backgroundColor: colors.background,
	},
	statLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.textSecondary,
		marginBottom: 4,
	},
	statValue: {
		fontSize: 18,
		fontWeight: 'bold',
		color: colors.text,
	},
	slotsContainer: {
		gap: 12,
	},
	slotLevel: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 8,
		backgroundColor: colors.background,
	},
	slotLevelText: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
		width: 60,
	},
	slotBoxes: {
		flexDirection: 'row',
		gap: 4,
		flex: 1,
		marginHorizontal: 12,
	},
	slotBox: {
		width: 16,
		height: 16,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.background,
	},
	slotBoxUsed: {
		backgroundColor: colors.textSecondary,
	},
	slotCount: {
		fontSize: 12,
		color: colors.textSecondary,
		width: 40,
		textAlign: 'right',
	},
	spellsList: {
		gap: 8,
	},
	spellItem: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: colors.background,
		borderWidth: 1,
		borderColor: colors.border,
	},
	spellName: {
		fontSize: 14,
		color: colors.text,
	},
	placeholderText: {
		fontSize: 14,
		color: colors.textSecondary,
		textAlign: 'center',
		fontStyle: 'italic',
	},
});