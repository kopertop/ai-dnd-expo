import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ActivityIndicator, Image, Text, Platform } from 'react-native';
import { ExpoIcon } from '@/components/expo-icon';
import { ThemedText } from '@/components/themed-text';
import * as DocumentPicker from 'expo-document-picker';
import { fetchAPI, uploadFile } from '@/lib/fetch';
import { MediaLibraryModal } from '@/components/media-library-modal';

interface ImageUploaderProps {
	value?: string | null;
	onChange: (url: string) => void;
	folder?: string;
	placeholder?: string;
}

export function ImageUploader({ value, onChange, folder = 'misc', placeholder = 'Upload Image' }: ImageUploaderProps) {
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [mediaModalVisible, setMediaModalVisible] = useState(false);

	const pickImage = async () => {
		try {
			setError(null);
			const result = await DocumentPicker.getDocumentAsync({
				type: ['image/png', 'image/jpeg', 'image/webp'],
				copyToCacheDirectory: true,
			});

			if (result.canceled) return;

			setUploading(true);
			const asset = result.assets[0];

			// Prepare form data
			const formData = new FormData();
			// React Native's FormData expects { uri, name, type } for file fields
			const file = {
				uri: asset.uri,
				name: asset.name,
				type: asset.mimeType || 'image/jpeg',
			} as any;

			formData.append('file', file);
			formData.append('title', asset.name);
			formData.append('image_type', 'both');

			// Upload using the helper which handles auth tokens
			const response = await uploadFile<{ image: { public_url: string } }>('/api/images/upload', formData);

			onChange(response.image.public_url);
		} catch (err: any) {
			console.error('Upload failed:', err);
			setError(err.message || 'Failed to upload image');
		} finally {
			setUploading(false);
		}
	};

	return (
		<View style={styles.container}>
			<TouchableOpacity style={styles.uploadArea} onPress={() => setMediaModalVisible(true)} disabled={uploading}>
				{value ? (
					<Image source={{ uri: value }} style={styles.preview} resizeMode="contain" />
				) : (
					<View style={styles.placeholder}>
						{uploading ? (
							<ActivityIndicator color="#8B6914" />
						) : (
							<>
								<ExpoIcon icon="Feather:image" size={24} color="#8B6914" />
								<ThemedText style={styles.placeholderText}>{placeholder}</ThemedText>
							</>
						)}
					</View>
				)}
			</TouchableOpacity>

			<View style={styles.actions}>
				<TouchableOpacity style={styles.actionBtn} onPress={() => setMediaModalVisible(true)}>
					<ThemedText style={styles.actionBtnText}>Select from Library</ThemedText>
				</TouchableOpacity>

				<TouchableOpacity style={styles.actionBtn} onPress={pickImage} disabled={uploading}>
					<ThemedText style={styles.actionBtnText}>Upload New File</ThemedText>
				</TouchableOpacity>
			</View>

			{error && <ThemedText style={styles.errorText}>{error}</ThemedText>}

			<MediaLibraryModal
				visible={mediaModalVisible}
				onClose={() => setMediaModalVisible(false)}
				onSelect={(url) => {
					onChange(url);
					setMediaModalVisible(false);
				}}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	uploadArea: {
		width: '100%',
		height: 200,
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderStyle: 'dashed',
		borderRadius: 8,
		overflow: 'hidden',
		justifyContent: 'center',
		alignItems: 'center',
	},
	preview: {
		width: '100%',
		height: '100%',
		backgroundColor: '#222',
	},
	placeholder: {
		alignItems: 'center',
		gap: 8,
	},
	placeholderText: {
		color: '#8B6914',
		fontSize: 14,
	},
	actions: {
		flexDirection: 'row',
		gap: 10,
		marginTop: 8,
		justifyContent: 'center',
	},
	actionBtn: {
		alignItems: 'center',
	},
	actionBtnText: {
		color: '#6B5B3D',
		fontSize: 14,
		textDecorationLine: 'underline',
	},
	errorText: {
		color: '#8B2323',
		fontSize: 12,
		marginTop: 4,
	},
});
