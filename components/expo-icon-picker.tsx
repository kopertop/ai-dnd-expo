import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ExpoIcon } from '@/components/expo-icon';
import { ThemedText } from '@/components/themed-text';

interface ExpoIconPickerProps {
	value?: string;
	onChange: (icon: string) => void;
	label?: string;
}

// Common D&D-themed icons organized by category
const ICON_CATEGORIES = {
	'Combat': [
		{ family: 'MaterialIcons', name: 'security', label: 'Shield' },
		{ family: 'MaterialIcons', name: 'dangerous', label: 'Dangerous' },
		{ family: 'MaterialIcons', name: 'gavel', label: 'Weapon' },
		{ family: 'MaterialCommunityIcons', name: 'sword-cross', label: 'Sword' },
		{ family: 'MaterialCommunityIcons', name: 'shield', label: 'Shield' },
		{ family: 'Ionicons', name: 'shield', label: 'Shield (Ionicons)' },
	],
	'Characters': [
		{ family: 'MaterialIcons', name: 'person', label: 'Person' },
		{ family: 'MaterialIcons', name: 'people', label: 'People' },
		{ family: 'FontAwesome5', name: 'user-shield', label: 'User Shield' },
		{ family: 'FontAwesome5', name: 'user-ninja', label: 'Ninja' },
		{ family: 'FontAwesome5', name: 'user-astronaut', label: 'Astronaut' },
		{ family: 'Ionicons', name: 'person', label: 'Person (Ionicons)' },
	],
	'Magic': [
		{ family: 'MaterialIcons', name: 'auto-fix-high', label: 'Magic Wand' },
		{ family: 'MaterialIcons', name: 'flare', label: 'Flare' },
		{ family: 'MaterialIcons', name: 'whatshot', label: 'Fire' },
		{ family: 'FontAwesome5', name: 'magic', label: 'Magic' },
		{ family: 'FontAwesome5', name: 'wand-magic-sparkles', label: 'Wand' },
		{ family: 'Ionicons', name: 'flash', label: 'Flash' },
	],
	'Roles': [
		{ family: 'MaterialIcons', name: 'security', label: 'Guard' },
		{ family: 'MaterialIcons', name: 'store', label: 'Merchant' },
		{ family: 'MaterialIcons', name: 'explore', label: 'Scout' },
		{ family: 'MaterialIcons', name: 'healing', label: 'Healer' },
		{ family: 'FontAwesome5', name: 'mask', label: 'Rogue' },
		{ family: 'FontAwesome5', name: 'dragon', label: 'Dragon' },
		{ family: 'Ionicons', name: 'medkit', label: 'Medkit' },
	],
	'Creatures': [
		{ family: 'FontAwesome5', name: 'dragon', label: 'Dragon' },
		{ family: 'FontAwesome5', name: 'spider', label: 'Spider' },
		{ family: 'FontAwesome5', name: 'skull', label: 'Skull' },
		{ family: 'MaterialIcons', name: 'pets', label: 'Pet' },
		{ family: 'MaterialIcons', name: 'bug-report', label: 'Bug' },
		{ family: 'Ionicons', name: 'bug', label: 'Bug (Ionicons)' },
	],
	'Items': [
		{ family: 'MaterialIcons', name: 'inventory', label: 'Inventory' },
		{ family: 'MaterialIcons', name: 'backpack', label: 'Backpack' },
		{ family: 'MaterialIcons', name: 'diamond', label: 'Gem' },
		{ family: 'FontAwesome5', name: 'gem', label: 'Gem (FA5)' },
		{ family: 'FontAwesome5', name: 'coins', label: 'Coins' },
		{ family: 'Ionicons', name: 'bag', label: 'Bag' },
	],
};

const ALL_ICONS = Object.values(ICON_CATEGORIES).flat();

