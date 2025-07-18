import { Feather } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Modal,
	ScrollView,
	Alert,
	ActivityIndicator,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dndAIService } from '@/services/ai/dnd-ai-service';

interface ModelInfo {
	id: string;
	name: string;
	description: string;
	size: string;
	isDownloaded: boolean;
	isDownloading: boolean;
	progress: number;
}

interface ModelManagementProps {
	visible: boolean;
	onClose: () => void;
	onModelSelected?: (modelId: string) => void;
}

export const ModelManagement: React.FC<ModelManagementProps> = ({
	visible,
	onClose,
	onModelSelected,
}) => {
	const colorScheme = useColorScheme();
	const [models, setModels] = useState<ModelInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedModel, setSelectedModel] = useState<string>('gemma-3-2b-instruct');

	useEffect(() => {
		if (visible) {
			loadAvailableModels();
		}
	}, [visible]);

	const loadAvailableModels = async () => {
		try {
			setLoading(true);
			
			// Initialize the AI service
			await dndAIService.initialize();
			
			// Get available models
			const availableModels = await dndAIService.getAvailableModels();
			
			// Map to model info with D&D-specific descriptions
			const modelInfos: ModelInfo[] = availableModels.map((modelId) => ({
				id: modelId,
				name: getModelDisplayName(modelId),
				description: getModelDescription(modelId),
				size: getModelSize(modelId),
				isDownloaded: false, // TODO: Check if model is actually downloaded
				isDownloading: false,
				progress: 0,
			}));

			setModels(modelInfos);
		} catch (error) {
			console.error('Failed to load available models:', error);
			Alert.alert('Error', 'Failed to load available models. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const downloadModel = async (modelId: string) => {
		try {
			setModels(prevModels =>
				prevModels.map(model =>
					model.id === modelId
						? { ...model, isDownloading: true, progress: 0 }
						: model,
				),
			);

			await dndAIService.downloadModel(modelId, (progress) => {
				setModels(prevModels =>
					prevModels.map(model =>
						model.id === modelId
							? { ...model, progress }
							: model,
					),
				);
			});

			setModels(prevModels =>
				prevModels.map(model =>
					model.id === modelId
						? { ...model, isDownloaded: true, isDownloading: false, progress: 100 }
						: model,
				),
			);

			Alert.alert('Success', `${getModelDisplayName(modelId)} is ready for D&D adventures!`);
		} catch (error) {
			console.error('Failed to download model:', error);
			Alert.alert('Error', 'Failed to download model. Please try again.');
			
			setModels(prevModels =>
				prevModels.map(model =>
					model.id === modelId
						? { ...model, isDownloading: false, progress: 0 }
						: model,
				),
			);
		}
	};

	const selectModel = (modelId: string) => {
		setSelectedModel(modelId);
		onModelSelected?.(modelId);
	};

	const getModelDisplayName = (modelId: string): string => {
		switch (modelId) {
		case 'gemma-3-2b-instruct':
			return 'Gemma 3 2B - Quick DM';
		case 'gemma-3-8b-instruct':
			return 'Gemma 3 8B - Advanced DM';
		default:
			return modelId;
		}
	};

	const getModelDescription = (modelId: string): string => {
		switch (modelId) {
		case 'gemma-3-2b-instruct':
			return 'Fast and efficient D&D Dungeon Master. Great for quick responses and mobile gameplay.';
		case 'gemma-3-8b-instruct':
			return 'More advanced D&D Dungeon Master with better reasoning and creativity. Requires more storage.';
		default:
			return 'AI model for D&D gameplay';
		}
	};

	const getModelSize = (modelId: string): string => {
		switch (modelId) {
		case 'gemma-3-2b-instruct':
			return '~1.5 GB';
		case 'gemma-3-8b-instruct':
			return '~5.5 GB';
		default:
			return 'Unknown';
		}
	};

	const renderModelCard = (model: ModelInfo) => (
		<View
			key={model.id}
			style={[
				styles.modelCard,
				{
					backgroundColor: Colors[colorScheme ?? 'light'].background,
					borderColor: Colors[colorScheme ?? 'light'].tabIconDefault,
				},
				selectedModel === model.id && {
					borderColor: Colors[colorScheme ?? 'light'].tint,
					borderWidth: 2,
				},
			]}
		>
			<TouchableOpacity
				onPress={() => selectModel(model.id)}
				style={styles.modelCardContent}
			>
				<View style={styles.modelHeader}>
					<Text
						style={[
							styles.modelName,
							{ color: Colors[colorScheme ?? 'light'].text },
						]}
					>
						{model.name}
					</Text>
					<Text
						style={[
							styles.modelSize,
							{ color: Colors[colorScheme ?? 'light'].tabIconDefault },
						]}
					>
						{model.size}
					</Text>
				</View>
				
				<Text
					style={[
						styles.modelDescription,
						{ color: Colors[colorScheme ?? 'light'].tabIconDefault },
					]}
				>
					{model.description}
				</Text>

				<View style={styles.modelActions}>
					{model.isDownloading ? (
						<View style={styles.downloadProgress}>
							<ActivityIndicator size="small" color={Colors[colorScheme ?? 'light'].tint} />
							<Text
								style={[
									styles.progressText,
									{ color: Colors[colorScheme ?? 'light'].text },
								]}
							>
								{model.progress.toFixed(1)}%
							</Text>
						</View>
					) : model.isDownloaded ? (
						<View style={styles.downloadedBadge}>
							<Feather name="check-circle" size={16} color="#4CAF50" />
							<Text style={[styles.downloadedText, { color: '#4CAF50' }]}>
								Ready
							</Text>
						</View>
					) : (
						<TouchableOpacity
							onPress={() => downloadModel(model.id)}
							style={[
								styles.downloadButton,
								{ backgroundColor: Colors[colorScheme ?? 'light'].tint },
							]}
						>
							<Feather name="download" size={16} color="white" />
							<Text style={styles.downloadButtonText}>Download</Text>
						</TouchableOpacity>
					)}
				</View>
			</TouchableOpacity>
		</View>
	);

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
		>
			<View
				style={[
					styles.container,
					{ backgroundColor: Colors[colorScheme ?? 'light'].background },
				]}
			>
				<View style={styles.header}>
					<Text
						style={[
							styles.title,
							{ color: Colors[colorScheme ?? 'light'].text },
						]}
					>
						🎲 D&D AI Models
					</Text>
					<TouchableOpacity onPress={onClose} style={styles.closeButton}>
						<Feather
							name="x"
							size={24}
							color={Colors[colorScheme ?? 'light'].text}
						/>
					</TouchableOpacity>
				</View>

				<Text
					style={[
						styles.subtitle,
						{ color: Colors[colorScheme ?? 'light'].tabIconDefault },
					]}
				>
					Choose and download AI models for your D&D adventures. Models run locally on your device for privacy and offline play.
				</Text>

				<ScrollView style={styles.content}>
					{loading ? (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
							<Text
								style={[
									styles.loadingText,
									{ color: Colors[colorScheme ?? 'light'].text },
								]}
							>
								Loading available models...
							</Text>
						</View>
					) : (
						<View style={styles.modelList}>
							{models.map(renderModelCard)}
						</View>
					)}
				</ScrollView>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingTop: 50,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 16,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 20,
		paddingHorizontal: 20,
		marginBottom: 20,
	},
	closeButton: {
		padding: 8,
	},
	content: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 40,
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16,
	},
	modelList: {
		paddingHorizontal: 20,
		paddingBottom: 40,
	},
	modelCard: {
		borderRadius: 12,
		borderWidth: 1,
		marginBottom: 16,
		overflow: 'hidden',
	},
	modelCardContent: {
		padding: 16,
	},
	modelHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	modelName: {
		fontSize: 18,
		fontWeight: '600',
		flex: 1,
	},
	modelSize: {
		fontSize: 14,
		fontWeight: '500',
	},
	modelDescription: {
		fontSize: 14,
		lineHeight: 18,
		marginBottom: 16,
	},
	modelActions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	downloadButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		gap: 6,
	},
	downloadButtonText: {
		color: 'white',
		fontSize: 14,
		fontWeight: '600',
	},
	downloadProgress: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	progressText: {
		fontSize: 14,
		fontWeight: '500',
	},
	downloadedBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	downloadedText: {
		fontSize: 14,
		fontWeight: '600',
	},
});

export default ModelManagement;