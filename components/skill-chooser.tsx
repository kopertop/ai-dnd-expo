import React, { useMemo, useState } from 'react';
import { Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

import {
	CARD_GAP,
	cardGridStyles,
	getCardsPerRow,
	getContainerWidth,
	SCREEN_WIDTH,
} from '../styles/card-grid.styles';
import { newGameStyles } from '../styles/new-game.styles';

import { SKILL_DESCRIPTIONS, SKILL_LIST } from '@/constants/skills';
import { Skill } from '@/types/skill';
import { StatBlock } from '@/types/stats';

interface SkillChooserProps {
	onSelect: (skills: Skill[]) => void;
	initialSkills?: Skill[];
	maxSkills?: number;
	stats?: StatBlock | null; // Character stats for sorting suggested skills
}

const DEFAULT_MAX_SKILLS = 4;

export const SkillChooser: React.FC<SkillChooserProps> = ({
	onSelect,
	initialSkills = [],
	maxSkills = DEFAULT_MAX_SKILLS,
	stats,
}) => {
	const [selected, setSelected] = useState<string[]>(initialSkills.map(s => s.id));
	const [infoSkill, setInfoSkill] = useState<string | null>(null);

	// Sort skills to prioritize those based on higher stats
	const sortedSkills = useMemo(() => {
		if (!stats) return SKILL_LIST;

		return [...SKILL_LIST].sort((a, b) => {
			const aStat = stats[a.ability as keyof StatBlock] || 10;
			const bStat = stats[b.ability as keyof StatBlock] || 10;
			// Higher stat value = higher priority (appears first)
			return bStat - aStat;
		});
	}, [stats]);

	const width = SCREEN_WIDTH;
	const cardsPerRow = getCardsPerRow(width);
	const containerWidth = getContainerWidth(width);
	const cardWidth = Math.floor((containerWidth - CARD_GAP * (cardsPerRow + 1)) / cardsPerRow);
	const cardHeight = cardWidth; // 1:1 aspect ratio
	const styles = cardGridStyles(width);

	// Always show 4 slots at the top, so calculate their width to fit 4 per row
	const topSlotWidth = Math.floor((containerWidth - CARD_GAP * 5) / 4);
	const topSlotHeight = topSlotWidth; // 1:1 aspect ratio

	const handleSelect = (id: string) => {
		if (selected.includes(id)) {
			// Deselect: remove from selected
			setSelected(prev => prev.filter(s => s !== id));
		} else if (selected.length < maxSkills) {
			// Select: add to next available slot
			setSelected(prev => [...prev, id]);
		}
	};

	const handleConfirm = () => {
		const selectedSkills = SKILL_LIST.filter(skill => selected.includes(skill.id));
		onSelect(selectedSkills);
	};

	// Top slots: show selected skills in order, or empty slots
	const selectedSkills = selected
		.map(id => SKILL_LIST.find(skill => skill.id === id))
		.filter(Boolean) as Skill[];
	const emptySlots = maxSkills - selectedSkills.length;
	// Use sorted skills for unselected, maintaining the suggested order
	const unselectedSkills = sortedSkills.filter(skill => !selected.includes(skill.id));

	return (
		<SafeAreaView
			style={{
				flex: 1,
				position: 'absolute',
				height: '100%',
				width: '100%',
			}}
			edges={['left', 'right', 'bottom']}
		>
			<View
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					bottom: 0,
					backgroundColor:
						selected.length === maxSkills ? 'rgba(255,255,255,0.95)' : 'red',
					padding: 0,
					margin: 0,
					alignItems: 'center',
					borderColor: '#eee',
					zIndex: 100,
				}}
			>
				<TouchableOpacity
					style={[
						selected.length === maxSkills
							? newGameStyles.submitButton
							: newGameStyles.submitButtonDisabled,
						{
							width: '100%',
							margin: 0,
							opacity: 1,
							borderRadius: 0,
							borderTopLeftRadius: 0,
							borderTopRightRadius: 0,
						},
					]}
					disabled={selected.length !== maxSkills}
					onPress={handleConfirm}
				>
					<Text style={newGameStyles.submitButtonText}>Confirm Skills</Text>
				</TouchableOpacity>
			</View>

			<View style={{ flex: 1, position: 'relative' }}>
				<ScrollView
					contentContainerStyle={[newGameStyles.scrollViewContent, { paddingBottom: 96 }]}
					keyboardShouldPersistTaps="handled"
				>
					<Text style={newGameStyles.title}>Choose {maxSkills} Skills</Text>
					{/* Top slots */}
					<View
						style={{
							flexDirection: 'row',
							justifyContent: 'center',
							marginBottom: 24,
							width: containerWidth,
							alignSelf: 'center',
						}}
					>
						{selectedSkills.map(skill => (
							<TouchableOpacity
								key={skill.id}
								style={[
									styles.card,
									{
										width: topSlotWidth,
										height: topSlotHeight,
										borderColor: '#C9B037',
										borderWidth: 4,
										marginHorizontal: CARD_GAP / 2,
									},
								]}
								onPress={() => handleSelect(skill.id)}
							>
								<View style={styles.imageWrapper}>
									<Image
										source={skill.image}
										style={[styles.image, { width: '100%', height: '100%' }]}
										resizeMode="cover"
									/>
									<View style={styles.overlay}>
										<Text style={styles.cardTitle}>{skill.name}</Text>
										<Text style={styles.cardDesc}>{skill.ability}</Text>
									</View>
								</View>
							</TouchableOpacity>
						))}
						{[...Array(emptySlots)].map((_, idx) => (
							<View
								key={`empty-${idx}`}
								style={{
									width: topSlotWidth,
									height: topSlotHeight,
									marginHorizontal: CARD_GAP / 2,
									borderWidth: 2,
									borderColor: '#bbb',
									borderRadius: 14,
									backgroundColor: '#f5f5f5',
									alignItems: 'center',
									justifyContent: 'center',
									opacity: 0.5,
								}}
							>
								<Text style={{ color: '#bbb', fontSize: 18 }}>Empty</Text>
							</View>
						))}
					</View>
					{/* Unselected skills grid */}
					<View style={styles.cardContainer}>
						{unselectedSkills.map(skill => (
							<TouchableOpacity
								key={skill.id}
								style={[
									styles.card,
									{
										width: cardWidth,
										height: cardHeight,
										borderColor: styles.card.borderColor,
										borderWidth: styles.card.borderWidth,
										position: 'relative',
									},
								]}
								onPress={() => handleSelect(skill.id)}
							>
								<TouchableOpacity
									style={skillChooserStyles.infoButton}
									onPress={(e) => {
										e.stopPropagation();
										setInfoSkill(infoSkill === skill.id ? null : skill.id);
									}}
								>
									<Text style={skillChooserStyles.infoButtonText}>?</Text>
								</TouchableOpacity>
								<View style={styles.imageWrapper}>
									<Image
										source={skill.image}
										style={[styles.image, { width: '100%', height: '100%' }]}
										resizeMode="cover"
									/>
									<View style={styles.overlay}>
										<Text style={styles.cardTitle}>{skill.name}</Text>
										<Text style={styles.cardDesc}>{skill.ability}</Text>
									</View>
								</View>
							</TouchableOpacity>
						))}
					</View>
				</ScrollView>
			</View>
			{/* Skill Info Modal */}
			<Modal
				visible={infoSkill !== null}
				transparent
				animationType="fade"
				onRequestClose={() => setInfoSkill(null)}
			>
				<TouchableOpacity
					style={skillChooserStyles.modalOverlay}
					activeOpacity={1}
					onPress={() => setInfoSkill(null)}
				>
					<View style={skillChooserStyles.modalContent} onStartShouldSetResponder={() => true}>
						{infoSkill && (() => {
							const skill = SKILL_LIST.find(s => s.id === infoSkill);
							if (!skill) return null;
							return (
								<>
									<View style={skillChooserStyles.modalHeader}>
										<Text style={skillChooserStyles.modalTitle}>{skill.name}</Text>
										<TouchableOpacity
											style={skillChooserStyles.modalCloseButton}
											onPress={() => setInfoSkill(null)}
										>
											<Text style={skillChooserStyles.modalCloseText}>✕</Text>
										</TouchableOpacity>
									</View>
									<Text style={skillChooserStyles.modalDescription}>
										{SKILL_DESCRIPTIONS[skill.id] || 'No description available.'}
									</Text>
									<Text style={skillChooserStyles.modalSubtext}>Uses: {skill.ability}</Text>
								</>
							);
						})()}
					</View>
				</TouchableOpacity>
			</Modal>
		</SafeAreaView>
	);
};

const skillChooserStyles = StyleSheet.create({
	infoButton: {
		position: 'absolute',
		top: 8,
		right: 8,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: 'rgba(59, 47, 27, 0.8)',
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#3B2F1B',
		zIndex: 10,
	},
	infoButtonText: {
		color: '#FFF8E1',
		fontSize: 16,
		fontWeight: 'bold',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: '#F9F6EF',
		borderRadius: 12,
		padding: 20,
		margin: 20,
		maxWidth: 400,
		borderWidth: 2,
		borderColor: '#C9B037',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	modalTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#3B2F1B',
	},
	modalCloseButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#D4BC8B',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalCloseText: {
		fontSize: 18,
		color: '#3B2F1B',
		fontWeight: 'bold',
	},
	modalDescription: {
		fontSize: 16,
		color: '#3B2F1B',
		lineHeight: 24,
	},
	modalSubtext: {
		fontSize: 14,
		color: '#8B7355',
		marginTop: 8,
		fontStyle: 'italic',
	},
});
