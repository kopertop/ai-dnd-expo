import Slider from '@react-native-community/slider';
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
		<Modal
			animationType="slide"
			transparent={true}
			visible={visible}
			onRequestClose={onClose}
		>
			<ThemedView style={styles.centeredView}>
				<ThemedView style={styles.modalView}>
					<ThemedText type="subtitle">Settings</ThemedText>

					<View style={styles.settingItem}>
						<ThemedText>Music Volume</ThemedText>
						<Slider
							style={styles.slider}
							minimumValue={0}
							maximumValue={1}
							value={musicVolume}
							onValueChange={handleVolumeChange}
							disabled={isMusicMuted}
						/>
					</View>

					<View style={styles.settingItem}>
						<ThemedText>Mute Music</ThemedText>
						<TouchableOpacity onPress={toggleMute}>
							<ThemedText style={styles.toggleText}>
								{isMusicMuted ? 'Unmute' : 'Mute'}
							</ThemedText>
						</TouchableOpacity>
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
	slider: {
		width: 200,
		height: 40,
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
