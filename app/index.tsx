import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AppFooter } from '@/components/app-footer';
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
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'Home',
					headerShown: false,
				}}
			/>
			<View style={styles.content}>
				<ThemedText type="title" style={styles.welcome}>
					Welcome to the AI D&D Platform
				</ThemedText>
				<ThemedText style={styles.subtitle}>
					Host a multiplayer session for your party, or join an existing adventure with your character.
				</ThemedText>
				<TouchableOpacity
					style={styles.multiplayerBtn}
					onPress={() => router.push('/host-game')}
				>
					<ThemedText style={styles.multiplayerBtnText}>Host Game</ThemedText>
				</TouchableOpacity>
                                <TouchableOpacity
                                        style={styles.multiplayerBtn}
                                        onPress={() => router.push('/join-game')}
                                >
                                        <ThemedText style={styles.multiplayerBtnText}>Join Game</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                        style={styles.secondaryBtn}
                                        onPress={() => router.push('/characters')}
                                >
                                        <ThemedText style={styles.secondaryBtnText}>My Characters</ThemedText>
                                </TouchableOpacity>
                                {!loading && hasSavedGame && (
                                        <TouchableOpacity
                                                style={styles.continueBtn}
                                                onPress={() => router.push('/game')}
					>
						<ThemedText style={styles.continueBtnText}>Continue Solo Adventure</ThemedText>
					</TouchableOpacity>
				)}
			</View>
			<AppFooter />
		</ThemedView>
	);
};
IndexScreen.displayName = 'Home';
export default IndexScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
		gap: 16,
	},
	welcome: {
		textAlign: 'center',
	},
	subtitle: {
		textAlign: 'center',
		color: '#6B5B3D',
		fontSize: 16,
		paddingHorizontal: 24,
	},
	multiplayerBtn: {
		marginTop: 15,
		backgroundColor: '#8B6914',
		paddingVertical: 15,
		paddingHorizontal: 32,
		borderRadius: 8,
		alignItems: 'center',
	},
        multiplayerBtnText: {
                color: '#F5E6D3',
                fontWeight: 'bold',
                fontSize: 18,
        },
        secondaryBtn: {
                marginTop: 8,
                borderWidth: 1,
                borderColor: '#8B6914',
                paddingVertical: 12,
                paddingHorizontal: 28,
                borderRadius: 8,
        },
        secondaryBtnText: {
                color: '#8B6914',
                fontWeight: '600',
                fontSize: 16,
        },
	continueBtn: {
		marginTop: 10,
		backgroundColor: '#C9B037',
		paddingVertical: 15,
		paddingHorizontal: 32,
		borderRadius: 8,
		alignItems: 'center',
	},
	continueBtnText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
});
