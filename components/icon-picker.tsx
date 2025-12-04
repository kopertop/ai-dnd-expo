import React, { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

interface IconPickerProps {
	value?: string;
	onChange: (icon: string) => void;
	label?: string;
}

const COMMON_EMOJIS = [
	'⚔️',
	'🛡️',
	'🏹',
	'🗡️',
	'🧙',
	'🧙‍♀️',
	'🧙‍♂️',
	'🧝',
	'🧝‍♀️',
	'🧝‍♂️',
	'🧚',
	'🧚‍♀️',
	'🧚‍♂️',
	'🧜',
	'🧜‍♀️',
	'🧜‍♂️',
	'🧛',
	'🧛‍♀️',
	'🧛‍♂️',
	'🧟',
	'🧟‍♀️',
	'🧟‍♂️',
	'👹',
	'👺',
	'🐉',
	'🐲',
	'🦄',
	'🦅',
	'🦇',
	'🐺',
	'🐻',
	'🐸',
	'🦎',
	'🐍',
	'🕷️',
	'🦂',
	'💀',
	'👑',
	'🎭',
	'🎪',
	'🏰',
	'🗿',
	'⚡',
	'🔥',
	'❄️',
	'💧',
	'🌊',
	'🌲',
	'🌳',
	'🌿',
	'🍄',
];

export const IconPicker: React.FC<IconPickerProps> = ({ value = '', onChange, label = 'Icon' }) => {
	const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
	const [imageUrl, setImageUrl] = useState('');

	const isImageIcon = value && (value.startsWith('http') || value.startsWith('data:'));

	const handleEmojiSelect = (emoji: string) => {
		onChange(emoji);
		setEmojiPickerVisible(false);
	};

	const handleImageUrlSubmit = () => {
		if (imageUrl.trim()) {
			onChange(imageUrl.trim());
			setImageUrl('');
		}
	};

	const handleClear = () => {
		onChange('');
	};

	return (
		<View style={styles.container}>
			<ThemedText style={styles.label}>{label}</ThemedText>
			<View style={styles.currentIconContainer}>
				{value ? (
					<>
						{isImageIcon ? (
							<Image source={{ uri: value }} style={styles.iconPreview} />
						) : (
							<ThemedText style={styles.iconPreview}>{value}</ThemedText>
						)}
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
					onPress={() => setEmojiPickerVisible(true)}
				>
					<ThemedText style={styles.pickerButtonText}>Choose Emoji</ThemedText>
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
				visible={emojiPickerVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setEmojiPickerVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<ThemedText type="subtitle">Select Emoji</ThemedText>
							<TouchableOpacity
								style={styles.closeButton}
								onPress={() => setEmojiPickerVisible(false)}
							>
								<ThemedText style={styles.closeButtonText}>Close</ThemedText>
							</TouchableOpacity>
						</View>
						<ScrollView style={styles.emojiGrid}>
							<View style={styles.emojiRow}>
								{COMMON_EMOJIS.map((emoji, index) => (
									<TouchableOpacity
										key={index}
										style={styles.emojiButton}
										onPress={() => handleEmojiSelect(emoji)}
									>
										<ThemedText style={styles.emojiText}>{emoji}</ThemedText>
									</TouchableOpacity>
								))}
							</View>
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
		fontSize: 32,
		width: 40,
		height: 40,
		textAlign: 'center',
		lineHeight: 40,
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
		maxHeight: '70%',
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
	emojiGrid: {
		flex: 1,
	},
	emojiRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	emojiButton: {
		width: 50,
		height: 50,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E2D3B3',
	},
	emojiText: {
		fontSize: 24,
	},
});

