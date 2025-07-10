import React, { useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { RACES } from '../constants/races';
import { chooserCardConstants, chooserCardStyles } from '../styles/chooser-cards.styles';
import { newGameStyles } from '../styles/new-game.styles';
import { RaceOption } from '../types/race-option';

const { IS_SMALL_SCREEN } = chooserCardConstants;

interface RaceChooserProps {
	onSelect: (race: RaceOption) => void;
	initialRaceId?: string;
}

export const RaceChooser: React.FC<RaceChooserProps> = ({ onSelect, initialRaceId }) => {
	const [customName, setCustomName] = useState('');
	const [customDesc, setCustomDesc] = useState('');
	const [showCustomForm, setShowCustomForm] = useState(false);

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

	const mainRaces = RACES.filter(r => !r.isCustom);
	const customRace = RACES.find(r => r.isCustom);

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
					<TouchableOpacity style={chooserCardStyles.submitButton} onPress={handleCustomSubmit}>
						<Text style={chooserCardStyles.submitButtonText}>Create Race</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={chooserCardStyles.cardContainer}>
					{IS_SMALL_SCREEN ? (
						mainRaces.map((race) => (
							<View key={race.id} style={chooserCardStyles.singleCardRow}>
								<TouchableOpacity
									style={chooserCardStyles.card}
									onPress={() => handleSelect(race)}
								>
									<Image source={race.image} style={chooserCardStyles.image} resizeMode="cover" />
									<Text style={chooserCardStyles.cardTitle}>{race.name}</Text>
									<Text style={chooserCardStyles.cardDesc}>{race.description}</Text>
								</TouchableOpacity>
							</View>
						))
					) : (
						<View style={chooserCardStyles.cardRow}>
							{mainRaces.map((race) => (
								<TouchableOpacity
									key={race.id}
									style={chooserCardStyles.card}
									onPress={() => handleSelect(race)}
								>
									<Image source={race.image} style={chooserCardStyles.image} resizeMode="cover" />
									<Text style={chooserCardStyles.cardTitle}>{race.name}</Text>
									<Text style={chooserCardStyles.cardDesc}>{race.description}</Text>
								</TouchableOpacity>
							))}
						</View>
					)}
					{customRace && (
						<View style={chooserCardStyles.customCardRow}>
							<TouchableOpacity
								key={customRace.id}
								style={[chooserCardStyles.card, chooserCardStyles.customCard]}
								onPress={() => handleSelect(customRace)}
							>
								<Image source={customRace.image} style={chooserCardStyles.image} resizeMode="cover" />
								<Text style={chooserCardStyles.cardTitle}>{customRace.name}</Text>
								<Text style={chooserCardStyles.cardDesc}>{customRace.description}</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>
			)}
		</ScrollView>
	);
};
