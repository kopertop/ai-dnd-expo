import React, { useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import {
	CARD_GAP,
	cardGridStyles,
	getCardsPerRow,
	getContainerWidth,
	SCREEN_WIDTH,
} from '../styles/card-grid.styles';
import { newGameStyles } from '../styles/new-game.styles';

import { TRAITS } from '@/constants/traits';
import { TraitOption } from '@/types/trait-option';

interface TraitChooserProps {
	onSelect: (trait: TraitOption) => void;
}

export const TraitChooser: React.FC<TraitChooserProps> = ({ onSelect }) => {
	const [customName, setCustomName] = useState('');
	const [customDesc, setCustomDesc] = useState('');
	const [showCustomForm, setShowCustomForm] = useState(false);

	// 1:1 aspect ratio for trait cards
	const width = SCREEN_WIDTH;
	const cardsPerRow = getCardsPerRow(width);
	const containerWidth = getContainerWidth(width);
	const cardWidth = Math.floor((containerWidth - CARD_GAP * (cardsPerRow + 1)) / cardsPerRow);
	const cardHeight = cardWidth; // 1:1 aspect ratio
	const styles = cardGridStyles(width);

	const handleSelect = (trait: TraitOption) => {
		if (trait.isCustom) {
			setShowCustomForm(true);
		} else {
			onSelect(trait);
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

	const allTraits = [...TRAITS.filter(t => !t.isCustom), ...TRAITS.filter(t => t.isCustom)];

	return (
		<ScrollView contentContainerStyle={newGameStyles.scrollViewContent}>
			<Text style={newGameStyles.title}>Choose Your Trait</Text>
			{showCustomForm ? (
				<View style={newGameStyles.sectionBox}>
					<Text style={newGameStyles.label}>Trait Name</Text>
					<TextInput
						style={newGameStyles.input}
						placeholder="Enter trait name"
						value={customName}
						onChangeText={setCustomName}
					/>
					<Text style={newGameStyles.label}>Description</Text>
					<TextInput
						style={[newGameStyles.input, newGameStyles.textArea]}
						placeholder="Describe your trait"
						value={customDesc}
						onChangeText={setCustomDesc}
						multiline
						numberOfLines={3}
					/>
					<TouchableOpacity
						style={newGameStyles.submitButton}
						onPress={handleCustomSubmit}
					>
						<Text style={newGameStyles.submitButtonText}>Create Trait</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.cardContainer}>
					{allTraits.map(trait => (
						<TouchableOpacity
							key={trait.id}
							style={[styles.card, { width: cardWidth, height: cardHeight }]}
							onPress={() => handleSelect(trait)}
						>
							<View style={styles.imageWrapper}>
								<Image
									source={trait.image}
									style={[styles.image, { width: '100%', height: '100%' }]}
									resizeMode="cover"
								/>
								<View style={styles.overlay}>
									<Text style={styles.cardTitle}>{trait.name}</Text>
									<Text style={styles.cardDesc}>{trait.description}</Text>
									{trait.action && (
										<Text style={[styles.cardDesc, { fontSize: 12, marginTop: 4 }]}>
											Action: {trait.action.name}
										</Text>
									)}
								</View>
							</View>
						</TouchableOpacity>
					))}
				</View>
			)}
		</ScrollView>
	);
};
