import { Slider, Switch } from '@expo/ui/swift-ui';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useSettingsStore } from '../stores/settings-store';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

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
				</View>
			</ScrollView>
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
});
