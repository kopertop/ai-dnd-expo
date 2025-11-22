import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Animated,
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export interface Command {
	id: string;
	label: string;
	description?: string;
	keywords: string[];
	icon?: string;
	action: () => void;
	category?: string;
}

interface CommandPaletteProps {
	visible: boolean;
	onClose: () => void;
	commands: Command[];
	onAIRequest?: (prompt: string) => Promise<string>;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
	visible,
	onClose,
	commands,
	onAIRequest,
}) => {
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [aiPrompt, setAiPrompt] = useState('');
	const [aiLoading, setAiLoading] = useState(false);
	const [aiResponse, setAiResponse] = useState<string | null>(null);
	const insets = useSafeAreaInsets();
	const fadeAnim = React.useRef(new Animated.Value(0)).current;
	const inputRef = React.useRef<TextInput>(null);

	useEffect(() => {
		if (visible) {
			Animated.spring(fadeAnim, {
				toValue: 1,
				useNativeDriver: true,
				tension: 50,
				friction: 7,
			}).start();
			// Focus input after animation
			setTimeout(() => {
				inputRef.current?.focus();
			}, 100);
		} else {
			Animated.spring(fadeAnim, {
				toValue: 0,
				useNativeDriver: true,
				tension: 50,
				friction: 7,
			}).start();
			setSearchQuery('');
			setAiPrompt('');
			setAiResponse(null);
			setSelectedIndex(0);
		}
	}, [visible, fadeAnim]);

	// Handle keyboard shortcuts
	useEffect(() => {
		if (!visible) return;

		const handleKeyDown = (e: globalThis.KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			} else if (e.key === 'ArrowDown') {
				e.preventDefault();
				setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				setSelectedIndex(prev => Math.max(prev - 1, 0));
			} else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
				e.preventDefault();
				filteredCommands[selectedIndex].action();
				onClose();
			}
		};

		if (Platform.OS === 'web') {
			window.addEventListener('keydown', handleKeyDown);
			return () => window.removeEventListener('keydown', handleKeyDown);
		}
	}, [visible, selectedIndex, onClose]);

	const filteredCommands = useMemo(() => {
		if (!searchQuery.trim()) {
			return commands;
		}

		const query = searchQuery.toLowerCase();
		return commands.filter(cmd =>
			cmd.label.toLowerCase().includes(query) ||
			cmd.keywords.some(kw => kw.toLowerCase().includes(query)) ||
			cmd.description?.toLowerCase().includes(query) ||
			cmd.category?.toLowerCase().includes(query)
		);
	}, [commands, searchQuery]);

	// Reset selected index when filtered results change
	useEffect(() => {
		if (filteredCommands.length > 0) {
			setSelectedIndex(0);
		}
	}, [filteredCommands.length]);

	const handleAIRequest = useCallback(async () => {
		if (!onAIRequest || !aiPrompt.trim()) return;

		setAiLoading(true);
		setAiResponse(null);
		try {
			const response = await onAIRequest(aiPrompt);
			setAiResponse(response);
		} catch (error) {
			console.error('AI request failed:', error);
			setAiResponse('Failed to get AI response');
		} finally {
			setAiLoading(false);
		}
	}, [onAIRequest, aiPrompt]);

	const opacity = fadeAnim;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={onClose}
		>
			<Animated.View style={[styles.overlay, { opacity }]}>
				<TouchableOpacity
					style={styles.overlayTouchable}
					activeOpacity={1}
					onPress={onClose}
				>
					<TouchableOpacity
						activeOpacity={1}
						onPress={(e) => e.stopPropagation()}
						style={[
							styles.palette,
							{
								marginTop: insets.top + 100,
								marginBottom: insets.bottom + 20,
							},
						]}
					>
						<ThemedView style={styles.paletteContent}>
							<View style={styles.header}>
								<ThemedText type="subtitle" style={styles.headerTitle}>
									Command Palette
								</ThemedText>
								<ThemedText style={styles.hint}>
									{Platform.OS === 'web' ? 'Press ESC to close' : 'Tap outside to close'}
								</ThemedText>
							</View>

							{/* Search Input */}
							<TextInput
								ref={inputRef}
								style={styles.searchInput}
								placeholder="Search commands or ask AI..."
								value={searchQuery}
								onChangeText={setSearchQuery}
								placeholderTextColor="#6B5B3D"
								autoFocus
								returnKeyType="search"
							/>

							{/* AI Assistant Section */}
							{onAIRequest && (
								<View style={styles.aiSection}>
									<ThemedText style={styles.sectionTitle}>AI Assistant</ThemedText>
									<TextInput
										style={styles.aiInput}
										placeholder="Ask the AI for help..."
										value={aiPrompt}
										onChangeText={setAiPrompt}
										placeholderTextColor="#6B5B3D"
										multiline
										numberOfLines={3}
									/>
									<TouchableOpacity
										style={[styles.aiButton, aiLoading && styles.aiButtonDisabled]}
										onPress={handleAIRequest}
										disabled={aiLoading || !aiPrompt.trim()}
									>
										<ThemedText style={styles.aiButtonText}>
											{aiLoading ? 'Processing...' : 'Ask AI'}
										</ThemedText>
									</TouchableOpacity>
									{aiResponse && (
										<View style={styles.aiResponse}>
											<ThemedText style={styles.aiResponseText}>{aiResponse}</ThemedText>
										</View>
									)}
								</View>
							)}

							{/* Commands List */}
							<View style={styles.commandsSection}>
								<ThemedText style={styles.sectionTitle}>
									Commands ({filteredCommands.length})
								</ThemedText>
								<ScrollView style={styles.commandsList} nestedScrollEnabled>
									{filteredCommands.length === 0 ? (
										<View style={styles.emptyState}>
											<ThemedText style={styles.emptyText}>No commands found</ThemedText>
										</View>
									) : (
										filteredCommands.map((cmd, index) => (
											<TouchableOpacity
												key={cmd.id}
												style={[
													styles.commandItem,
													index === selectedIndex && styles.commandItemSelected,
												]}
												onPress={() => {
													cmd.action();
													onClose();
												}}
											>
												<View style={styles.commandContent}>
													<ThemedText style={styles.commandLabel}>{cmd.label}</ThemedText>
													{cmd.description && (
														<ThemedText style={styles.commandDescription}>
															{cmd.description}
														</ThemedText>
													)}
												</View>
												{cmd.category && (
													<View style={styles.commandCategory}>
														<ThemedText style={styles.commandCategoryText}>
															{cmd.category}
														</ThemedText>
													</View>
												)}
											</TouchableOpacity>
										))
									)}
								</ScrollView>
							</View>
						</ThemedView>
					</TouchableOpacity>
				</TouchableOpacity>
			</Animated.View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	overlayTouchable: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	palette: {
		width: '90%',
		maxWidth: 600,
		maxHeight: '80%',
	},
	paletteContent: {
		backgroundColor: '#FFF9EF',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#C9B037',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: '700',
	},
	hint: {
		fontSize: 12,
		color: '#6B5B3D',
	},
	searchInput: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
		margin: 16,
		fontSize: 16,
		color: '#3B2F1B',
	},
	aiSection: {
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#E2D3B3',
		gap: 12,
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#8B6914',
		marginBottom: 8,
	},
	aiInput: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 14,
		color: '#3B2F1B',
		minHeight: 80,
		textAlignVertical: 'top',
	},
	aiButton: {
		backgroundColor: '#4A6741',
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
	},
	aiButtonDisabled: {
		opacity: 0.5,
	},
	aiButtonText: {
		color: '#FFF9EF',
		fontSize: 14,
		fontWeight: '600',
	},
	aiResponse: {
		backgroundColor: '#E8F5E9',
		borderRadius: 8,
		padding: 12,
		borderLeftWidth: 3,
		borderLeftColor: '#4A6741',
	},
	aiResponseText: {
		fontSize: 14,
		color: '#2E7D32',
		lineHeight: 20,
	},
	commandsSection: {
		flex: 1,
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	commandsList: {
		maxHeight: 300,
	},
	commandItem: {
		padding: 12,
		borderRadius: 8,
		marginBottom: 8,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2D3B3',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	commandItemSelected: {
		backgroundColor: '#E9D8A6',
		borderColor: '#C9B037',
		borderWidth: 2,
	},
	commandContent: {
		flex: 1,
		gap: 4,
	},
	commandLabel: {
		fontSize: 16,
		fontWeight: '600',
		color: '#3B2F1B',
	},
	commandDescription: {
		fontSize: 12,
		color: '#6B5B3D',
	},
	commandCategory: {
		backgroundColor: '#E2D3B3',
		borderRadius: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	commandCategoryText: {
		fontSize: 10,
		color: '#6B5B3D',
		fontWeight: '600',
	},
	emptyState: {
		padding: 32,
		alignItems: 'center',
	},
	emptyText: {
		color: '#6B5B3D',
		fontSize: 14,
	},
});

