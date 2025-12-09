import { useAuth } from 'expo-auth-template/frontend';
import React, { useMemo, useState } from 'react';
import { Image, ImageSourcePropType, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ExpoIcon } from '@/components/expo-icon';
import { ImageUploadModal } from '@/components/image-upload-modal';
import { ThemedText } from '@/components/themed-text';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useDeleteImage, useUploadedImages } from '@/hooks/api/use-image-queries';
import { CHARACTER_IMAGE_OPTIONS } from '@/types/character-figure';

interface PortraitOption {
	id: string;
	label: string;
	source: ImageSourcePropType | { uri: string };
	type: 'preset' | 'uploaded';
}

interface PortraitSelectorProps {
	selectedImage?: ImageSourcePropType | { uri: string };
	onSelect: (image: ImageSourcePropType | { uri: string }, label?: string) => void;
}

export const PortraitSelector: React.FC<PortraitSelectorProps> = ({ selectedImage, onSelect }) => {
	const [pickerVisible, setPickerVisible] = useState(false);
	const [uploadModalVisible, setUploadModalVisible] = useState(false);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	// Fetch uploaded images
	const { data: uploadedImages, refetch: refetchUploadedImages } = useUploadedImages('both');
	const deleteImageMutation = useDeleteImage();
	const { user } = useAuth();

	const isAdmin = user?.role === 'admin' || user?.is_admin === 1;

	const presetOptions: PortraitOption[] = useMemo(() => {
		return CHARACTER_IMAGE_OPTIONS.map(opt => ({
			id: opt.key,
			label: opt.label,
			source: opt.source,
			type: 'preset',
		}));
	}, []);

	const uploadedOptions: PortraitOption[] = useMemo(() => {
		if (!uploadedImages) return [];
		return uploadedImages.map(img => ({
			id: img.id,
			label: img.title || img.filename,
			source: { uri: img.public_url },
			type: 'uploaded',
		}));
	}, [uploadedImages]);

	const handleSelect = (option: PortraitOption) => {
		onSelect(option.source, option.label);
		setPickerVisible(false);
	};

	const handleDeleteImage = (imageId: string) => {
		console.log('handleDeleteImage called with imageId:', imageId);
		setConfirmDeleteId(imageId);
	};

	const performDelete = async () => {
		if (!confirmDeleteId) return;

		const imageId = confirmDeleteId;
		console.log('Delete confirmed, deleting imageId:', imageId);
		setConfirmDeleteId(null);
		try {
			console.log('Calling deleteImageMutation.mutateAsync...');
			await deleteImageMutation.mutateAsync(imageId);
			console.log('Delete successful, refetching...');
			refetchUploadedImages();
		} catch (error) {
			console.error('Delete error:', error);
		}
	};

	const handleUploadSuccess = (url: string) => {
		refetchUploadedImages();
		// Automatically select the newly uploaded image
		onSelect({ uri: url }, 'Uploaded Portrait');
		setPickerVisible(false);
		setUploadModalVisible(false);
	};

	return (
		<View style={styles.container}>
			<TouchableOpacity
				style={styles.currentPortraitContainer}
				onPress={() => setPickerVisible(true)}
			>
				{selectedImage ? (
					<Image source={selectedImage} style={styles.currentPortrait} />
				) : (
					<View style={styles.placeholderPortrait}>
						<ExpoIcon icon="MaterialIcons:person" size={64} color="#C9B037" />
						<ThemedText style={styles.placeholderText}>Choose Portrait</ThemedText>
					</View>
				)}
				<View style={styles.editBadge}>
					<ExpoIcon icon="MaterialIcons:edit" size={16} color="#FFF" />
				</View>
			</TouchableOpacity>

			<Modal
				visible={pickerVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setPickerVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<View style={styles.modalHeader}>
							<ThemedText type="subtitle">Choose Portrait</ThemedText>
							<TouchableOpacity
								style={styles.closeButton}
								onPress={() => setPickerVisible(false)}
							>
								<ThemedText style={styles.closeButtonText}>Close</ThemedText>
							</TouchableOpacity>
						</View>

						<View style={styles.actionsRow}>
							<TouchableOpacity
								style={styles.uploadButton}
								onPress={() => {
									setUploadModalVisible(true);
									setPickerVisible(false); // Close picker, open upload
								}}
							>
								<ExpoIcon icon="MaterialIcons:cloud-upload" size={20} color="#FFF" />
								<ThemedText style={styles.uploadButtonText}>Upload New</ThemedText>
							</TouchableOpacity>
						</View>

						<ScrollView style={styles.optionsList}>
							{uploadedOptions.length > 0 && (
								<View style={styles.section}>
									<ThemedText style={styles.sectionTitle}>Your Uploads</ThemedText>
									<View style={styles.grid}>
										{uploadedOptions.map(option => (
											<TouchableOpacity
												key={option.id}
												style={styles.gridItem}
												onPress={() => handleSelect(option)}
											>
												<View style={styles.imageWrapper}>
													<Image
														source={option.source}
														style={styles.gridImage}
														resizeMode="cover"
														onError={(e) => {
															console.error('Image load error:', e.nativeEvent.error);
														}}
													/>
													{isAdmin && option.type === 'uploaded' && (
														<TouchableOpacity
															style={styles.deleteButton}
															onPress={(e) => {
																if (e) {
																	e.stopPropagation?.();
																	e.preventDefault?.();
																}
																console.log('Delete button pressed in PortraitSelector for imageId:', option.id);
																console.log('Event:', e);
																handleDeleteImage(option.id);
															}}
															onPressIn={() => {
																console.log('Delete button onPressIn in PortraitSelector for imageId:', option.id);
															}}
															activeOpacity={0.7}
															hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
														>
															<ExpoIcon icon="MaterialIcons:delete" size={16} color="#FFF" />
														</TouchableOpacity>
													)}
												</View>
												<ThemedText numberOfLines={1} style={styles.gridLabel}>
													{option.label}
												</ThemedText>
											</TouchableOpacity>
										))}
									</View>
								</View>
							)}

							<View style={styles.section}>
								<ThemedText style={styles.sectionTitle}>Presets</ThemedText>
								<View style={styles.grid}>
									{presetOptions.map(option => (
										<TouchableOpacity
											key={option.id}
											style={styles.gridItem}
											onPress={() => handleSelect(option)}
										>
											<Image source={option.source} style={styles.gridImage} />
											<ThemedText numberOfLines={1} style={styles.gridLabel}>
												{option.label}
											</ThemedText>
										</TouchableOpacity>
									))}
								</View>
							</View>
						</ScrollView>
					</View>
				</View>
			</Modal>

			<ImageUploadModal
				visible={uploadModalVisible}
				onClose={() => {
					setUploadModalVisible(false);
					setPickerVisible(true); // Re-open picker when upload cancelled/closed
				}}
				onUploadSuccess={handleUploadSuccess}
			/>

			<ConfirmModal
				visible={confirmDeleteId !== null}
				title="Delete Image"
				message="Are you sure you want to delete this image? This cannot be undone."
				onConfirm={performDelete}
				onCancel={() => {
					console.log('Delete cancelled');
					setConfirmDeleteId(null);
				}}
				confirmLabel="Delete"
				cancelLabel="Cancel"
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		marginBottom: 24,
	},
	currentPortraitContainer: {
		position: 'relative',
		borderRadius: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 5,
		elevation: 6,
	},
	currentPortrait: {
		width: 140,
		height: 140,
		borderRadius: 12,
		borderWidth: 3,
		borderColor: '#C9B037',
		backgroundColor: '#F9F6EF',
	},
	placeholderPortrait: {
		width: 140,
		height: 140,
		borderRadius: 12,
		borderWidth: 3,
		borderColor: '#C9B037',
		backgroundColor: '#F9F6EF',
		alignItems: 'center',
		justifyContent: 'center',
		borderStyle: 'dashed',
	},
	placeholderText: {
		fontSize: 12,
		color: '#8B5C2A',
		fontWeight: '600',
		marginTop: 4,
	},
	editBadge: {
		position: 'absolute',
		bottom: -8,
		right: -8,
		backgroundColor: '#8B2323',
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: '#FFF',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: '#FFF9EF',
		borderRadius: 16,
		width: '90%',
		maxWidth: 800,
		maxHeight: '85%',
		padding: 20,
		display: 'flex',
		flexDirection: 'column',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
		paddingBottom: 12,
	},
	closeButton: {
		padding: 8,
		backgroundColor: '#E2D3B3',
		borderRadius: 6,
	},
	closeButtonText: {
		color: '#3B2F1B',
		fontWeight: '600',
		fontSize: 14,
	},
	actionsRow: {
		flexDirection: 'row',
		marginBottom: 16,
	},
	uploadButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#8B6914',
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 8,
		gap: 8,
	},
	uploadButtonText: {
		color: '#FFFFFF',
		fontWeight: '600',
		fontSize: 14,
	},
	optionsList: {
		flex: 1,
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#8B2323',
		marginBottom: 12,
		marginLeft: 4,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 16,
		justifyContent: 'center', // Center items for better layout on varying widths
	},
	gridItem: {
		width: 100,
		alignItems: 'center',
		marginBottom: 8,
	},
	imageWrapper: {
		position: 'relative',
		width: 100,
		height: 100,
	},
	deleteButton: {
		position: 'absolute',
		top: -4,
		right: -4,
		backgroundColor: '#DC2626',
		borderRadius: 12,
		width: 28,
		height: 28,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: '#FFF',
		zIndex: 1000,
		elevation: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 3,
	},
	gridImage: {
		width: 100,
		height: 100,
		borderRadius: 8,
		borderWidth: 2,
		borderColor: '#E2D3B3',
		backgroundColor: '#FFF',
		marginBottom: 6,
	},
	gridLabel: {
		fontSize: 12,
		color: '#3B2F1B',
		textAlign: 'center',
		width: '100%',
	},
});
