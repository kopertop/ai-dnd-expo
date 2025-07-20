import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { SettingsModal } from '@/components/settings-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const IndexScreen: React.FC = () => {
	const [hasSavedGame, setHasSavedGame] = useState(false);
	const [loading, setLoading] = useState(true);
	const [isSettingsVisible, setSettingsVisible] = useState(false);

	useEffect(() => {
		const checkSavedGame = async () => {
			try {
				const saved = await AsyncStorage.getItem('gameState');
				setHasSavedGame(!!saved);
			} catch {
				setHasSavedGame(false);
			}
			setLoading(false);
		};
		checkSavedGame();
	}, []);

	return (
		<>
			<Stack.Screen
				options={{
					title: 'Home',
					headerShown: false,
				}}
			/>
			<ThemedView style={styles.container}>
				<ThemedText type="title">Welcome to the AI D&D Platform</ThemedText>
				<Link href="/new-game" style={styles.link}>
					<ThemedText type="link">Start a new game</ThemedText>
				</Link>
				{!loading && hasSavedGame && (
					<TouchableOpacity
						style={styles.continueBtn}
						onPress={() => router.push('/game')}
					>
						<ThemedText style={styles.continueBtnText}>Continue Game</ThemedText>
					</TouchableOpacity>
				)}

				{/* AI Debug Test button */}
				<TouchableOpacity style={styles.debugBtn} onPress={() => router.push('/cactus-dm')}>
					<ThemedText style={styles.debugBtnText}>🧪 AI Debug Tests</ThemedText>
				</TouchableOpacity>

				{/* Settings button */}
				<TouchableOpacity
					style={styles.settingsBtn}
					onPress={() => setSettingsVisible(true)}
				>
					<ThemedText style={styles.settingsBtnText}>Settings</ThemedText>
				</TouchableOpacity>

				{/* Licenses & Credits button */}
				<TouchableOpacity
					style={styles.licensesBtn}
					onPress={() => router.push('/licenses')}
				>
					<ThemedText style={styles.licensesBtnText}>Licenses & Credits</ThemedText>
				</TouchableOpacity>

				<SettingsModal
					visible={isSettingsVisible}
					onClose={() => setSettingsVisible(false)}
				/>
			</ThemedView>
		</>
	);
};
IndexScreen.displayName = 'Home';
export default IndexScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	link: {
		marginTop: 15,
		paddingVertical: 15,
	},
	continueBtn: {
		marginTop: 20,
		backgroundColor: '#C9B037',
		paddingVertical: 15,
		paddingHorizontal: 32,
		borderRadius: 8,
		alignItems: 'center',
	},
	continueBtnText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 18,
	},
	debugBtn: {
		marginTop: 20,
		backgroundColor: '#FF6B6B',
		paddingVertical: 12,
		paddingHorizontal: 32,
		borderRadius: 8,
		alignItems: 'center',
	},
	debugBtnText: {
		color: '#FFFFFF',
		fontWeight: 'bold',
		fontSize: 16,
	},
	licensesBtn: {
		marginTop: 30,
		backgroundColor: '#E2D3B3',
		paddingVertical: 12,
		paddingHorizontal: 32,
		borderRadius: 8,
		alignItems: 'center',
	},
	licensesBtnText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
	settingsBtn: {
		marginTop: 20,
		backgroundColor: '#E2D3B3',
		paddingVertical: 12,
		paddingHorizontal: 32,
		borderRadius: 8,
		alignItems: 'center',
	},
	settingsBtnText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
});
