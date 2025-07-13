/**
 * Tavern Companion Recruitment Modal
 * Integrates with DM system for recruiting companions in taverns
 */

import React, { useState, useEffect } from 'react';
import {
	View,
	Modal,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSimpleCompanions } from '@/hooks/use-simple-companions';
import type { Companion, CompanionTemplate } from '@/types/companion';

interface TavernCompanionRecruitmentProps {
	visible: boolean;
	onClose: () => void;
	onCompanionRecruited?: (companion: Companion) => void;
	tavernName?: string;
	locationDescription?: string;
}

// Tavern-specific companion templates
const TAVERN_COMPANION_TEMPLATES: CompanionTemplate[] = [
	{
		name: 'Gruff McBrawler',
		race: 'Dwarf',
		class: 'Fighter',
		level: 2,
		description: 'A grizzled veteran fighter drinking alone at the bar. His armor bears the scars of many battles.',
		personality: 'Tough and straightforward, loyal once trust is earned',
		catchphrases: ['Aye, I can swing an axe.', 'Been in worse scrapes than this.', 'You buying the next round?'],
		companionType: 'hired',
		cost: { type: 'gold', amount: 75, description: 'A few drinks and some coin for gear' },
	},
	{
		name: 'Whisper',
		race: 'Halfling',
		class: 'Rogue',
		level: 1,
		description: 'A hooded figure in the corner, observing everyone quietly. They seem to know things.',
		personality: 'Mysterious and cautious, speaks little but sees much',
		catchphrases: ['I know people.', 'For the right price...', 'Stay quiet.'],
		companionType: 'hired',
		cost: { type: 'gold', amount: 50, description: 'Information has value, as does silence' },
	},
	{
		name: 'Melody Brightvoice',
		race: 'Human',
		class: 'Bard',
		level: 2,
		description: 'A cheerful bard with a lute, entertaining patrons with songs and stories.',
		personality: 'Optimistic and charismatic, loves adventure and new stories',
		catchphrases: ['There\'s a song in everything!', 'Adventure calls!', 'I know just the tale...'],
		companionType: 'quest',
		cost: { type: 'favor', description: 'Seeks new stories and adventures to sing about' },
	},
	{
		name: 'Brother Felix',
		race: 'Human',
		class: 'Cleric',
		level: 3,
		description: 'A traveling priest tending to wounded patrons. His holy symbol gleams in the firelight.',
		personality: 'Compassionate and wise, believes in helping those in need',
		catchphrases: ['May the light guide us.', 'I sense you need healing.', 'Faith conquers all.'],
		companionType: 'story',
		cost: { type: 'favor', description: 'Seeks to do good in the world' },
	},
	{
		name: 'Zara Firehand',
		race: 'Elf',
		class: 'Wizard',
		level: 2,
		description: 'A young mage studying a spellbook by candlelight, occasionally practicing small cantrips.',
		personality: 'Curious and eager to learn, sometimes reckless with magic',
		catchphrases: ['Fascinating magic!', 'I\'ve read about this!', 'Let me try something...'],
		companionType: 'hired',
		cost: { type: 'gold', amount: 100, description: 'Needs funding for spell components and research' },
	},
];

