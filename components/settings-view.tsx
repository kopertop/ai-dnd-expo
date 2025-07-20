import { Feather } from '@expo/vector-icons';
import { Slider, Switch } from '@expo/ui/swift-ui';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { useSettingsStore } from '../stores/settings-store';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { useGameState } from '@/hooks/use-game-state';
import { TTSVoice, useTextToSpeech } from '@/hooks/use-text-to-speech';

export const SettingsView: React.FC = () => {
	const {
		musicVolume,
		isMusicMuted,
		voice: voiceSettings,
		setMusicVolume,
		setMusicMuted,
		updateVoiceSettings,
	} = useSettingsStore();

	const { availableVoices, speak, stop, isSpeaking } = useTextToSpeech();
	const { gameState, save } = useGameState();
	const [selectedVoice, setSelectedVoice] = useState<TTSVoice | null>(null);
	const [isVoicePickerVisible, setIsVoicePickerVisible] = useState(false);
	const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

	// Filter voices by preferred language
	const filteredVoices = availableVoices.filter(voice => {
		const voiceLanguage = voice.language.toLowerCase();
		const preferredLanguage = (voiceSettings.preferredLanguage || 'en').toLowerCase();
		return voiceLanguage.startsWith(preferredLanguage);
	});

	// Find the currently selected voice
	useEffect(() => {
		if (voiceSettings.selectedVoiceId && availableVoices.length > 0) {
			const voice = availableVoices.find(v => v.identifier === voiceSettings.selectedVoiceId);
			setSelectedVoice(voice || null);
		}
	}, [voiceSettings.selectedVoiceId, availableVoices]);

	const handleVolumeChange = (value: number) => {
		setMusicVolume(value);
	};

	const handleVoiceSettingChange = (key: keyof typeof voiceSettings, value: any) => {
		updateVoiceSettings({ [key]: value });
	};

	const handleVoiceSelect = (voice: TTSVoice) => {
		updateVoiceSettings({ selectedVoiceId: voice.identifier });
		setSelectedVoice(voice);
		setIsVoicePickerVisible(false);
	};

	const handleVoicePreview = async (voice: TTSVoice) => {
		if (playingVoiceId === voice.identifier && isSpeaking) {
			// Stop if currently playing this voice
			stop();
			setPlayingVoiceId(null);
		} else {
			// Stop any current speech first
			stop();
			setPlayingVoiceId(voice.identifier);
			
			// Sample text for voice testing
			const sampleText = "Greetings, adventurer! Your quest begins in the ancient tavern where mysterious shadows dance upon the walls.";
			
			try {
				await speak(sampleText, {
					voice: voice.identifier,
					onDone: () => setPlayingVoiceId(null),
					onStopped: () => setPlayingVoiceId(null),
					onError: () => setPlayingVoiceId(null),
				});
			} catch (error) {
				console.error('Voice preview error:', error);
				setPlayingVoiceId(null);
			}
		}
	};

	const handleSaveAndQuit = async () => {
		if (!gameState) {
			Alert.alert('Error', 'No game to save');
			return;
		}

		try {
			// Save the current game state
			await save(gameState);

			// Show confirmation and navigate back to main menu
			Alert.alert(
				'Game Saved',
				'Your game has been saved successfully. You can continue it later from the main menu.',
				[
					{
						text: 'OK',
						onPress: () => router.replace('/'),
					},
				],
			);
		} catch (error) {
			Alert.alert('Error', 'Failed to save game. Please try again.');
			console.error('Save and quit error:', error);
		}
	};

	return (
		<ThemedView style={styles.container}>
			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
				{/* Music Settings */}
				<View style={styles.section}>
					<ThemedText type="subtitle" style={styles.sectionTitle}>
						Music
					</ThemedText>

					<View style={styles.settingItem}>
						<ThemedText>Music Volume</ThemedText>
						<View style={styles.volumeSliderContainer}>
							<Slider
								style={styles.volumeSlider}
								value={musicVolume}
								onValueChange={isMusicMuted ? undefined : handleVolumeChange}
							/>
							<ThemedText style={styles.volumeText}>
								{Math.round(musicVolume * 100)}%
							</ThemedText>
						</View>
					</View>

					<View style={styles.settingItem}>
						<ThemedText>Mute Music</ThemedText>
						<Switch
							value={!isMusicMuted}
							onValueChange={value => setMusicMuted(!value)}
							color="#2196F3"
							label=""
							variant="switch"
						/>
					</View>
				</View>

				{/* Voice Settings */}
				<View style={styles.section}>
					<ThemedText type="subtitle" style={styles.sectionTitle}>
						Voice & Speech
					</ThemedText>

					<View style={styles.settingItem}>
						<ThemedText>Text-to-Speech</ThemedText>
						<Switch
							value={voiceSettings.ttsEnabled}
							onValueChange={value => handleVoiceSettingChange('ttsEnabled', value)}
							color="#2196F3"
							label=""
							variant="switch"
						/>
					</View>

					<View style={styles.settingItem}>
						<ThemedText>Speech-to-Text</ThemedText>
						<Switch
							value={voiceSettings.sttEnabled}
							onValueChange={value => handleVoiceSettingChange('sttEnabled', value)}
							color="#2196F3"
							label=""
							variant="switch"
						/>
					</View>

					<View style={styles.settingItem}>
						<ThemedText>Auto-speak DM Messages</ThemedText>
						<Switch
							value={voiceSettings.autoSpeak}
							onValueChange={value => handleVoiceSettingChange('autoSpeak', value)}
							color="#2196F3"
							label=""
							variant="switch"
						/>
					</View>

					<View style={styles.settingItem}>
						<ThemedText>Speech Volume</ThemedText>
						<View style={styles.volumeSliderContainer}>
							<Slider
								style={styles.volumeSlider}
								value={voiceSettings.volume}
								onValueChange={value => handleVoiceSettingChange('volume', value)}
							/>
							<ThemedText style={styles.volumeText}>
								{Math.round(voiceSettings.volume * 100)}%
							</ThemedText>
						</View>
					</View>

					<View style={styles.settingItem}>
						<ThemedText>Speech Rate</ThemedText>
						<View style={styles.volumeSliderContainer}>
							<Slider
								style={styles.volumeSlider}
								value={voiceSettings.speechRate}
								onValueChange={value =>
									handleVoiceSettingChange('speechRate', value)
								}
							/>
							<ThemedText style={styles.volumeText}>
								{voiceSettings.speechRate.toFixed(1)}x
							</ThemedText>
						</View>
					</View>

					{/* Voice Selection */}
					{filteredVoices.length > 0 && (
						<TouchableOpacity 
							style={styles.settingItem}
							onPress={() => setIsVoicePickerVisible(true)}
						>
							<View style={styles.voiceSettingContent}>
								<ThemedText>Voice</ThemedText>
								<ThemedText style={styles.voiceCount}>
									{filteredVoices.length} {(voiceSettings.preferredLanguage || 'EN').toUpperCase()} voices
								</ThemedText>
							</View>
							<View style={styles.voiceSelectionContainer}>
								<ThemedText style={styles.voiceText}>
									{selectedVoice?.name || 'Default'}
								</ThemedText>
								<ThemedText style={styles.chevronText}>›</ThemedText>
							</View>
						</TouchableOpacity>
					)}
				</View>

				{/* Game Management Section */}
				<View style={styles.section}>
					<ThemedText type="subtitle" style={styles.sectionTitle}>
						Game Management
					</ThemedText>

					<TouchableOpacity
						style={styles.saveAndQuitButton}
						onPress={handleSaveAndQuit}
						activeOpacity={0.8}
					>
						<ThemedText style={styles.saveAndQuitButtonText}>Save and Quit</ThemedText>
					</TouchableOpacity>
				</View>
			</ScrollView>

			{/* Voice Selection Modal */}
			<Modal
				visible={isVoicePickerVisible}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setIsVoicePickerVisible(false)}
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<ThemedText type="title" style={styles.modalTitle}>
							Select Voice
						</ThemedText>
						<TouchableOpacity 
							onPress={() => setIsVoicePickerVisible(false)}
							style={styles.closeButton}
						>
							<ThemedText style={styles.closeButtonText}>Done</ThemedText>
						</TouchableOpacity>
					</View>
					
					<ScrollView style={styles.voiceList}>
						{filteredVoices.map((voice) => (
							<View
								key={voice.identifier}
								style={[
									styles.voiceItem,
									selectedVoice?.identifier === voice.identifier && styles.selectedVoiceItem
								]}
							>
								<TouchableOpacity
									style={styles.voiceItemContent}
									onPress={() => handleVoiceSelect(voice)}
								>
									<View style={styles.voiceInfo}>
										<ThemedText style={styles.voiceName}>{voice.name}</ThemedText>
										<ThemedText style={styles.voiceDetails}>
											{voice.language} • {voice.quality}
										</ThemedText>
									</View>
								</TouchableOpacity>
								
								<View style={styles.voiceActions}>
									<TouchableOpacity
										style={styles.playButton}
										onPress={() => handleVoicePreview(voice)}
									>
										<Feather
											name={
												playingVoiceId === voice.identifier && isSpeaking
													? "pause-circle"
													: "play-circle"
											}
											size={24}
											color="#C9B037"
										/>
									</TouchableOpacity>
									
									{selectedVoice?.identifier === voice.identifier && (
										<ThemedText style={styles.checkmark}>✓</ThemedText>
									)}
								</View>
							</View>
						))}
					</ScrollView>
				</View>
			</Modal>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F9F6EF',
	},
	scrollView: {
		flex: 1,
		padding: 20,
	},
	section: {
		marginBottom: 32,
	},
	sectionTitle: {
		marginBottom: 16,
		fontSize: 20,
		fontWeight: 'bold',
		color: '#3B2F1B',
		borderBottomWidth: 2,
		borderBottomColor: '#C9B037',
		paddingBottom: 8,
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		width: '100%',
		marginTop: 16,
		paddingVertical: 8,
	},
	volumeSliderContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		flex: 1,
		marginLeft: 16,
	},
	volumeSlider: {
		flex: 1,
		minHeight: 60,
	},
	volumeText: {
		fontSize: 14,
		fontWeight: 'bold',
		minWidth: 40,
		textAlign: 'right',
		color: '#3B2F1B',
	},
	voiceText: {
		fontSize: 14,
		color: '#8B7355',
		maxWidth: 150,
		textAlign: 'right',
	},
	voiceSettingContent: {
		flex: 1,
	},
	voiceCount: {
		fontSize: 12,
		color: '#8B7355',
		marginTop: 2,
	},
	voiceSelectionContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	chevronText: {
		fontSize: 18,
		color: '#8B7355',
		fontWeight: 'bold',
	},
	modalContainer: {
		flex: 1,
		backgroundColor: '#F9F6EF',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#E0D0B8',
	},
	modalTitle: {
		color: '#3B2F1B',
	},
	closeButton: {
		padding: 8,
	},
	closeButtonText: {
		color: '#C9B037',
		fontWeight: 'bold',
		fontSize: 16,
	},
	voiceList: {
		flex: 1,
		padding: 20,
	},
	voiceItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 16,
		paddingHorizontal: 16,
		backgroundColor: '#FFFFFF',
		marginBottom: 8,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E0D0B8',
	},
	selectedVoiceItem: {
		backgroundColor: '#F0F4F8',
		borderColor: '#C9B037',
		borderWidth: 2,
	},
	voiceItemContent: {
		flex: 1,
	},
	voiceInfo: {
		flex: 1,
	},
	voiceActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	playButton: {
		padding: 8,
		borderRadius: 20,
		backgroundColor: 'rgba(201, 176, 55, 0.1)',
	},
	voiceName: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginBottom: 4,
	},
	voiceDetails: {
		fontSize: 14,
		color: '#8B7355',
	},
	checkmark: {
		fontSize: 18,
		color: '#C9B037',
		fontWeight: 'bold',
	},
	saveAndQuitButton: {
		backgroundColor: '#C9B037',
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 8,
		alignItems: 'center',
		marginTop: 16,
		borderWidth: 2,
		borderColor: '#B8A035',
	},
	saveAndQuitButtonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 18,
	},
});
