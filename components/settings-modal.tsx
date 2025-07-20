import { Slider, Switch } from '@expo/ui/swift-ui';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { useSettingsStore } from '../stores/settings-store';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { TTSVoice, useTextToSpeech } from '@/hooks/use-text-to-speech';

interface SettingsModalProps {
	visible: boolean;
	onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
	const {
		musicVolume,
		isMusicMuted,
		voice: voiceSettings,
		setMusicVolume,
		setMusicMuted,
		updateVoiceSettings,
	} = useSettingsStore();

	const { availableVoices } = useTextToSpeech();
	const [selectedVoice, setSelectedVoice] = useState<TTSVoice | null>(null);

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

	return (
		<Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
			<ThemedView style={styles.centeredView}>
				<ThemedView style={styles.modalView}>
					<ThemedText type="subtitle">Settings</ThemedText>

					<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
						{/* Music Settings */}
						<ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
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

						{/* Voice Settings */}
						<ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
							Voice & Speech
						</ThemedText>

						<View style={styles.settingItem}>
							<ThemedText>Text-to-Speech</ThemedText>
							<Switch
								value={voiceSettings.ttsEnabled}
								onValueChange={value =>
									handleVoiceSettingChange('ttsEnabled', value)
								}
								color="#2196F3"
								label=""
								variant="switch"
							/>
						</View>

						<View style={styles.settingItem}>
							<ThemedText>Speech-to-Text</ThemedText>
							<Switch
								value={voiceSettings.sttEnabled}
								onValueChange={value =>
									handleVoiceSettingChange('sttEnabled', value)
								}
								color="#2196F3"
								label=""
								variant="switch"
							/>
						</View>

						<View style={styles.settingItem}>
							<ThemedText>Auto-speak DM Messages</ThemedText>
							<Switch
								value={voiceSettings.autoSpeak}
								onValueChange={value =>
									handleVoiceSettingChange('autoSpeak', value)
								}
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
									onValueChange={value =>
										handleVoiceSettingChange('volume', value)
									}
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
						{availableVoices.length > 0 && (
							<View style={styles.settingItem}>
								<ThemedText>Voice</ThemedText>
								<ThemedText style={styles.voiceText}>
									{selectedVoice?.name || 'Default'}
								</ThemedText>
							</View>
						)}
					</ScrollView>

					<TouchableOpacity style={styles.closeButton} onPress={onClose}>
						<ThemedText style={styles.closeButtonText}>Close</ThemedText>
					</TouchableOpacity>
				</ThemedView>
			</ThemedView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	centeredView: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalView: {
		margin: 20,
		borderRadius: 20,
		padding: 35,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
		maxHeight: '80%',
		width: '90%',
	},
	scrollView: {
		width: '100%',
		maxHeight: 400,
	},
	sectionTitle: {
		marginTop: 20,
		marginBottom: 10,
		fontSize: 16,
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		width: '100%',
		marginTop: 15,
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
	},
	voiceText: {
		fontSize: 14,
		color: '#666',
		maxWidth: 150,
		textAlign: 'right',
	},
	toggleText: {
		color: '#2196F3',
		fontWeight: 'bold',
		fontSize: 16,
	},
	closeButton: {
		marginTop: 20,
		backgroundColor: '#2196F3',
		borderRadius: 20,
		padding: 10,
		elevation: 2,
	},
	closeButtonText: {
		color: 'white',
		fontWeight: 'bold',
		textAlign: 'center',
	},
});
