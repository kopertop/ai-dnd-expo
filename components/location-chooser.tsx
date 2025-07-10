import React, { useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { LOCATIONS } from '../constants/locations';
import { chooserCardConstants, chooserCardStyles } from '../styles/chooser-cards.styles';
import { newGameStyles } from '../styles/new-game.styles';
import { LocationOption } from '../types/location-option';

const { IS_SMALL_SCREEN } = chooserCardConstants;

interface LocationChooserProps {
	onSelect: (location: LocationOption) => void;
	initialLocationId?: string;
}

export const LocationChooser: React.FC<LocationChooserProps> = ({ onSelect, initialLocationId }) => {
	const [customName, setCustomName] = useState('');
	const [customDesc, setCustomDesc] = useState('');
	const [showCustomForm, setShowCustomForm] = useState(false);

	const mainLocations = LOCATIONS.filter(l => !l.isCustom);
	const customLocation = LOCATIONS.find(l => l.isCustom);

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
					<TouchableOpacity style={chooserCardStyles.submitButton} onPress={handleCustomSubmit}>
						<Text style={chooserCardStyles.submitButtonText}>Create Location</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={chooserCardStyles.cardContainer}>
					{IS_SMALL_SCREEN ? (
						mainLocations.map((location) => (
							<View key={location.id} style={chooserCardStyles.singleCardRow}>
								<TouchableOpacity
									style={chooserCardStyles.card}
									onPress={() => handleSelect(location)}
								>
									<Image source={location.image} style={chooserCardStyles.image} resizeMode="cover" />
									<Text style={chooserCardStyles.cardTitle}>{location.name}</Text>
									<Text style={chooserCardStyles.cardDesc}>{location.description}</Text>
								</TouchableOpacity>
							</View>
						))
					) : (
						<View style={chooserCardStyles.cardRow}>
							{mainLocations.map((location) => (
								<TouchableOpacity
									key={location.id}
									style={chooserCardStyles.card}
									onPress={() => handleSelect(location)}
								>
									<Image source={location.image} style={chooserCardStyles.image} resizeMode="cover" />
									<Text style={chooserCardStyles.cardTitle}>{location.name}</Text>
									<Text style={chooserCardStyles.cardDesc}>{location.description}</Text>
								</TouchableOpacity>
							))}
						</View>
					)}
					{customLocation && (
						<View style={chooserCardStyles.customCardRow}>
							<TouchableOpacity
								key={customLocation.id}
								style={[chooserCardStyles.card, chooserCardStyles.customCard]}
								onPress={() => handleSelect(customLocation)}
							>
								<Image source={customLocation.image} style={chooserCardStyles.image} resizeMode="cover" />
								<Text style={chooserCardStyles.cardTitle}>{customLocation.name}</Text>
								<Text style={chooserCardStyles.cardDesc}>{customLocation.description}</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>
			)}
		</ScrollView>
	);
};
