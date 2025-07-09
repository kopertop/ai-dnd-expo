import React, { useState } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { WORLDS, WorldOption } from '../constants/worlds';
import { newGameStyles } from '../styles/new-game.styles';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_CONTAINER_WIDTH = 1024;
const IS_SMALL_SCREEN = SCREEN_WIDTH < 600;
const CARD_MARGIN = 16;
const CARD_WIDTH = IS_SMALL_SCREEN
	? SCREEN_WIDTH - CARD_MARGIN * 2
	: Math.min(300, (MAX_CONTAINER_WIDTH - CARD_MARGIN * 4) / 3);
const CARD_HEIGHT = CARD_WIDTH * 2; // 1:2 aspect ratio

interface WorldChooserProps {
	onSelect: (world: WorldOption) => void;
	initialWorldId?: string;
}

export const WorldChooser: React.FC<WorldChooserProps> = ({ onSelect, initialWorldId }) => {
	const [customName, setCustomName] = useState('');
	const [customDesc, setCustomDesc] = useState('');
	const [showCustomForm, setShowCustomForm] = useState(false);

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

	const mainWorlds = WORLDS.filter(w => !w.isCustom);
	const customWorld = WORLDS.find(w => w.isCustom);

	return (
		<ScrollView contentContainerStyle={newGameStyles.scrollViewContent}>
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
					<TouchableOpacity style={styles.submitButton} onPress={handleCustomSubmit}>
						<Text style={styles.submitButtonText}>Create World</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.cardContainer}>
					{IS_SMALL_SCREEN ? (
						mainWorlds.map((world) => (
							<View key={world.id} style={styles.singleCardRow}>
								<TouchableOpacity
									style={styles.card}
									onPress={() => handleSelect(world)}
								>
									<Image source={world.image} style={styles.image} resizeMode="cover" />
									<Text style={styles.cardTitle}>{world.name}</Text>
									<Text style={styles.cardDesc}>{world.description}</Text>
								</TouchableOpacity>
							</View>
						))
					) : (
						<View style={styles.cardRow}>
							{mainWorlds.map((world) => (
								<TouchableOpacity
									key={world.id}
									style={styles.card}
									onPress={() => handleSelect(world)}
								>
									<Image source={world.image} style={styles.image} resizeMode="cover" />
									<Text style={styles.cardTitle}>{world.name}</Text>
									<Text style={styles.cardDesc}>{world.description}</Text>
								</TouchableOpacity>
							))}
						</View>
					)}
					{customWorld && (
						<View style={styles.customCardRow}>
							<TouchableOpacity
								key={customWorld.id}
								style={[styles.card, styles.customCard]}
								onPress={() => handleSelect(customWorld)}
							>
								<Image source={customWorld.image} style={styles.image} resizeMode="cover" />
								<Text style={styles.cardTitle}>{customWorld.name}</Text>
								<Text style={styles.cardDesc}>{customWorld.description}</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>
			)}
		</ScrollView>
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
