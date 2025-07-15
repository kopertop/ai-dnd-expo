import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const IndexScreen: React.FC = () => {
	const [hasSavedGame, setHasSavedGame] = useState(false);
	const [loading, setLoading] = useState(true);

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
			<Stack.Screen options={{ title: 'Home' }} />
			<ThemedView style={styles.container}>
				<ThemedText type="title">
					<Text>Welcome to the AI D&D Platform</Text>
				</ThemedText>
				<Link href="/new-game" style={styles.link}>
					<ThemedText type="link">
						<Text>Start a new game</Text>
					</ThemedText>
				</Link>
				{!loading && hasSavedGame && (
					<TouchableOpacity
						style={styles.continueBtn}
						onPress={() => router.push({ pathname: '/game' as any })}
					>
						<Text style={styles.continueBtnText}>Continue Game</Text>
					</TouchableOpacity>
				)}

				{/* Licenses & Credits button */}
				<TouchableOpacity
					style={styles.licensesBtn}
					onPress={() => router.push('/licenses')}
				>
					<Text style={styles.licensesBtnText}>Licenses & Credits</Text>
				</TouchableOpacity>
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
});