export const ExpoIconPicker: React.FC<ExpoIconPickerProps> = ({ value = '', onChange, label = 'Icon' }) => {
	const [pickerVisible, setPickerVisible] = useState(false);
	const [imageUrl, setImageUrl] = useState('');
	const [searchQuery, setSearchQuery] = useState('');

	const isImageIcon = value && (value.startsWith('http') || value.startsWith('data:'));

	const handleIconSelect = (family: string, name: string) => {
		onChange(`${family}:${name}`);
		setPickerVisible(false);
		setSearchQuery('');
	};

	const handleImageUrlSubmit = () => {
		if (imageUrl.trim()) {
			onChange(imageUrl.trim());
			setImageUrl('');
			setPickerVisible(false);
		}
	};

	const handleClear = () => {
		onChange('');
	};

	const filteredIcons = searchQuery
		? ALL_ICONS.filter(icon =>
			icon.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
			icon.name.toLowerCase().includes(searchQuery.toLowerCase()),
		)
		: ALL_ICONS;

	return (
		<View style={styles.container}>
			<ThemedText style={styles.label}>{label}</ThemedText>
			<View style={styles.currentIconContainer}>
				{value ? (
					<>
						<View style={styles.iconPreview}>
							<ExpoIcon icon={value} size={32} color="#3B2F1B" />
						</View>
						<TouchableOpacity style={styles.clearButton} onPress={handleClear}>
							<ThemedText style={styles.clearButtonText}>Clear</ThemedText>
						</TouchableOpacity>
					</>
				) : (
					<ThemedText style={styles.noIconText}>No icon selected</ThemedText>
				)}
			</View>
			<View style={styles.buttonRow}>
				<TouchableOpacity
					style={styles.pickerButton}
					onPress={() => setPickerVisible(true)}
				>
					<ThemedText style={styles.pickerButtonText}>Choose Icon</ThemedText>
				</TouchableOpacity>
				<View style={styles.urlInputContainer}>
					<TextInput
						style={styles.urlInput}
						placeholder="Or enter image URL"
						placeholderTextColor="#9C8A63"
						value={imageUrl}
						onChangeText={setImageUrl}
						onSubmitEditing={handleImageUrlSubmit}
					/>
					{imageUrl.trim() && (
						<TouchableOpacity style={styles.submitButton} onPress={handleImageUrlSubmit}>
							<ThemedText style={styles.submitButtonText}>Set</ThemedText>
						</TouchableOpacity>
					)}
				</View>
			</View>
			<Modal
				visible={pickerVisible}
				transparent
				animationType="slide"
				onRequestClose={() => {
					setPickerVisible(false);
					setSearchQuery('');
				}}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<ThemedText type="subtitle">Select Icon</ThemedText>
							<TouchableOpacity
								style={styles.closeButton}
								onPress={() => {
									setPickerVisible(false);
									setSearchQuery('');
								}}
							>
								<ThemedText style={styles.closeButtonText}>Close</ThemedText>
							</TouchableOpacity>
						</View>
						<TextInput
							style={styles.searchInput}
							placeholder="Search icons..."
							placeholderTextColor="#9C8A63"
							value={searchQuery}
							onChangeText={setSearchQuery}
						/>
						<ScrollView style={styles.iconScrollView}>
							{Object.entries(ICON_CATEGORIES).map(([category, icons]) => {
								const categoryIcons = searchQuery
									? icons.filter(icon =>
										icon.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
										icon.name.toLowerCase().includes(searchQuery.toLowerCase()),
									)
									: icons;

								if (categoryIcons.length === 0) {
									return null;
								}

								return (
									<View key={category} style={styles.categorySection}>
										<ThemedText style={styles.categoryTitle}>{category}</ThemedText>
										<View style={styles.iconGrid}>
											{categoryIcons.map((icon, index) => (
												<TouchableOpacity
													key={`${icon.family}-${icon.name}-${index}`}
													style={styles.iconButton}
													onPress={() => handleIconSelect(icon.family, icon.name)}
												>
													<ExpoIcon
														icon={`${icon.family}:${icon.name}`}
														size={24}
														color="#3B2F1B"
													/>
													<ThemedText style={styles.iconLabel} numberOfLines={1}>
														{icon.label}
													</ThemedText>
												</TouchableOpacity>
											))}
										</View>
									</View>
								);
							})}
							{searchQuery && filteredIcons.length === 0 && (
								<View style={styles.noResults}>
									<ThemedText style={styles.noResultsText}>No icons found</ThemedText>
								</View>
							)}
						</ScrollView>
					</View>
				</View>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: '#3B2F1B',
		marginBottom: 8,
	},
	currentIconContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 12,
		padding: 12,
		backgroundColor: '#F5E6D3',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E2D3B3',
	},
	iconPreview: {
		width: 40,
		height: 40,
		justifyContent: 'center',
		alignItems: 'center',
	},
	noIconText: {
		color: '#6B5B3D',
		fontStyle: 'italic',
	},
	clearButton: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		backgroundColor: '#DC2626',
		borderRadius: 4,
	},
	clearButtonText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '600',
	},
	buttonRow: {
		gap: 8,
	},
	pickerButton: {
		padding: 12,
		backgroundColor: '#C9B037',
		borderRadius: 8,
		alignItems: 'center',
	},
	pickerButtonText: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	urlInputContainer: {
		flexDirection: 'row',
		gap: 8,
	},
	urlInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#C9B037',
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 8,
		color: '#3B2F1B',
	},
	submitButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: '#8B6914',
		borderRadius: 8,
		justifyContent: 'center',
	},
	submitButtonText: {
		color: '#FFFFFF',
		fontWeight: '600',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'flex-end',
	},
	modalContent: {
		backgroundColor: '#FFF9EF',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: '80%',
		padding: 16,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	closeButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		backgroundColor: '#D4BC8B',
		borderRadius: 6,
	},
	closeButtonText: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	searchInput: {
		borderWidth: 1,
		borderColor: '#C9B037',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 8,
		color: '#3B2F1B',
		marginBottom: 16,
		backgroundColor: '#FFFFFF',
	},
	iconScrollView: {
		flex: 1,
	},
	categorySection: {
		marginBottom: 24,
	},
	categoryTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#3B2F1B',
		marginBottom: 12,
	},
	iconGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	iconButton: {
		width: 80,
		alignItems: 'center',
		padding: 8,
		backgroundColor: '#FFFFFF',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E2D3B3',
	},
	iconLabel: {
		fontSize: 10,
		color: '#3B2F1B',
		marginTop: 4,
		textAlign: 'center',
	},
	noResults: {
		padding: 24,
		alignItems: 'center',
	},
	noResultsText: {
		color: '#6B5B3D',
		fontStyle: 'italic',
	},
});

