import React, { useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { CLASSES } from '../constants/classes';
import { CARD_GAP, cardGridStyles, getCardsPerRow, getContainerWidth, SCREEN_WIDTH } from '../styles/card-grid.styles';
import { newGameStyles } from '../styles/new-game.styles';
import { ClassOption } from '../types/class-option';

interface ClassChooserProps {
	onSelect: (classOption: ClassOption) => void;
	initialClassId?: string;
}

export const ClassChooser: React.FC<ClassChooserProps> = ({ onSelect, initialClassId }) => {
	const [customName, setCustomName] = useState('');
	const [customDesc, setCustomDesc] = useState('');
	const [showCustomForm, setShowCustomForm] = useState(false);

	// 1:1 aspect ratio for class cards
	const width = SCREEN_WIDTH;
	const cardsPerRow = getCardsPerRow(width);
	const containerWidth = getContainerWidth(width);
	const cardWidth = Math.floor((containerWidth - CARD_GAP * (cardsPerRow + 1)) / cardsPerRow);
	const cardHeight = cardWidth; // 1:1 aspect ratio
	const styles = cardGridStyles(width);

	const handleSelect = (classOption: ClassOption) => {
		if (classOption.isCustom) {
			setShowCustomForm(true);
		} else {
			onSelect(classOption);
		}
	};

	const handleCustomSubmit = () => {
		if (customName.trim() && customDesc.trim()) {
			onSelect({
				...CLASSES[CLASSES.length - 1],
				id: 'custom',
				name: customName,
				description: customDesc,
				isCustom: true,
			});
		}
	};

	const allClasses = [...CLASSES.filter(c => !c.isCustom), ...CLASSES.filter(c => c.isCustom)];

	return (
		<ScrollView contentContainerStyle={newGameStyles.scrollViewContent}>
			<Text style={newGameStyles.title}>Choose Your Class</Text>
			{showCustomForm ? (
				<View style={newGameStyles.sectionBox}>
					<Text style={newGameStyles.label}>Class Name</Text>
					<TextInput
						style={newGameStyles.input}
						placeholder="Enter class name"
						value={customName}
						onChangeText={setCustomName}
					/>
					<Text style={newGameStyles.label}>Description</Text>
					<TextInput
						style={[newGameStyles.input, newGameStyles.textArea]}
						placeholder="Describe your class"
						value={customDesc}
						onChangeText={setCustomDesc}
						multiline
						numberOfLines={3}
					/>
					<TouchableOpacity style={newGameStyles.submitButton} onPress={handleCustomSubmit}>
						<Text style={newGameStyles.submitButtonText}>Create Class</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.cardContainer}>
					{allClasses.map((classOption) => (
						<TouchableOpacity
							key={classOption.id}
							style={[styles.card, { width: cardWidth, height: cardHeight }]}
							onPress={() => handleSelect(classOption)}
						>
							<View style={styles.imageWrapper}>
								<Image source={classOption.image} style={[styles.image, { width: '100%', height: '100%' }]} resizeMode="cover" />
								<View style={styles.overlay}>
									<Text style={styles.cardTitle}>{classOption.name}</Text>
									<Text style={styles.cardDesc}>{classOption.description}</Text>
								</View>
							</View>
						</TouchableOpacity>
					))}
				</View>
			)}
		</ScrollView>
	);
};
