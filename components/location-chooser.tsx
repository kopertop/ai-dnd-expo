import React, { useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { LOCATIONS } from '@/constants/locations';
import {
	CARD_GAP,
	cardGridStyles,
	getCardsPerRow,
	getContainerWidth,
	SCREEN_WIDTH,
} from '../styles/card-grid.styles';
import { newGameStyles } from '../styles/new-game.styles';
import { LocationOption } from '@/types/location-option';

interface LocationChooserProps {
	onSelect: (location: LocationOption) => void;
}

export const LocationChooser: React.FC<LocationChooserProps> = ({ onSelect }) => {
	const [customName, setCustomName] = useState('');
	const [customDesc, setCustomDesc] = useState('');
	const [showCustomForm, setShowCustomForm] = useState(false);

	// 1:1 aspect ratio for location cards
	const width = SCREEN_WIDTH;
	const cardsPerRow = getCardsPerRow(width);
	const containerWidth = getContainerWidth(width);
	const cardWidth = Math.floor((containerWidth - CARD_GAP * (cardsPerRow + 1)) / cardsPerRow);
	const cardHeight = cardWidth; // 1:1 aspect ratio
	const styles = cardGridStyles(width);

	const handleSelect = (location: LocationOption) => {
		if (location.isCustom) {
			setShowCustomForm(true);
		} else {
			onSelect(location);
		}
	};

	const handleCustomSubmit = () => {
		if (customName.trim() && customDesc.trim()) {
			onSelect({
				id: 'custom',
				name: customName,
				description: customDesc,
				image: require('../assets/images/locations/custom.png'),
				isCustom: true,
			});
		}
	};

	const allLocations = [
		...LOCATIONS.filter(l => !l.isCustom),
		...LOCATIONS.filter(l => l.isCustom),
	];

	return (
		<ScrollView contentContainerStyle={newGameStyles.scrollViewContent}>
			<Text style={newGameStyles.title}>Choose Your Starting Location</Text>
			{showCustomForm ? (
				<View style={newGameStyles.sectionBox}>
					<Text style={newGameStyles.label}>Location Name</Text>
					<TextInput
						style={newGameStyles.input}
						placeholder="Enter location name"
						value={customName}
						onChangeText={setCustomName}
					/>
					<Text style={newGameStyles.label}>Description</Text>
					<TextInput
						style={[newGameStyles.input, newGameStyles.textArea]}
						placeholder="Describe your location"
						value={customDesc}
						onChangeText={setCustomDesc}
						multiline
						numberOfLines={3}
					/>
					<TouchableOpacity
						style={newGameStyles.submitButton}
						onPress={handleCustomSubmit}
					>
						<Text style={newGameStyles.submitButtonText}>Create Location</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.cardContainer}>
					{allLocations.map(location => (
						<TouchableOpacity
							key={location.id}
							style={[styles.card, { width: cardWidth, height: cardHeight }]}
							onPress={() => handleSelect(location)}
						>
							<View style={styles.imageWrapper}>
								<Image
									source={location.image}
									style={[styles.image, { width: '100%', height: '100%' }]}
									resizeMode="cover"
								/>
								<View style={styles.overlay}>
									<Text style={styles.cardTitle}>{location.name}</Text>
									<Text style={styles.cardDesc}>{location.description}</Text>
								</View>
							</View>
						</TouchableOpacity>
					))}
				</View>
			)}
		</ScrollView>
	);
};
