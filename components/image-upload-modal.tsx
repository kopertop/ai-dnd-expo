import { Asset } from 'expo-asset';
import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Dimensions,
	Image,
	ImageSourcePropType,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExpoIcon } from '@/components/expo-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accordion } from '@/components/ui/accordion';
import { IMAGE_BLANKS, REFERENCE_IMAGE } from '@/constants/image-blanks';
import { useUploadImage } from '@/hooks/api/use-image-queries';

interface ImageUploadModalProps {
	visible: boolean;
	onClose: () => void;
	onUploadSuccess: (imageUrl: string) => void;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
	visible,
	onClose,
	onUploadSuccess,
}) => {
	const insets = useSafeAreaInsets();
	const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
	const [title, setTitle] = useState('');
	const [imageType, setImageType] = useState<'npc' | 'character' | 'both'>('both');
	const [uploading, setUploading] = useState(false);
	const [downloadingBlank, setDownloadingBlank] = useState<string | null>(null);
	const [guidelinesExpanded, setGuidelinesExpanded] = useState(false);

	const uploadMutation = useUploadImage();

	const promptText = `Create a D&D miniature of a [race] [gender] [class] standing on a [base type] base.
The character should have [skin/scale color + features], [hair description], and [distinct racial traits] such as [horns/ears/tusks].

Clothing should be [regal/simple/armored/etc], using [color palette].
They should be wielding [weapons or items] and standing in a [pose description].
Include optional magical effects such as [spell glow, elemental aura, runes, etc].

Produce the final image as:
•	1:1 square
•	Transparent background
•	Full miniature with circular base fully visible
•	Precise 2.5D D&D miniature style`;

	const handleCopyPrompt = async () => {
		await Clipboard.setStringAsync(promptText);
		Alert.alert('Copied', 'Prompt guide copied to clipboard');
	};

	const handleSelectImage = async () => {
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				aspect: [1, 1],
				quality: 1,
			});

			if (!result.canceled && result.assets[0]) {
				setSelectedImage(result.assets[0]);
			}
		} catch {
			Alert.alert('Error', 'Failed to pick image');
		}
	};

	const handleUpload = async () => {
		if (!selectedImage) {
			Alert.alert('Error', 'Please select an image first');
			return;
		}

		setUploading(true);
		try {
			const uploadedImage = await uploadMutation.mutateAsync({
				file: selectedImage,
				title: title || undefined,
				image_type: imageType,
			});

			onUploadSuccess(uploadedImage.public_url);
			resetForm();
			onClose();
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error occurred';
			Alert.alert('Upload Failed', message);
		} finally {
			setUploading(false);
		}
	};

	const resetForm = () => {
		setSelectedImage(null);
		setTitle('');
		setImageType('both');
	};

	const downloadBlank = async (id: string, source: ImageSourcePropType, filename: string) => {
		if (Platform.OS === 'web') {
			// Web download logic
			const uri = Image.resolveAssetSource(source).uri;
			const link = document.createElement('a');
			link.href = uri;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			return;
		}

		// Mobile download logic
		try {
			setDownloadingBlank(id);

			// Resolve the asset URI
			let localUri: string | null = null;

			if (typeof source === 'number') {
				const asset = Asset.fromModule(source);
				if (!asset.localUri) {
					await asset.downloadAsync();
				}
				localUri = asset.localUri || asset.uri;
			} else if (typeof source === 'object' && source !== null && !Array.isArray(source) && 'uri' in source && typeof source.uri === 'string') {
				localUri = source.uri;
			} else if (Array.isArray(source) && source.length > 0 && typeof source[0] === 'object' && 'uri' in source[0] && typeof source[0].uri === 'string') {
				localUri = source[0].uri;
			}

			if (!localUri) {
				throw new Error('Could not resolve image URI');
			}

			// Define target path in document directory
			const file = new File(Paths.document, filename);

			// Copy file to document directory
			const sourceFile = new File(localUri);
			await sourceFile.copy(file);

			// Check if sharing is available
			if (await Sharing.isAvailableAsync()) {
				await Sharing.shareAsync(file.uri);
			} else {
				Alert.alert('Success', 'Image saved to documents folder');
			}
		} catch (error) {
			console.error('Download error:', error);
			Alert.alert('Error', 'Failed to download image template');
		} finally {
			setDownloadingBlank(null);
		}
	};

	const screenWidth = Dimensions.get('window').width;
	const isMobile = screenWidth < 768;

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
			<View style={styles.overlay}>
				<ThemedView
					style={[
						styles.container,
						isMobile && styles.containerMobile,
						{
							marginTop: isMobile ? 0 : insets.top + 20,
							marginBottom: isMobile ? 0 : insets.bottom + 20,
						},
					]}
				>
					<View style={styles.header}>
						<ThemedText type="subtitle">Upload Custom Image</ThemedText>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<ThemedText style={styles.closeButtonText}>Close</ThemedText>
						</TouchableOpacity>
					</View>

					<ScrollView style={styles.content}>
						{/* Creation Guidelines Accordion */}
						<Accordion
							title="🎨 Creation Guidelines"
							expanded={guidelinesExpanded}
							onToggle={() => setGuidelinesExpanded(!guidelinesExpanded)}
						>
							{/* Prompt Tips */}
							<View style={styles.guidelinesSubsection}>
								<View style={styles.sectionHeaderRow}>
									<ThemedText type="defaultSemiBold" style={styles.subsectionTitle}>
										Prompt Template
									</ThemedText>
									<TouchableOpacity onPress={handleCopyPrompt} style={styles.copyButton}>
										<ExpoIcon icon="MaterialIcons:content-copy" size={16} color="#6B5B3D" />
										<ThemedText style={styles.copyButtonText}>Copy</ThemedText>
									</TouchableOpacity>
								</View>
								<View style={styles.tipsContainer}>
									<ThemedText style={styles.tipText}>{promptText}</ThemedText>
								</View>
							</View>

							{/* Blank Templates */}
							<View style={styles.guidelinesSubsection}>
								<ThemedText type="defaultSemiBold" style={styles.subsectionTitle}>
									📥 Download Image Blanks
								</ThemedText>
								<ThemedText style={styles.blanksDescription}>
									Download these blank templates to use as reference in your AI image generation tools.
									Upload the blank to your image generator along with your prompt to ensure consistent style.
								</ThemedText>

								<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.blanksScroll}>
									{/* Reference Image */}
									<View style={styles.blankItem}>
										<View style={styles.blankImageContainer}>
											<Image source={REFERENCE_IMAGE.source} style={styles.blankImage} />
											<View style={styles.referenceBadge}>
												<ThemedText style={styles.referenceText}>EXAMPLE</ThemedText>
											</View>
										</View>
										<ThemedText style={styles.blankName}>Goblin (Ref)</ThemedText>
									</View>

									{/* Blanks */}
									{IMAGE_BLANKS.map((blank) => (
										<View key={blank.id} style={styles.blankItem}>
											<View style={styles.blankImageContainer}>
												<Image source={blank.source} style={styles.blankImage} />
												<TouchableOpacity
													style={styles.downloadOverlay}
													onPress={() => downloadBlank(blank.id, blank.source, blank.filename)}
													disabled={downloadingBlank === blank.id}
												>
													{downloadingBlank === blank.id ? (
														<ActivityIndicator color="#FFF" size="small" />
													) : (
														<ExpoIcon icon="MaterialIcons:file-download" color="#FFF" size={24} />
													)}
												</TouchableOpacity>
											</View>
											<ThemedText style={styles.blankName}>{blank.name}</ThemedText>
										</View>
									))}
								</ScrollView>
							</View>
						</Accordion>

						{/* Upload Form */}
						<View style={styles.section}>
							<ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
								Upload Image
							</ThemedText>

							<TouchableOpacity style={styles.imageSelector} onPress={handleSelectImage}>
								{selectedImage ? (
									<Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
								) : (
									<View style={styles.placeholderContainer}>
										<ExpoIcon icon="MaterialIcons:add-photo-alternate" size={48} color="#9C8A63" />
										<ThemedText style={styles.placeholderText}>Tap to select image</ThemedText>
									</View>
								)}
							</TouchableOpacity>

							<ThemedText style={styles.label}>Title (optional)</ThemedText>
							<TextInput
								style={styles.input}
								value={title}
								onChangeText={setTitle}
								placeholder="e.g. Elf Ranger"
								placeholderTextColor="#999"
							/>

							<ThemedText style={styles.label}>Image Type</ThemedText>
							<View style={styles.typeSelector}>
								{(['both', 'character', 'npc'] as const).map((type) => (
									<TouchableOpacity
										key={type}
										style={[
											styles.typeButton,
											imageType === type && styles.typeButtonSelected,
										]}
										onPress={() => setImageType(type)}
									>
										<ThemedText
											style={[
												styles.typeButtonText,
												imageType === type && styles.typeButtonTextSelected,
											]}
										>
											{type === 'both' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
										</ThemedText>
									</TouchableOpacity>
								))}
							</View>
						</View>
					</ScrollView>

					<View style={styles.footer}>
						<TouchableOpacity
							style={[styles.uploadButton, (!selectedImage || uploading) && styles.disabledButton]}
							onPress={handleUpload}
							disabled={!selectedImage || uploading}
						>
							{uploading ? (
								<ActivityIndicator color="#FFFFFF" />
							) : (
								<ThemedText style={styles.uploadButtonText}>Upload Image</ThemedText>
							)}
						</TouchableOpacity>
					</View>
				</ThemedView>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	container: {
		width: '90%',
		maxWidth: 900,
		maxHeight: '90%',
		backgroundColor: '#FFF9EF',
		borderRadius: 16,
		overflow: 'hidden',
		display: 'flex',
		flexDirection: 'column',
	},
	containerMobile: {
		width: '100%',
		maxWidth: '100%',
		height: '100%',
		maxHeight: '100%',
		borderRadius: 0,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
		backgroundColor: '#F5E6D3',
	},
	closeButton: {
		padding: 8,
	},
	closeButtonText: {
		color: '#6B5B3D',
		fontWeight: '600',
	},
	content: {
		flex: 1,
		padding: 16,
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		color: '#3B2F1B',
		marginBottom: 0,
	},
	guidelinesSubsection: {
		marginBottom: 20,
	},
	subsectionTitle: {
		color: '#3B2F1B',
		fontSize: 16,
		marginBottom: 8,
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	copyButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFF9EF',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
		borderWidth: 1,
		borderColor: '#E2D3B3',
	},
	copyButtonText: {
		marginLeft: 4,
		fontSize: 12,
		color: '#6B5B3D',
		fontWeight: '600',
	},
	tipsContainer: {
		backgroundColor: '#FFFFFF',
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E2D3B3',
	},
	tipRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	checkMark: {
		marginRight: 8,
		fontSize: 14,
	},
	tipText: {
		fontSize: 14,
		color: '#3B2F1B',
	},
	blanksDescription: {
		fontSize: 14,
		color: '#6B5B3D',
		marginBottom: 12,
	},
	blanksScroll: {
		flexDirection: 'row',
	},
	blankItem: {
		marginRight: 12,
		alignItems: 'center',
		width: 80,
	},
	blankImageContainer: {
		width: 80,
		height: 80,
		borderRadius: 8,
		overflow: 'hidden',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		position: 'relative',
	},
	blankImage: {
		width: '100%',
		height: '100%',
		resizeMode: 'contain',
	},
	referenceBadge: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: 'rgba(139, 105, 20, 0.8)',
		paddingVertical: 2,
		alignItems: 'center',
	},
	referenceText: {
		color: '#FFFFFF',
		fontSize: 8,
		fontWeight: 'bold',
	},
	downloadOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0,0,0,0.3)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	// We can't do hover styles easily in RN, so we'll just show the icon always for now
	// or make it always visible semi-transparent

	blankName: {
		fontSize: 10,
		color: '#3B2F1B',
		marginTop: 4,
		textAlign: 'center',
	},
	imageSelector: {
		width: '100%',
		aspectRatio: 1,
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		borderWidth: 2,
		borderColor: '#E2D3B3',
		borderStyle: 'dashed',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16,
		overflow: 'hidden',
	},
	previewImage: {
		width: '100%',
		height: '100%',
		resizeMode: 'contain',
	},
	placeholderContainer: {
		alignItems: 'center',
	},
	placeholderText: {
		marginTop: 8,
		color: '#9C8A63',
		fontSize: 16,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		color: '#3B2F1B',
		marginBottom: 8,
	},
	input: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 8,
		padding: 12,
		fontSize: 16,
		color: '#3B2F1B',
		marginBottom: 16,
	},
	typeSelector: {
		flexDirection: 'row',
		gap: 8,
		marginBottom: 16,
	},
	typeButton: {
		flex: 1,
		padding: 10,
		borderRadius: 8,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		alignItems: 'center',
	},
	typeButtonSelected: {
		backgroundColor: '#8B6914',
		borderColor: '#8B6914',
	},
	typeButtonText: {
		color: '#3B2F1B',
		fontWeight: '600',
	},
	typeButtonTextSelected: {
		color: '#FFFFFF',
	},
	footer: {
		padding: 16,
		borderTopWidth: 1,
		borderTopColor: '#E2D3B3',
		backgroundColor: '#F5E6D3',
	},
	uploadButton: {
		backgroundColor: '#8B6914',
		padding: 16,
		borderRadius: 8,
		alignItems: 'center',
	},
	disabledButton: {
		backgroundColor: '#C9B037',
		opacity: 0.7,
	},
	uploadButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '700',
	},
});
