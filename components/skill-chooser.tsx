import React, { useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SKILL_LIST } from '../constants/skills';
import { CARD_GAP, cardGridStyles, getCardsPerRow, getContainerWidth, SCREEN_WIDTH } from '../styles/card-grid.styles';
import { newGameStyles } from '../styles/new-game.styles';
import { Skill } from '../types/skill';

interface SkillChooserProps {
	onSelect: (skills: Skill[]) => void;
	initialSkills?: Skill[];
	maxSkills?: number;
}

const DEFAULT_MAX_SKILLS = 4;

export const SkillChooser: React.FC<SkillChooserProps> = ({ onSelect, initialSkills = [], maxSkills = DEFAULT_MAX_SKILLS }) => {
	const [selected, setSelected] = useState<string[]>(initialSkills.map(s => s.id));

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
	const selectedSkills = selected.map(id => SKILL_LIST.find(skill => skill.id === id)).filter(Boolean) as Skill[];
	const emptySlots = maxSkills - selectedSkills.length;
	const unselectedSkills = SKILL_LIST.filter(skill => !selected.includes(skill.id));

	return (
		<SafeAreaView style={{
			flex: 1,
			position: 'absolute',
			height: '100%',
			width: '100%',
		}} edges={['left', 'right', 'bottom']}>
			<View style={{
				position: 'absolute',
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: selected.length === maxSkills
					? 'rgba(255,255,255,0.95)'
					: 'red',
				padding: 0,
				margin: 0,
				alignItems: 'center',
				borderColor: '#eee',
				zIndex: 100,
			}}>
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
				<ScrollView contentContainerStyle={[newGameStyles.scrollViewContent, { paddingBottom: 96 }]} keyboardShouldPersistTaps="handled">
					<Text style={newGameStyles.title}>Choose {maxSkills} Skills</Text>
					{/* Top slots */}
					<View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24, width: containerWidth, alignSelf: 'center' }}>
						{selectedSkills.map((skill) => (
							<TouchableOpacity
								key={skill.id}
								style={[styles.card, { width: topSlotWidth, height: topSlotHeight, borderColor: '#C9B037', borderWidth: 4, marginHorizontal: CARD_GAP / 2 }]}
								onPress={() => handleSelect(skill.id)}
							>
								<View style={styles.imageWrapper}>
									<Image source={skill.image} style={[styles.image, { width: '100%', height: '100%' }]} resizeMode="cover" />
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
								style={[styles.card, { width: cardWidth, height: cardHeight, borderColor: styles.card.borderColor, borderWidth: styles.card.borderWidth }]}
								onPress={() => handleSelect(skill.id)}
							>
								<View style={styles.imageWrapper}>
									<Image source={skill.image} style={[styles.image, { width: '100%', height: '100%' }]} resizeMode="cover" />
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
		</SafeAreaView>
	);
};
