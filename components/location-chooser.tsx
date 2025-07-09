import React, { useState } from 'react';
import { Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { LOCATIONS, LocationOption } from '../constants/locations';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_CONTAINER_WIDTH = 1024;
const IS_SMALL_SCREEN = SCREEN_WIDTH < 600;
const CARDS_PER_ROW = 5;
const CARD_MARGIN = 16;
const CARD_CONTAINER_WIDTH = IS_SMALL_SCREEN ? SCREEN_WIDTH : MAX_CONTAINER_WIDTH;
const CARD_WIDTH = IS_SMALL_SCREEN
	? SCREEN_WIDTH - CARD_MARGIN * 2
	: Math.floor((CARD_CONTAINER_WIDTH - CARD_MARGIN * (CARDS_PER_ROW + 1)) / CARDS_PER_ROW);
const CARD_HEIGHT = CARD_WIDTH; // 1:1 aspect ratio

interface LocationChooserProps {
	visible: boolean;
	onSelect: (location: LocationOption) => void;
	initialLocationId?: string;
}

export const LocationChooser: React.FC<LocationChooserProps> = ({ visible, onSelect, initialLocationId }) => {
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
		<Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
			<View style={styles.container}>
				<Text style={styles.title}>Choose Your Starting Location</Text>
				{showCustomForm ? (
					<View style={styles.customForm}>
						<Text style={styles.label}>Location Name</Text>
						<TextInput
							style={styles.input}
							placeholder="Enter location name"
							value={customName}
							onChangeText={setCustomName}
						/>
						<Text style={styles.label}>Description</Text>
						<TextInput
							style={[styles.input, styles.textArea]}
							placeholder="Describe your location"
							value={customDesc}
							onChangeText={setCustomDesc}
							multiline
							numberOfLines={3}
						/>
						<TouchableOpacity style={styles.submitButton} onPress={handleCustomSubmit}>
							<Text style={styles.submitButtonText}>Create Location</Text>
						</TouchableOpacity>
					</View>
				) : (
					<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
						<View style={styles.cardContainer}>
							{IS_SMALL_SCREEN ? (
								mainLocations.map((location) => (
									<View key={location.id} style={styles.singleCardRow}>
										<TouchableOpacity
											style={styles.card}
											onPress={() => handleSelect(location)}
										>
											<Image source={location.image} style={styles.image} resizeMode="cover" />
											<Text style={styles.cardTitle}>{location.name}</Text>
											<Text style={styles.cardDesc}>{location.description}</Text>
										</TouchableOpacity>
									</View>
								))
							) : (
								<View style={styles.cardRow}>
									{mainLocations.map((location) => (
										<TouchableOpacity
											key={location.id}
											style={styles.card}
											onPress={() => handleSelect(location)}
										>
											<Image source={location.image} style={styles.image} resizeMode="cover" />
											<Text style={styles.cardTitle}>{location.name}</Text>
											<Text style={styles.cardDesc}>{location.description}</Text>
										</TouchableOpacity>
									))}
								</View>
							)}
							{customLocation && (
								<View style={styles.customCardRow}>
									<TouchableOpacity
										key={customLocation.id}
										style={[styles.card, styles.customCard]}
										onPress={() => handleSelect(customLocation)}
									>
										<Image source={customLocation.image} style={styles.image} resizeMode="cover" />
										<Text style={styles.cardTitle}>{customLocation.name}</Text>
										<Text style={styles.cardDesc}>{customLocation.description}</Text>
									</TouchableOpacity>
								</View>
							)}
						</View>
					</ScrollView>
				)}
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F5ECD6',
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 48,
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		marginBottom: 24,
		color: '#8B2323',
	},
	scrollContent: {
		alignItems: 'center',
		justifyContent: 'flex-start',
		paddingBottom: 32,
	},
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
		marginBottom: IS_SMALL_SCREEN ? 0 : 0,
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
	customForm: {
		width: 300,
		backgroundColor: '#F9F6EF',
		borderWidth: 2,
		borderColor: '#8B5C2A',
		borderRadius: 14,
		padding: 20,
		alignItems: 'center',
	},
	label: {
		fontSize: 16,
		color: '#8B2323',
		marginBottom: 4,
		alignSelf: 'flex-start',
	},
	input: {
		width: '100%',
		height: 40,
		borderColor: '#8B5C2A',
		borderWidth: 1,
		borderRadius: 8,
		backgroundColor: '#F5ECD6',
		fontSize: 16,
		color: '#3B2F1B',
		marginBottom: 12,
		paddingHorizontal: 8,
	},
	textArea: {
		height: 70,
		textAlignVertical: 'top',
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
