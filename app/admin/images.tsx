import { useQueryApi } from 'expo-auth-template/frontend';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import {
	ActivityIndicator,
	Image,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';

import { ExpoIcon } from '@/components/expo-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useUserInfo } from '@/hooks/api/use-auth-queries';
import { UploadedImage, useDeleteImage } from '@/hooks/api/use-image-queries';

const AdminImagesScreen: React.FC = () => {
	const { data: userInfo } = useUserInfo();
	const isAdmin = userInfo?.is_admin === true;

	const { data: imagesData, isLoading, refetch } = useQueryApi<{ images: UploadedImage[] }>(
		'/admin/images',
		{
			enabled: isAdmin,
		},
	);

	const deleteImageMutation = useDeleteImage();
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	const images = imagesData?.images || [];

	const handleDelete = async (imageId: string) => {
		console.log('handleDelete called with imageId:', imageId);
		setConfirmDeleteId(imageId);
	};

	const performDelete = async () => {
		if (!confirmDeleteId) return;

		const imageId = confirmDeleteId;
		console.log('Delete confirmed, deleting imageId:', imageId);
		setConfirmDeleteId(null);
		setDeletingId(imageId);
		try {
			console.log('Calling deleteImageMutation.mutateAsync...');
			await deleteImageMutation.mutateAsync(imageId);
			console.log('Delete successful, refetching...');
			refetch();
		} catch (error) {
			console.error('Delete error:', error);
		} finally {
			setDeletingId(null);
		}
	};

	if (!isAdmin) {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen
					options={{
						title: 'Admin - Images',
						headerShown: true,
						headerTitleAlign: 'center',
					}}
				/>
				<View style={styles.center}>
					<ThemedText style={styles.errorText}>
						Access Denied
					</ThemedText>
					<ThemedText style={styles.errorSubtext}>
						You must be an admin to access this page.
					</ThemedText>
				</View>
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'Admin - Manage Images',
					headerShown: true,
					headerTitleAlign: 'center',
				}}
			/>
			<View style={styles.header}>
				<ThemedText type="title" style={styles.title}>
					Custom Uploaded Images
				</ThemedText>
				<ThemedText style={styles.subtitle}>
					{images.length} image{images.length !== 1 ? 's' : ''} total
				</ThemedText>
			</View>

			{isLoading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color="#C9B037" />
					<ThemedText style={styles.loadingText}>Loading images...</ThemedText>
				</View>
			) : images.length === 0 ? (
				<View style={styles.center}>
					<ThemedText style={styles.emptyText}>No uploaded images found.</ThemedText>
				</View>
			) : (
				<ScrollView contentContainerStyle={styles.grid}>
					{images.map((image) => (
						<View key={image.id} style={styles.imageCard}>
							<View style={styles.imageContainer}>
								<Image
									source={{ uri: image.public_url }}
									style={styles.image}
									resizeMode="contain"
								/>
							</View>
							<View style={styles.imageInfo}>
								<ThemedText style={styles.imageTitle} numberOfLines={1}>
									{image.title || image.filename}
								</ThemedText>
								<ThemedText style={styles.imageMeta} numberOfLines={1}>
									Type: {image.image_type}
								</ThemedText>
								<ThemedText style={styles.imageMeta} numberOfLines={1}>
									ID: {image.id}
								</ThemedText>
							</View>
							<TouchableOpacity
								style={[
									styles.deleteButton,
									deletingId === image.id && styles.deleteButtonDisabled,
								]}
								onPress={(e) => {
									if (e) {
										e.stopPropagation?.();
										e.preventDefault?.();
									}
									console.log('Delete button pressed for imageId:', image.id);
									console.log('Event:', e);
									handleDelete(image.id);
								}}
								onPressIn={() => {
									console.log('Delete button onPressIn for imageId:', image.id);
								}}
								disabled={deletingId === image.id}
								activeOpacity={0.7}
								hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
							>
								{deletingId === image.id ? (
									<ActivityIndicator size="small" color="#FFF" />
								) : (
									<>
										<ExpoIcon icon="MaterialIcons:delete" size={18} color="#FFF" />
										<ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
									</>
								)}
							</TouchableOpacity>
						</View>
					))}
				</ScrollView>
			)}

			<ConfirmModal
				visible={confirmDeleteId !== null}
				title="Delete Image"
				message="Are you sure you want to delete this image? This action cannot be undone."
				onConfirm={performDelete}
				onCancel={() => {
					console.log('Delete cancelled');
					setConfirmDeleteId(null);
				}}
				confirmLabel="Delete"
				cancelLabel="Cancel"
			/>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F5E6D3',
	},
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
	},
	header: {
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
		backgroundColor: '#FFF9EF',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: '#6B5B3D',
	},
	loadingText: {
		marginTop: 12,
		color: '#6B5B3D',
	},
	emptyText: {
		fontSize: 16,
		color: '#6B5B3D',
		textAlign: 'center',
	},
	errorText: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#8B2323',
		marginBottom: 8,
	},
	errorSubtext: {
		fontSize: 14,
		color: '#6B5B3D',
		textAlign: 'center',
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		padding: 16,
		gap: 16,
		justifyContent: 'flex-start',
	},
	imageCard: {
		width: 200,
		backgroundColor: '#FFF9EF',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	imageContainer: {
		width: '100%',
		height: 200,
		backgroundColor: '#F5E6D3',
		justifyContent: 'center',
		alignItems: 'center',
		overflow: 'hidden',
	},
	image: {
		width: '100%',
		height: '100%',
		backgroundColor: 'transparent',
	},
	imageInfo: {
		padding: 12,
	},
	imageTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#3B2F1B',
		marginBottom: 4,
	},
	imageMeta: {
		fontSize: 11,
		color: '#6B5B3D',
		marginBottom: 2,
	},
	deleteButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#DC2626',
		paddingVertical: 10,
		paddingHorizontal: 16,
		gap: 6,
		margin: 12,
		borderRadius: 8,
		minHeight: 44, // Ensure touch target is large enough
	},
	deleteButtonDisabled: {
		opacity: 0.6,
	},
	deleteButtonText: {
		color: '#FFFFFF',
		fontWeight: '600',
		fontSize: 14,
	},
});

export default AdminImagesScreen;
