import React, { useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { RACES } from '@/constants/races';
import {
	CARD_GAP,
	cardGridStyles,
	getCardsPerRow,
	getContainerWidth,
	SCREEN_WIDTH,
} from '../styles/card-grid.styles';
import { newGameStyles } from '../styles/new-game.styles';
import { RaceOption } from '@/types/race-option';

interface RaceChooserProps {
	onSelect: (race: RaceOption) => void;
}

export const RaceChooser: React.FC<RaceChooserProps> = ({ onSelect }) => {
	const [customName, setCustomName] = useState('');
	const [customDesc, setCustomDesc] = useState('');
	const [showCustomForm, setShowCustomForm] = useState(false);

	// 1:1 aspect ratio for race cards
	const width = SCREEN_WIDTH;
	const cardsPerRow = getCardsPerRow(width);
	const containerWidth = getContainerWidth(width);
	const cardWidth = Math.floor((containerWidth - CARD_GAP * (cardsPerRow + 1)) / cardsPerRow);
	const cardHeight = cardWidth; // 1:1 aspect ratio
	const styles = cardGridStyles(width);

	const handleSelect = (race: RaceOption) => {
		if (race.isCustom) {
			setShowCustomForm(true);
		} else {
			onSelect(race);
		}
	};

	const handleCustomSubmit = () => {
		if (customName.trim() && customDesc.trim()) {
			onSelect({
				id: 'custom',
				name: customName,
				description: customDesc,
				image: require('../assets/images/custom.png'),
				isCustom: true,
			});
		}
	};

	const allRaces = [...RACES.filter(r => !r.isCustom), ...RACES.filter(r => r.isCustom)];

	return (
		<ScrollView contentContainerStyle={newGameStyles.scrollViewContent}>
			<Text style={newGameStyles.title}>Choose Your Race</Text>
			{showCustomForm ? (
				<View style={newGameStyles.sectionBox}>
					<Text style={newGameStyles.label}>Race Name</Text>
					<TextInput
						style={newGameStyles.input}
						placeholder="Enter race name"
						value={customName}
						onChangeText={setCustomName}
					/>
					<Text style={newGameStyles.label}>Description</Text>
					<TextInput
						style={[newGameStyles.input, newGameStyles.textArea]}
						placeholder="Describe your race"
						value={customDesc}
						onChangeText={setCustomDesc}
						multiline
						numberOfLines={3}
					/>
					<TouchableOpacity
						style={newGameStyles.submitButton}
						onPress={handleCustomSubmit}
					>
						<Text style={newGameStyles.submitButtonText}>Create Race</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.cardContainer}>
					{allRaces.map(race => (
						<TouchableOpacity
							key={race.id}
							style={[styles.card, { width: cardWidth, height: cardHeight }]}
							onPress={() => handleSelect(race)}
						>
							<View style={styles.imageWrapper}>
								<Image
									source={race.image}
									style={[styles.image, { width: '100%', height: '100%' }]}
									resizeMode="cover"
								/>
								<View style={styles.overlay}>
									<Text style={styles.cardTitle}>{race.name}</Text>
									<Text style={styles.cardDesc}>{race.description}</Text>
								</View>
							</View>
						</TouchableOpacity>
					))}
				</View>
			)}
		</ScrollView>
	);
};
