/**
 * Character Features Tab - Class features and abilities
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AnyCharacter, ClassFeature } from '@/types/characters';

interface CharacterFeaturesTabProps {
	character: AnyCharacter;
	isEditable: boolean;
	onUpdate: (updates: Partial<AnyCharacter>) => void;
}

export const CharacterFeaturesTab: React.FC<CharacterFeaturesTabProps> = ({
	character,
	isEditable,
	onUpdate,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const styles = createStyles(colors);

	/**
	 * Render feature item
	 */
	const renderFeature = (feature: ClassFeature) => (
		<View key={feature.name} style={styles.featureItem}>
			<View style={styles.featureHeader}>
				<ThemedText style={styles.featureName}>{feature.name}</ThemedText>
				<ThemedText style={styles.featureLevel}>Level {feature.level}</ThemedText>
			</View>
			
			<ThemedText style={styles.featureDescription}>
				{feature.description}
			</ThemedText>
			
			{feature.uses && (
				<View style={styles.usesContainer}>
					<ThemedText style={styles.usesLabel}>Uses:</ThemedText>
					<View style={styles.usesBoxes}>
						{Array.from({ length: feature.uses.total }, (_, index) => (
							<View
								key={index}
								style={[
									styles.useBox,
									index < feature.uses!.used && styles.useBoxUsed,
								]}
							/>
						))}
					</View>
					<ThemedText style={styles.usesText}>
						{feature.uses.total - feature.uses.used}/{feature.uses.total}
					</ThemedText>
					<ThemedText style={styles.usesReset}>
						(Resets on {feature.uses.resetOn.replace('-', ' ')})
					</ThemedText>
				</View>
			)}
		</View>
	);

	const features = character.progression.features || [];

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Class Features */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Class Features</ThemedText>
				
				{features.length > 0 ? (
					<View style={styles.featuresContainer}>
						{features.map(renderFeature)}
					</View>
				) : (
					<ThemedText style={styles.placeholderText}>
						No class features available at this level.
					</ThemedText>
				)}
			</ThemedView>

			{/* Background Feature */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Background</ThemedText>
				
				<View style={styles.backgroundContainer}>
					<ThemedText style={styles.backgroundName}>
						{character.background.name}
					</ThemedText>
					<ThemedText style={styles.backgroundDescription}>
						{character.background.description}
					</ThemedText>
					
					<View style={styles.backgroundDetails}>
						<View style={styles.backgroundDetail}>
							<ThemedText style={styles.detailLabel}>Skills:</ThemedText>
							<ThemedText style={styles.detailValue}>
								{character.background.skillProficiencies.join(', ')}
							</ThemedText>
						</View>
						
						<View style={styles.backgroundDetail}>
							<ThemedText style={styles.detailLabel}>Languages:</ThemedText>
							<ThemedText style={styles.detailValue}>
								{character.background.languages.join(', ')}
							</ThemedText>
						</View>
					</View>
				</View>
			</ThemedView>

			{/* Personality */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Personality</ThemedText>
				
				<View style={styles.personalityContainer}>
					<View style={styles.personalitySection}>
						<ThemedText style={styles.personalityLabel}>Traits</ThemedText>
						{character.personality.traits.map((trait, index) => (
							<ThemedText key={index} style={styles.personalityText}>
								• {trait}
							</ThemedText>
						))}
					</View>
					
					<View style={styles.personalitySection}>
						<ThemedText style={styles.personalityLabel}>Ideals</ThemedText>
						{character.personality.ideals.map((ideal, index) => (
							<ThemedText key={index} style={styles.personalityText}>
								• {ideal}
							</ThemedText>
						))}
					</View>
					
					<View style={styles.personalitySection}>
						<ThemedText style={styles.personalityLabel}>Bonds</ThemedText>
						{character.personality.bonds.map((bond, index) => (
							<ThemedText key={index} style={styles.personalityText}>
								• {bond}
							</ThemedText>
						))}
					</View>
					
					<View style={styles.personalitySection}>
						<ThemedText style={styles.personalityLabel}>Flaws</ThemedText>
						{character.personality.flaws.map((flaw, index) => (
							<ThemedText key={index} style={styles.personalityText}>
								• {flaw}
							</ThemedText>
						))}
					</View>
					
					{character.personality.backstory && (
						<View style={styles.personalitySection}>
							<ThemedText style={styles.personalityLabel}>Backstory</ThemedText>
							<ThemedText style={styles.personalityText}>
								{character.personality.backstory}
							</ThemedText>
						</View>
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
	featuresContainer: {
		gap: 16,
	},
	featureItem: {
		padding: 16,
		borderRadius: 8,
		backgroundColor: colors.background,
		borderWidth: 1,
		borderColor: colors.border,
	},
	featureHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	featureName: {
		fontSize: 16,
		fontWeight: 'bold',
		color: colors.text,
		flex: 1,
	},
	featureLevel: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.primary,
		backgroundColor: colors.primaryTranslucent,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	featureDescription: {
		fontSize: 14,
		color: colors.textSecondary,
		lineHeight: 20,
	},
	usesContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 12,
		gap: 8,
	},
	usesLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.text,
	},
	usesBoxes: {
		flexDirection: 'row',
		gap: 4,
	},
	useBox: {
		width: 12,
		height: 12,
		borderRadius: 2,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.background,
	},
	useBoxUsed: {
		backgroundColor: colors.textSecondary,
	},
	usesText: {
		fontSize: 12,
		color: colors.text,
	},
	usesReset: {
		fontSize: 10,
		color: colors.textSecondary,
		fontStyle: 'italic',
	},
	backgroundContainer: {
		gap: 12,
	},
	backgroundName: {
		fontSize: 16,
		fontWeight: 'bold',
		color: colors.text,
	},
	backgroundDescription: {
		fontSize: 14,
		color: colors.textSecondary,
		lineHeight: 20,
	},
	backgroundDetails: {
		gap: 8,
	},
	backgroundDetail: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	detailLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
		marginRight: 8,
	},
	detailValue: {
		fontSize: 14,
		color: colors.textSecondary,
		flex: 1,
	},
	personalityContainer: {
		gap: 16,
	},
	personalitySection: {
		gap: 8,
	},
	personalityLabel: {
		fontSize: 14,
		fontWeight: 'bold',
		color: colors.text,
	},
	personalityText: {
		fontSize: 14,
		color: colors.textSecondary,
		lineHeight: 20,
	},
	placeholderText: {
		fontSize: 14,
		color: colors.textSecondary,
		textAlign: 'center',
		fontStyle: 'italic',
	},
});