import React, { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { RACES, RaceOption } from '../constants/races';
import { newGameStyles } from '../styles/new-game.styles';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_CONTAINER_WIDTH = 1024;
const IS_SMALL_SCREEN = SCREEN_WIDTH < 600;
const CARD_MARGIN = 16;
const CARD_WIDTH = IS_SMALL_SCREEN
	? SCREEN_WIDTH - CARD_MARGIN * 2
	: Math.min(280, (MAX_CONTAINER_WIDTH - CARD_MARGIN * 6) / 4);
const CARD_HEIGHT = CARD_WIDTH * 1.4;

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
					<TouchableOpacity style={styles.submitButton} onPress={handleCustomSubmit}>
						<Text style={styles.submitButtonText}>Create Race</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.cardContainer}>
					{IS_SMALL_SCREEN ? (
						mainRaces.map((race) => (
							<View key={race.id} style={styles.singleCardRow}>
								<TouchableOpacity
									style={styles.card}
									onPress={() => handleSelect(race)}
								>
									<Image source={race.image} style={styles.image} resizeMode="cover" />
									<Text style={styles.cardTitle}>{race.name}</Text>
									<Text style={styles.cardDesc}>{race.description}</Text>
								</TouchableOpacity>
							</View>
						))
					) : (
						<View style={styles.cardRow}>
							{mainRaces.map((race) => (
								<TouchableOpacity
									key={race.id}
									style={styles.card}
									onPress={() => handleSelect(race)}
								>
									<Image source={race.image} style={styles.image} resizeMode="cover" />
									<Text style={styles.cardTitle}>{race.name}</Text>
									<Text style={styles.cardDesc}>{race.description}</Text>
								</TouchableOpacity>
							))}
						</View>
					)}
					{customRace && (
						<View style={styles.customCardRow}>
							<TouchableOpacity
								key={customRace.id}
								style={[styles.card, styles.customCard]}
								onPress={() => handleSelect(customRace)}
							>
								<Image source={customRace.image} style={styles.image} resizeMode="cover" />
								<Text style={styles.cardTitle}>{customRace.name}</Text>
								<Text style={styles.cardDesc}>{customRace.description}</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>
			)}
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	cardContainer: {
		width: IS_SMALL_SCREEN ? '100%' : MAX_CONTAINER_WIDTH,
		maxWidth: MAX_CONTAINER_WIDTH,
		alignSelf: 'center',
	},
	singleCardRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginBottom: 24,
	},
	cardRow: {
		flexDirection: 'row',
		alignItems: 'stretch',
		justifyContent: 'center',
		marginBottom: 24,
		flexWrap: 'wrap',
	},
	customCardRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	card: {
		width: CARD_WIDTH,
		backgroundColor: '#F9F6EF',
		borderWidth: 2,
		borderColor: '#8B5C2A',
		borderRadius: 14,
		marginHorizontal: IS_SMALL_SCREEN ? 0 : CARD_MARGIN / 2,
		marginBottom: IS_SMALL_SCREEN ? 0 : 10,
		padding: 0,
		alignItems: 'center',
		shadowColor: '#8B5C2A',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.12,
		shadowRadius: 6,
		display: 'flex',
		flexDirection: 'column',
		flex: 1,
	},
	customCard: {
		marginTop: 0,
		marginBottom: 0,
	},
	image: {
		width: '100%',
		height: CARD_HEIGHT,
		borderTopLeftRadius: 14,
		borderTopRightRadius: 14,
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
		marginBottom: 0,
		backgroundColor: '#E2D3B3',
	},
	cardTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#8B2323',
		marginTop: 10,
		marginBottom: 6,
	},
	cardDesc: {
		fontSize: 14,
		color: '#3B2F1B',
		textAlign: 'center',
		paddingHorizontal: 8,
		marginBottom: 12,
	},
	submitButton: {
		backgroundColor: '#C9B037',
		paddingVertical: 10,
		paddingHorizontal: 24,
		borderRadius: 8,
		marginTop: 8,
	},
	submitButtonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
});