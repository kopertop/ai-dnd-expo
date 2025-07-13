/**
 * Companion Behavior Tab - AI behavior settings for companions
 */

import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CompanionNPC } from '@/types/characters';

interface CompanionBehaviorTabProps {
	companion: CompanionNPC;
	isEditable: boolean;
	onUpdate: (updates: Partial<CompanionNPC>) => void;
}

export const CompanionBehaviorTab: React.FC<CompanionBehaviorTabProps> = ({
	companion,
	isEditable,
	onUpdate,
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const styles = createStyles(colors);

	/**
	 * Update companion behavior
	 */
	const updateBehavior = (updates: Partial<CompanionNPC['behavior']>) => {
		onUpdate({
			behavior: {
				...companion.behavior,
				...updates,
			},
		});
	};

	/**
	 * Update voice settings
	 */
	const updateVoiceSettings = (updates: Partial<CompanionNPC['voiceSettings']>) => {
		onUpdate({
			voiceSettings: {
				...companion.voiceSettings,
				...updates,
			},
		});
	};

	/**
	 * Render option selector
	 */
	const renderOptionSelector = <T extends string>(
		title: string,
		currentValue: T,
		options: { value: T; label: string; description: string }[],
		onSelect: (value: T) => void
	) => (
		<View style={styles.optionSection}>
			<ThemedText style={styles.optionTitle}>{title}</ThemedText>
			<View style={styles.optionGrid}>
				{options.map((option) => (
					<TouchableOpacity
						key={option.value}
						style={[
							styles.optionItem,
							currentValue === option.value && styles.optionItemSelected,
						]}
						onPress={() => isEditable && onSelect(option.value)}
						disabled={!isEditable}
					>
						<ThemedText style={[
							styles.optionLabel,
							currentValue === option.value && styles.optionLabelSelected,
						]}>
							{option.label}
						</ThemedText>
						<ThemedText style={[
							styles.optionDescription,
							currentValue === option.value && styles.optionDescriptionSelected,
						]}>
							{option.description}
						</ThemedText>
					</TouchableOpacity>
				))}
			</View>
		</View>
	);

	/**
	 * Render slider
	 */
	const renderSlider = (
		title: string,
		value: number,
		min: number,
		max: number,
		step: number,
		onChange: (value: number) => void
	) => (
		<View style={styles.sliderSection}>
			<View style={styles.sliderHeader}>
				<ThemedText style={styles.sliderTitle}>{title}</ThemedText>
				<ThemedText style={styles.sliderValue}>{value}%</ThemedText>
			</View>
			<View style={styles.sliderTrack}>
				<View 
					style={[
						styles.sliderFill,
						{ width: `${(value / max) * 100}%` }
					]} 
				/>
				{isEditable && (
					<View 
						style={[
							styles.sliderThumb,
							{ left: `${(value / max) * 100}%` }
						]} 
					/>
				)}
			</View>
		</View>
	);

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			{/* Combat Behavior */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Combat Behavior</ThemedText>
				
				{renderOptionSelector(
					'Combat Style',
					companion.behavior.combatStyle,
					[
						{ value: 'aggressive', label: 'Aggressive', description: 'Prioritizes dealing damage and engaging enemies.' },
						{ value: 'defensive', label: 'Defensive', description: 'Focuses on protection and damage mitigation.' },
						{ value: 'balanced', label: 'Balanced', description: 'Adapts strategy based on the situation.' },
						{ value: 'support', label: 'Support', description: 'Emphasizes healing and buffing allies.' },
					],
					(value) => updateBehavior({ combatStyle: value })
				)}

				{renderOptionSelector(
					'Follow Distance',
					companion.behavior.followDistance,
					[
						{ value: 'close', label: 'Close', description: 'Stays very near the player character.' },
						{ value: 'medium', label: 'Medium', description: 'Maintains moderate distance for flexibility.' },
						{ value: 'far', label: 'Far', description: 'Keeps distance for ranged support or safety.' },
					],
					(value) => updateBehavior({ followDistance: value })
				)}
			</ThemedView>

			{/* Independence */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Autonomy</ThemedText>
				
				{renderSlider(
					'Independence',
					companion.behavior.independence,
					0,
					100,
					10,
					(value) => updateBehavior({ independence: value })
				)}
				
				<ThemedText style={styles.sliderDescription}>
					Higher independence means the companion will make more decisions on their own. 
					Lower values mean they'll wait for your guidance more often.
				</ThemedText>
			</ThemedView>

			{/* Loyalty */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Loyalty</ThemedText>
				
				<View style={styles.loyaltyContainer}>
					<View style={styles.loyaltyHeader}>
						<ThemedText style={styles.loyaltyValue}>{companion.loyalty}%</ThemedText>
						<ThemedText style={[
							styles.loyaltyStatus,
							{ 
								color: companion.loyalty > 75 ? colors.success : 
									   companion.loyalty > 50 ? colors.warning : 
									   companion.loyalty > 25 ? colors.error : colors.error 
							}
						]}>
							{companion.loyalty > 75 ? 'Devoted' :
							 companion.loyalty > 50 ? 'Loyal' :
							 companion.loyalty > 25 ? 'Wavering' : 'Disloyal'}
						</ThemedText>
					</View>
					
					<View style={styles.loyaltyBar}>
						<View 
							style={[
								styles.loyaltyFill,
								{ 
									width: `${companion.loyalty}%`,
									backgroundColor: companion.loyalty > 75 ? colors.success : 
													 companion.loyalty > 50 ? colors.warning : 
													 companion.loyalty > 25 ? colors.error : colors.error
								}
							]} 
						/>
					</View>
					
					<ThemedText style={styles.loyaltyDescription}>
						Loyalty affects how well the companion follows orders and their likelihood 
						to stay with the party during difficult situations.
					</ThemedText>
				</View>
			</ThemedView>

			{/* Voice & Personality */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Voice & Personality</ThemedText>
				
				<View style={styles.voiceContainer}>
					<View style={styles.voiceItem}>
						<ThemedText style={styles.voiceLabel}>Personality</ThemedText>
						<ThemedText style={styles.voiceValue}>
							{companion.voiceSettings.personality}
						</ThemedText>
					</View>
					
					<View style={styles.voiceItem}>
						<ThemedText style={styles.voiceLabel}>Speaking Style</ThemedText>
						<ThemedText style={styles.voiceValue}>
							{companion.voiceSettings.speakingStyle}
						</ThemedText>
					</View>
					
					<View style={styles.voiceItem}>
						<ThemedText style={styles.voiceLabel}>Catchphrases</ThemedText>
						{companion.voiceSettings.catchphrases.map((phrase, index) => (
							<ThemedText key={index} style={styles.catchphrase}>
								• "{phrase}"
							</ThemedText>
						))}
					</View>
				</View>
			</ThemedView>

			{/* Companion Type */}
			<ThemedView style={styles.section}>
				<ThemedText style={styles.sectionTitle}>Companion Information</ThemedText>
				
				<View style={styles.infoGrid}>
					<View style={styles.infoItem}>
						<ThemedText style={styles.infoLabel}>Type</ThemedText>
						<ThemedText style={styles.infoValue}>{companion.companionType}</ThemedText>
					</View>
					
					<View style={styles.infoItem}>
						<ThemedText style={styles.infoLabel}>Status</ThemedText>
						<ThemedText style={[
							styles.infoValue,
							{ color: companion.isActive ? colors.success : colors.textSecondary }
						]}>
							{companion.isActive ? 'In Party' : 'Available'}
						</ThemedText>
					</View>
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
	optionSection: {
		marginBottom: 20,
	},
	optionTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.text,
		marginBottom: 12,
	},
	optionGrid: {
		gap: 8,
	},
	optionItem: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: colors.background,
		borderWidth: 1,
		borderColor: colors.border,
	},
	optionItemSelected: {
		borderColor: colors.primary,
		backgroundColor: colors.primaryTranslucent,
	},
	optionLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
		marginBottom: 4,
	},
	optionLabelSelected: {
		color: colors.primary,
	},
	optionDescription: {
		fontSize: 12,
		color: colors.textSecondary,
	},
	optionDescriptionSelected: {
		color: colors.primary,
	},
	sliderSection: {
		marginBottom: 16,
	},
	sliderHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	sliderTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.text,
	},
	sliderValue: {
		fontSize: 14,
		fontWeight: 'bold',
		color: colors.primary,
	},
	sliderTrack: {
		height: 8,
		backgroundColor: colors.border,
		borderRadius: 4,
		position: 'relative',
	},
	sliderFill: {
		height: '100%',
		backgroundColor: colors.primary,
		borderRadius: 4,
	},
	sliderThumb: {
		position: 'absolute',
		top: -4,
		width: 16,
		height: 16,
		backgroundColor: colors.primary,
		borderRadius: 8,
		marginLeft: -8,
	},
	sliderDescription: {
		fontSize: 12,
		color: colors.textSecondary,
		marginTop: 8,
		lineHeight: 16,
	},
	loyaltyContainer: {
		gap: 12,
	},
	loyaltyHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	loyaltyValue: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.text,
	},
	loyaltyStatus: {
		fontSize: 16,
		fontWeight: '600',
	},
	loyaltyBar: {
		height: 12,
		backgroundColor: colors.border,
		borderRadius: 6,
		overflow: 'hidden',
	},
	loyaltyFill: {
		height: '100%',
		borderRadius: 6,
	},
	loyaltyDescription: {
		fontSize: 12,
		color: colors.textSecondary,
		lineHeight: 16,
	},
	voiceContainer: {
		gap: 16,
	},
	voiceItem: {
		gap: 8,
	},
	voiceLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.text,
	},
	voiceValue: {
		fontSize: 14,
		color: colors.textSecondary,
		lineHeight: 20,
	},
	catchphrase: {
		fontSize: 14,
		color: colors.textSecondary,
		fontStyle: 'italic',
		lineHeight: 20,
	},
	infoGrid: {
		gap: 16,
	},
	infoItem: {
		gap: 4,
	},
	infoLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: colors.textSecondary,
		textTransform: 'uppercase',
	},
	infoValue: {
		fontSize: 16,
		color: colors.text,
		textTransform: 'capitalize',
	},
});