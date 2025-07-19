import { Slider, Switch } from '@expo/ui/swift-ui';
import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { useSettingsStore } from '../stores/settings-store';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface SettingsModalProps {
	visible: boolean;
	onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
	const { musicVolume, isMusicMuted, setMusicVolume, setMusicMuted } = useSettingsStore();

	const handleVolumeChange = (value: number) => {
		setMusicVolume(value);
	};

	const toggleMute = () => {
		setMusicMuted(!isMusicMuted);
	};

	return (
		<Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
			<ThemedView style={styles.centeredView}>
				<ThemedView style={styles.modalView}>
					<ThemedText type="subtitle">Settings</ThemedText>

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
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		width: '100%',
		marginTop: 20,
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
	toggleText: {
		color: '#2196F3',
		fontWeight: 'bold',
		fontSize: 16,
	},
	closeButton: {
		marginTop: 30,
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