export const TavernCompanionRecruitment: React.FC<TavernCompanionRecruitmentProps> = ({
	visible,
	onClose,
	onCompanionRecruited,
	tavernName = "The Prancing Pony",
	locationDescription = "A cozy tavern filled with the warm glow of firelight and the murmur of conversation.",
}) => {
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme ?? 'light'];
	const styles = createStyles(colors);

	const companions = useSimpleCompanions();
	const [availableCompanions, setAvailableCompanions] = useState<CompanionTemplate[]>([]);
	const [selectedCompanion, setSelectedCompanion] = useState<CompanionTemplate | null>(null);

	/**
	 * Generate random companions when modal opens
	 */
	useEffect(() => {
		if (visible) {
			// Pick 2-3 random companions for this tavern visit
			const shuffled = [...TAVERN_COMPANION_TEMPLATES].sort(() => 0.5 - Math.random());
			const selected = shuffled.slice(0, Math.floor(Math.random() * 2) + 2); // 2-3 companions
			
			setAvailableCompanions(selected);
			setSelectedCompanion(null);
		}
	}, [visible]);

	/**
	 * Handle recruiting a companion
	 */
	const handleRecruitCompanion = async (template: CompanionTemplate) => {
		try {
			// Check if party is full
			const { canAdd, reason } = companions.canAddToParty('dummy-id');
			if (!canAdd && reason?.includes('full')) {
				Alert.alert('Party Full', 'Your party is already full. You can only have 3 companions.');
				return;
			}

			// Create the companion
			const newCompanion = await companions.createCompanion(template);

			// Add to party automatically
			const success = await companions.addToParty(newCompanion.id);

			if (success) {
				Alert.alert(
					'Companion Recruited!',
					`${template.name} has joined your party! They are now ready for adventure.`,
					[{ text: 'Great!', onPress: () => {
						onCompanionRecruited?.(newCompanion);
						onClose();
					}}]
				);
			} else {
				Alert.alert('Error', 'Failed to add companion to party');
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to recruit companion');
		}
	};

	/**
	 * Handle recruitment cost
	 */
	const handlePayCost = (template: CompanionTemplate) => {
		if (!template.cost) {
			handleRecruitCompanion(template);
			return;
		}

		const costDescription = template.cost.type === 'gold' 
			? `Pay ${template.cost.amount} gold pieces`
			: template.cost.description;

		Alert.alert(
			'Recruit Companion',
			`${template.name} agrees to join your party.\n\nCost: ${costDescription}\n\nDo you agree?`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Recruit', onPress: () => handleRecruitCompanion(template) },
			]
		);
	};

	/**
	 * Render companion card
	 */
	const renderCompanionCard = (template: CompanionTemplate, index: number) => {
		return (
			<TouchableOpacity
				key={template.name}
				style={[
					styles.companionCard,
					selectedCompanion?.name === template.name && styles.companionCardSelected,
				]}
				onPress={() => setSelectedCompanion(
					selectedCompanion?.name === template.name ? null : template
				)}
			>
			<View style={styles.companionHeader}>
				<View style={styles.companionInfo}>
					<ThemedText style={styles.companionName}>{template.name}</ThemedText>
					<ThemedText style={styles.companionClass}>
						Level {template.level} {template.race} {template.class}
					</ThemedText>
				</View>
				<View style={styles.companionTypeBadge}>
					<ThemedText style={styles.companionTypeText}>
						{template.companionType.toUpperCase()}
					</ThemedText>
				</View>
			</View>

			<ThemedText style={styles.companionDescription}>
				{template.description}
			</ThemedText>

			{selectedCompanion?.name === template.name && (
				<View style={styles.expandedContent}>
					<View style={styles.personalitySection}>
						<ThemedText style={styles.sectionLabel}>Personality:</ThemedText>
						<ThemedText style={styles.personalityText}>{template.personality}</ThemedText>
					</View>

					<View style={styles.catchphrasesSection}>
						<ThemedText style={styles.sectionLabel}>Says things like:</ThemedText>
						{template.catchphrases.map((phrase, index) => (
							<ThemedText key={index} style={styles.catchphrase}>
								"{phrase}"
							</ThemedText>
						))}
					</View>

					<View style={styles.costSection}>
						<ThemedText style={styles.sectionLabel}>Cost:</ThemedText>
						<ThemedText style={styles.costText}>
							{template.cost?.type === 'gold' 
								? `${template.cost.amount} gold pieces`
								: template.cost?.description || 'Free'
							}
						</ThemedText>
					</View>

					<TouchableOpacity
						style={styles.recruitButton}
						onPress={() => handlePayCost(template)}
					>
						<Feather name="user-plus" size={20} color={colors.text} />
						<ThemedText style={styles.recruitButtonText}>Recruit</ThemedText>
					</TouchableOpacity>
				</View>
			)}
		</TouchableOpacity>
		);
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent={true}
			onRequestClose={onClose}
		>
			<View style={styles.modalOverlay}>
				<ThemedView style={styles.modalContainer}>
					{/* Header */}
					<View style={styles.header}>
						<View style={styles.headerContent}>
							<ThemedText style={styles.title}>{tavernName}</ThemedText>
							<ThemedText style={styles.subtitle}>Looking for Companions</ThemedText>
						</View>
						<TouchableOpacity style={styles.closeButton} onPress={onClose}>
							<Feather name="x" size={24} color={colors.text} />
						</TouchableOpacity>
					</View>

					{/* Description */}
					<ThemedText style={styles.description}>
						{locationDescription} You scan the room for potential companions who might join your adventure.
					</ThemedText>

					{/* Available Companions */}
					<ScrollView style={styles.companionsList} showsVerticalScrollIndicator={false}>
						{companions.isLoading ? (
							<View style={styles.emptyState}>
								<ThemedText style={styles.emptyStateText}>
									Looking for available companions...
								</ThemedText>
							</View>
						) : availableCompanions.length > 0 ? (
							availableCompanions.map((template, index) => renderCompanionCard(template, index))
						) : (
							<View style={styles.emptyState}>
								<Feather name="users" size={48} color={colors.text} />
								<ThemedText style={styles.emptyStateText}>
									No adventurers are looking for work today.
								</ThemedText>
								<ThemedText style={styles.emptyStateSubtext}>
									Try again later or visit another tavern.
								</ThemedText>
							</View>
						)}
					</ScrollView>

					{/* Footer */}
					<View style={styles.footer}>
						<ThemedText style={styles.footerText}>
							Tap a character to learn more, then recruit them to join your party.
						</ThemedText>
					</View>
				</ThemedView>
			</View>
		</Modal>
	);
};

