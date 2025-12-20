import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Image,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useImportVTTMap } from '@/hooks/api/use-map-queries';

interface VTTMapImportProps {
	visible: boolean;
	onClose: () => void;
	inviteCode: string;
	onSuccess?: () => void;
}

export const VTTMapImport: React.FC<VTTMapImportProps> = ({
	visible,
	onClose,
	inviteCode,
	onSuccess,
}) => {
	const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
	const [name, setName] = useState('');
	const [columns, setColumns] = useState('40');
	const [rows, setRows] = useState('30');
	const [gridSize, setGridSize] = useState('100');
	const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const importMutation = useImportVTTMap(inviteCode);
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();

	// Calculate preview dimensions
	const previewWidth = Math.min(windowWidth - 40, 400);
	const previewHeight = imageDimensions
		? (previewWidth / imageDimensions.width) * imageDimensions.height
		: 200;

	const pickImage = async () => {
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: false,
				quality: 1,
			});

			if (!result.canceled && result.assets[0]) {
				const asset = result.assets[0];
				setImage(asset);

				// Set initial name from filename if available
				if (asset.fileName) {
					setName(asset.fileName.replace(/\.[^/.]+$/, ''));
				} else if (asset.uri) {
					// Extract filename from URI
					const uriName = asset.uri.split('/').pop()?.split('?')[0]?.replace(/\.[^/.]+$/, '');
					if (uriName) setName(decodeURIComponent(uriName));
				}

				// Get image dimensions
				if (asset.width && asset.height) {
					setImageDimensions({ width: asset.width, height: asset.height });
					autoCalculateGrid(asset.width, asset.height);
				} else {
					// Load image to get dimensions if not provided
					Image.getSize(asset.uri, (width, height) => {
						setImageDimensions({ width, height });
						autoCalculateGrid(width, height);
					});
				}
			}
		} catch (error) {
			console.error('Failed to pick image:', error);
			Alert.alert('Error', 'Failed to pick image');
		}
	};

	const autoCalculateGrid = (width: number, height: number) => {
		// Try to detect standard grid sizes (50, 70, 100, 140)
		const standardSizes = [100, 70, 140, 50];

		for (const size of standardSizes) {
			if (width % size === 0 && height % size === 0) {
				const cols = width / size;
				const rws = height / size;
				if (cols > 5 && rws > 5 && cols < 200 && rws < 200) {
					setGridSize(size.toString());
					setColumns(cols.toString());
					setRows(rws.toString());
					return;
				}
			}
		}

		// Fallback: try to match current columns/rows if they seem reasonable
		const currentCols = parseInt(columns, 10);
		const currentRows = parseInt(rows, 10);

		if (!isNaN(currentCols) && currentCols > 0) {
			const calculatedSize = Math.round(width / currentCols);
			setGridSize(calculatedSize.toString());
			setRows(Math.round(height / calculatedSize).toString());
		}
	};

	const handleColumnsChange = (text: string) => {
		setColumns(text);
		if (imageDimensions) {
			const cols = parseInt(text, 10);
			if (!isNaN(cols) && cols > 0) {
				const size = Math.round(imageDimensions.width / cols);
				setGridSize(size.toString());
				setRows(Math.round(imageDimensions.height / size).toString());
			}
		}
	};

	const handleGridSizeChange = (text: string) => {
		setGridSize(text);
		if (imageDimensions) {
			const size = parseInt(text, 10);
			if (!isNaN(size) && size > 0) {
				setColumns(Math.round(imageDimensions.width / size).toString());
				setRows(Math.round(imageDimensions.height / size).toString());
			}
		}
	};

	const handleImport = async () => {
		if (!image) {
			Alert.alert('Error', 'Please select an image');
			return;
		}

		if (!name) {
			Alert.alert('Error', 'Please enter a map name');
			return;
		}

		setIsSubmitting(true);
		try {
			// Convert image URI to Blob/File for web
			let file: any = null;
			if (Platform.OS === 'web') {
				const response = await fetch(image.uri);
				const blob = await response.blob();
				file = new File([blob], image.fileName || 'map.png', { type: blob.type });
			} else {
				// For native, we need to handle file upload differently
				// Currently our API expects multipart/form-data with a file object
				// This might need adjustment for React Native
				file = {
					uri: image.uri,
					name: image.fileName || 'map.png',
					type: image.type || 'image/png',
				};
			}

			await importMutation.mutateAsync({
				file,
				name,
				columns: parseInt(columns, 10),
				rows: parseInt(rows, 10),
				gridSize: parseInt(gridSize, 10),
			});

			onSuccess?.();
			handleClose();
		} catch (error) {
			console.error('Import failed:', error);
			Alert.alert('Error', 'Failed to import map');
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		setImage(null);
		setName('');
		setImageDimensions(null);
		onClose();
	};

	return (
		<Modal visible={visible} animationType="slide" transparent>
			<View style={styles.modalOverlay}>
				<ThemedView style={[styles.modalContent, { maxHeight: windowHeight * 0.9 }]}>
					<View style={styles.header}>
						<ThemedText type="subtitle">Import VTT Map</ThemedText>
						<TouchableOpacity onPress={handleClose}>
							<ThemedText>✕</ThemedText>
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.scrollView}>
						<View style={styles.section}>
							<ThemedText style={styles.label}>Map Image</ThemedText>
							<TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
								{image ? (
									<Image
										source={{ uri: image.uri }}
										style={{ width: '100%', height: previewHeight }}
										resizeMode="contain"
									/>
								) : (
									<View style={[styles.imagePlaceholder, { height: 150 }]}>
										<ThemedText>Tap to select map image</ThemedText>
										<ThemedText style={styles.subtext}>Supports WebP, PNG, JPG</ThemedText>
									</View>
								)}
							</TouchableOpacity>
							{imageDimensions && (
								<ThemedText style={styles.dimText}>
									Original size: {imageDimensions.width} x {imageDimensions.height} px
								</ThemedText>
							)}
						</View>

						<View style={styles.section}>
							<ThemedText style={styles.label}>Map Name</ThemedText>
							<TextInput
								style={styles.input}
								value={name}
								onChangeText={setName}
								placeholder="Enter map name"
								placeholderTextColor="#666"
							/>
						</View>

						<View style={styles.section}>
							<ThemedText style={styles.label}>Grid Configuration</ThemedText>
							<View style={styles.row}>
								<View style={styles.col}>
									<ThemedText style={styles.sublabel}>Columns</ThemedText>
									<TextInput
										style={styles.input}
										value={columns}
										onChangeText={handleColumnsChange}
										keyboardType="numeric"
									/>
								</View>
								<View style={styles.col}>
									<ThemedText style={styles.sublabel}>Rows</ThemedText>
									<TextInput
										style={styles.input}
										value={rows}
										onChangeText={setRows} // Don't auto-calc on row change to avoid loops
										keyboardType="numeric"
									/>
								</View>
								<View style={styles.col}>
									<ThemedText style={styles.sublabel}>Px / Grid</ThemedText>
									<TextInput
										style={styles.input}
										value={gridSize}
										onChangeText={handleGridSizeChange}
										keyboardType="numeric"
									/>
								</View>
							</View>
							<ThemedText style={styles.helpText}>
								Inkarnate VTT export uses 100px per grid square by default.
								Adjust these values to match your map export settings.
							</ThemedText>
						</View>
					</ScrollView>

					<View style={styles.footer}>
						<TouchableOpacity
							style={[styles.button, styles.cancelButton]}
							onPress={handleClose}
							disabled={isSubmitting}
						>
							<ThemedText>Cancel</ThemedText>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.button, styles.importButton, (!image || !name) && styles.disabledButton]}
							onPress={handleImport}
							disabled={!image || !name || isSubmitting}
						>
							{isSubmitting ? (
								<ActivityIndicator color="#FFF" />
							) : (
								<ThemedText style={styles.importButtonText}>Import Map</ThemedText>
							)}
						</TouchableOpacity>
					</View>
				</ThemedView>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.7)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	modalContent: {
		width: '100%',
		maxWidth: 500,
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: '#1F130A', // Dark background
		borderWidth: 1,
		borderColor: '#3B2F1B',
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(255,255,255,0.1)',
	},
	scrollView: {
		padding: 16,
	},
	section: {
		marginBottom: 20,
	},
	label: {
		fontWeight: 'bold',
		marginBottom: 8,
		color: '#CAB08A',
	},
	sublabel: {
		fontSize: 12,
		marginBottom: 4,
		color: '#8B7355',
	},
	imagePicker: {
		borderWidth: 1,
		borderColor: '#3B2F1B',
		borderRadius: 8,
		overflow: 'hidden',
		backgroundColor: '#160F08',
	},
	imagePlaceholder: {
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	subtext: {
		fontSize: 12,
		color: '#666',
		marginTop: 4,
	},
	dimText: {
		fontSize: 12,
		color: '#8B7355',
		marginTop: 4,
		textAlign: 'right',
	},
	input: {
		backgroundColor: '#160F08',
		borderWidth: 1,
		borderColor: '#3B2F1B',
		borderRadius: 6,
		padding: 10,
		color: '#FFF',
		fontSize: 16,
	},
	row: {
		flexDirection: 'row',
		gap: 10,
	},
	col: {
		flex: 1,
	},
	helpText: {
		fontSize: 12,
		color: '#666',
		marginTop: 8,
		fontStyle: 'italic',
	},
	footer: {
		flexDirection: 'row',
		padding: 16,
		borderTopWidth: 1,
		borderTopColor: 'rgba(255,255,255,0.1)',
		gap: 12,
	},
	button: {
		flex: 1,
		padding: 12,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cancelButton: {
		backgroundColor: 'rgba(255,255,255,0.1)',
	},
	importButton: {
		backgroundColor: '#4CAF50',
	},
	disabledButton: {
		backgroundColor: '#2E3B2F',
		opacity: 0.7,
	},
	importButtonText: {
		color: '#FFF',
		fontWeight: 'bold',
	},
});






