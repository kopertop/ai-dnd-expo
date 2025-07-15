import React, { useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { WORLDS } from '../constants/worlds';
import { cardGridStyles, SCREEN_WIDTH } from '../styles/card-grid.styles';
import { newGameStyles } from '../styles/new-game.styles';
import { WorldOption } from '../types/world-option';

interface WorldChooserProps {
	onSelect: (world: WorldOption) => void;
}

export const WorldChooser: React.FC<WorldChooserProps> = ({ onSelect }) => {
	const [customName, setCustomName] = useState('');
	const [customDesc, setCustomDesc] = useState('');
	const [showCustomForm, setShowCustomForm] = useState(false);

	const styles = cardGridStyles(SCREEN_WIDTH);

	const handleSelect = (world: WorldOption) => {
		if (world.isCustom) {
			setShowCustomForm(true);
		} else {
			onSelect(world);
		}
	};

	const handleCustomSubmit = () => {
		if (customName.trim() && customDesc.trim()) {
			onSelect({
				id: 'custom',
				name: customName,
				description: customDesc,
				image: require('../assets/images/worlds/custom.png'),
				isCustom: true,
			});
		}
	};

	return (
		<ScrollView
			contentContainerStyle={[
				newGameStyles.scrollViewContent,
				newGameStyles.scrollViewContentMobile,
			]}
		>
			<Text style={newGameStyles.title}>Choose Your World</Text>
			{showCustomForm ? (
				<View style={newGameStyles.sectionBox}>
					<Text style={newGameStyles.label}>World Name</Text>
					<TextInput
						style={newGameStyles.input}
						placeholder="Enter world name"
						value={customName}
						onChangeText={setCustomName}
					/>
					<Text style={newGameStyles.label}>Description</Text>
					<TextInput
						style={[newGameStyles.input, newGameStyles.textArea]}
						placeholder="Describe your world"
						value={customDesc}
						onChangeText={setCustomDesc}
						multiline
						numberOfLines={3}
					/>
					<TouchableOpacity
						style={newGameStyles.submitButton}
						onPress={handleCustomSubmit}
					>
						<Text style={newGameStyles.submitButtonText}>Create World</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.cardContainer}>
					{[...WORLDS.filter(w => !w.isCustom), ...WORLDS.filter(w => w.isCustom)].map(
						world => (
							<TouchableOpacity
								key={world.id}
								style={styles.card}
								onPress={() => handleSelect(world)}
							>
								<View style={styles.imageWrapper}>
									<Image
										source={world.image}
										style={styles.image}
										resizeMode="cover"
									/>
									<View style={styles.overlay}>
										<Text style={styles.cardTitle}>{world.name}</Text>
										<Text style={styles.cardDesc}>{world.description}</Text>
									</View>
								</View>
							</TouchableOpacity>
						),
					)}
				</View>
			)}
		</ScrollView>
	);
};