const createStyles = (colors: any) => StyleSheet.create({
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContainer: {
		width: '90%',
		maxWidth: 500,
		maxHeight: '85%',
		borderRadius: 16,
		overflow: 'hidden',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: colors.text + '20',
	},
	headerContent: {
		flex: 1,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: colors.text,
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 16,
		color: colors.text + '80',
	},
	closeButton: {
		padding: 8,
	},
	description: {
		fontSize: 14,
		color: colors.text + '80',
		lineHeight: 20,
		padding: 20,
		paddingBottom: 16,
	},
	companionsList: {
		flex: 1,
		paddingHorizontal: 20,
	},
	companionCard: {
		backgroundColor: colors.background,
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: colors.text + '20',
	},
	companionCardSelected: {
		borderColor: colors.tint,
		backgroundColor: colors.tint + '20',
	},
	companionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 12,
	},
	companionInfo: {
		flex: 1,
	},
	companionName: {
		fontSize: 18,
		fontWeight: 'bold',
		color: colors.text,
		marginBottom: 4,
	},
	companionClass: {
		fontSize: 14,
		color: colors.text + '80',
	},
	companionTypeBadge: {
		backgroundColor: colors.tint,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	companionTypeText: {
		fontSize: 10,
		fontWeight: 'bold',
		color: colors.background,
	},
	companionDescription: {
		fontSize: 14,
		color: colors.text + '80',
		lineHeight: 20,
	},
	expandedContent: {
		marginTop: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		borderTopColor: colors.text + '20',
		gap: 12,
	},
	personalitySection: {
		gap: 4,
	},
	catchphrasesSection: {
		gap: 4,
	},
	costSection: {
		gap: 4,
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: 'bold',
		color: colors.text,
		textTransform: 'uppercase',
	},
	personalityText: {
		fontSize: 14,
		color: colors.text + '80',
		fontStyle: 'italic',
	},
	catchphrase: {
		fontSize: 14,
		color: colors.text + '80',
		fontStyle: 'italic',
		paddingLeft: 8,
	},
	costText: {
		fontSize: 14,
		color: colors.tint,
		fontWeight: '600',
	},
	recruitButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.tint,
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 8,
		gap: 8,
		marginTop: 8,
	},
	recruitButtonText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: colors.background,
	},
	emptyState: {
		alignItems: 'center',
		padding: 40,
		gap: 12,
	},
	emptyStateText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: colors.text + '80',
		textAlign: 'center',
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: colors.text + '80',
		textAlign: 'center',
	},
	footer: {
		padding: 20,
		borderTopWidth: 1,
		borderTopColor: colors.text + '20',
	},
	footerText: {
		fontSize: 12,
		color: colors.text + '80',
		textAlign: 'center',
	},
});