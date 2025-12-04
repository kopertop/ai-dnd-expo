import React, { useEffect, useState } from 'react';
import {
	Modal,
	Platform,
	ScrollView,
	StyleSheet,
	Switch as RNSwitch,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import { useSettingsStore } from '../stores/settings-store';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { TTSVoice, useTextToSpeech } from '@/hooks/use-text-to-speech';

let ModalSwiftSwitch: any = null;
let ModalSwiftSlider: any = null;

if (Platform.OS !== 'web') {
	try {
		const swiftUI = require('@expo/ui/swift-ui');
		ModalSwiftSwitch = swiftUI.Switch;
		ModalSwiftSlider = swiftUI.Slider;
	} catch (error) {
		console.warn('Failed to load @expo/ui/swift-ui:', error);
	}
}

const ModalAdaptiveSwitch = ({
	value,
	onValueChange,
	color = '#2196F3',
}: {
	value: boolean;
	onValueChange: (value: boolean) => void;
	color?: string;
}) => {
	if (Platform.OS !== 'web' && ModalSwiftSwitch) {
		return (
			<ModalSwiftSwitch
				value={value}
				onValueChange={onValueChange}
				color={color}
				label=""
				variant="switch"
			/>
		);
	}

	return (
		<RNSwitch
			value={value}
			onValueChange={onValueChange}
			trackColor={{ true: color, false: '#CCCCCC' }}
			thumbColor={value ? color : '#f4f3f4'}
		/>
	);
};

const ModalWebSlider = ({
	value,
	onValueChange,
	style,
}: {
	value: number;
	onValueChange?: (value: number) => void;
	style?: any;
}) => (
	<View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>
		<TouchableOpacity
			onPress={() => onValueChange?.(Math.max(0, Number((value - 0.05).toFixed(2))))}
			style={styles.webSliderButton}
		>
			<Text style={styles.webSliderButtonText}>-</Text>
		</TouchableOpacity>
		<View style={styles.webSliderTrack}>
			<View style={[styles.webSliderFill, { width: `${Math.min(100, Math.max(0, value * 100))}%` }]} />
		</View>
		<TouchableOpacity
			onPress={() => onValueChange?.(Math.min(1, Number((value + 0.05).toFixed(2))))}
			style={styles.webSliderButton}
		>
			<Text style={styles.webSliderButtonText}>+</Text>
		</TouchableOpacity>
	</View>
);

const ModalAdaptiveSlider = ({
	value,
	onValueChange,
	style,
}: {
	value: number;
	onValueChange?: (value: number) => void;
	style?: any;
}) => {
	if (Platform.OS !== 'web' && ModalSwiftSlider) {
		return <ModalSwiftSlider style={style} value={value} onValueChange={onValueChange || (() => {})} />;
	}
	return <ModalWebSlider style={style} value={value} onValueChange={onValueChange} />;
};

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

	const { availableVoices, ttsProvider } = useTextToSpeech();
	const [selectedVoice, setSelectedVoice] = useState<TTSVoice | null>(null);
	const currentProviderLabel = 'Open a game session to view provider details';
	const localProviderLabel = 'Open a game session to view provider status';

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
								<ModalAdaptiveSlider
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
							<ModalAdaptiveSwitch
								value={!isMusicMuted}
								onValueChange={value => setMusicMuted(!value)}
								color="#2196F3"
							/>
						</View>

						{/* Voice Settings */}
						<ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
							Voice & Speech
						</ThemedText>

						<View style={styles.settingItem}>
							<ThemedText>Text-to-Speech</ThemedText>
							<ModalAdaptiveSwitch
								value={voiceSettings.ttsEnabled}
								onValueChange={value =>
									handleVoiceSettingChange('ttsEnabled', value)
								}
								color="#2196F3"
							/>
						</View>

						{Platform.OS !== 'web' && (
							<View style={styles.settingItem}>
								<ThemedText>Speech-to-Text</ThemedText>
								<ModalAdaptiveSwitch
									value={voiceSettings.sttEnabled}
									onValueChange={value =>
										handleVoiceSettingChange('sttEnabled', value)
									}
									color="#2196F3"
								/>
							</View>
						)}

						<View style={styles.settingItem}>
							<ThemedText>Auto-speak DM Messages</ThemedText>
							<ModalAdaptiveSwitch
								value={voiceSettings.autoSpeak}
								onValueChange={value =>
									handleVoiceSettingChange('autoSpeak', value)
								}
								color="#2196F3"
							/>
						</View>

						<View style={styles.settingItem}>
							<ThemedText>Speech Volume</ThemedText>
							<View style={styles.volumeSliderContainer}>
								<ModalAdaptiveSlider
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
								<ModalAdaptiveSlider
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

						{/* AI Provider Status */}
						<ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
							AI Provider Status
						</ThemedText>

						<View style={styles.settingItem}>
							<ThemedText>Current Provider</ThemedText>
							<ThemedText style={styles.statusText}>{currentProviderLabel}</ThemedText>
						</View>

						{Platform.OS === 'web' && (
							<View style={styles.settingItem}>
								<ThemedText>Ollama Status</ThemedText>
								<ThemedText style={styles.statusText}>{localProviderLabel}</ThemedText>
							</View>
						)}

						{/* TTS Provider Status */}
						<ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
							TTS Provider
						</ThemedText>

						<View style={styles.settingItem}>
							<ThemedText>Provider</ThemedText>
							<ThemedText style={styles.statusText}>
								{ttsProvider === 'kokoro' ? '🎤 Kokoro' : ttsProvider === 'expo-speech' ? '📱 Device' : '❌ None'}
							</ThemedText>
						</View>
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
	statusText: {
		fontSize: 14,
		fontWeight: 'bold',
		maxWidth: 150,
		textAlign: 'right',
	},
	toggleText: {
		color: '#2196F3',
		fontWeight: 'bold',
		fontSize: 16,
	},
	webSliderTrack: {
		flex: 1,
		height: 6,
		borderRadius: 3,
		backgroundColor: '#E0E0E0',
		overflow: 'hidden',
	},
	webSliderFill: {
		height: '100%',
		borderRadius: 3,
		backgroundColor: '#2196F3',
	},
	webSliderButton: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 6,
		backgroundColor: '#2196F3',
	},
	webSliderButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: 'bold',
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
