import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from 'expo-auth-template/frontend';
import { Platform } from 'react-native';

export interface UploadedImage {
	id: string;
	user_id: string;
	filename: string;
	r2_key: string;
	public_url: string;
	title: string | null;
	description: string | null;
	image_type: 'npc' | 'character' | 'both';
	is_public: number;
	created_at: number;
	updated_at: number;
}

interface ImageListResponse {
	images: UploadedImage[];
}

interface UploadImageParams {
	file: any; // Expo ImagePicker asset or File
	title?: string;
	description?: string;
	image_type: 'npc' | 'character' | 'both';
}

export const useUploadedImages = (type?: 'npc' | 'character' | 'both') => {
	return useQuery({
		queryKey: ['uploaded-images', type],
		queryFn: async () => {
			const queryParams = type ? `?type=${type}` : '';
			const response = await apiService.fetchApi<{ images: UploadedImage[] }>(`/images${queryParams}`, {
				method: 'GET',
			});

			return response.images;
		},
	});
};

export const useUploadImage = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (params: UploadImageParams) => {
			const formData = new FormData();

			// Handle Expo ImagePicker asset vs web File
			if ('uri' in params.file) {
				if (Platform.OS === 'web') {
					// Web: fetch the blob from the blob: URI
					const res = await fetch(params.file.uri);
					const blob = await res.blob();
					formData.append('file', blob, params.file.fileName || 'image.jpg');
				} else {
					// React Native / Expo
					const uri = params.file.uri;
					const name = uri.split('/').pop() || 'image.jpg';
					const match = /\.(\w+)$/.exec(name);
					const type = match ? `image/${match[1]}` : 'image/jpeg';

					// @ts-ignore - React Native FormData expects an object with uri, name, type
					formData.append('file', { uri, name, type });
				}
			} else {
				// Web
				formData.append('file', params.file);
			}

			if (params.title) formData.append('title', params.title);
			if (params.description) formData.append('description', params.description);
			formData.append('image_type', params.image_type);

			console.log('FormData:', formData);

			const response = await apiService.fetchApi<{ image: UploadedImage }>('/images/upload', {
				method: 'POST',
				body: formData,
			});

			return response.image;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['uploaded-images'] });
		},
	});
};

export const useDeleteImage = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (imageId: string) => {
			await apiService.fetchApi(`/images/${imageId}`, {
				method: 'DELETE',
			});

			return true;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['uploaded-images'] });
		},
	});
};
