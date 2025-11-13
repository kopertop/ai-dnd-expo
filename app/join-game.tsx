import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmailInput } from '@/components/email-input';
import { InviteCodeInput } from '@/components/invite-code-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { multiplayerClient } from '@/services/api/multiplayer-client';
import { useScreenSize } from '@/hooks/use-screen-size';
import { GameSessionResponse } from '@/types/api/multiplayer-api';
import { Character } from '@/types/character';
import NewGameScreen from './new-game';

const JoinGameScreen: React.FC = () => {
	const [step, setStep] = useState<'code' | 'email' | 'character' | 'waiting'>('code');
	const [inviteCode, setInviteCode] = useState<string | null>(null);
	const [playerEmail, setPlayerEmail] = useState<string>('');
	const [session, setSession] = useState<GameSessionResponse | null>(null);
	const [playerId, setPlayerId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const { isMobile } = useScreenSize();
	const insets = useSafeAreaInsets();

	// Generate player ID on mount
	useEffect(() => {
		// Simple ID generator that works across all platforms
		const generatePlayerId = () => {
			const timestamp = Date.now().toString(36);
			const random = Math.random().toString(36).substring(2, 15);
			const id = `player-${timestamp}-${random}`.substring(0, 32);
			setPlayerId(id);
		};
		generatePlayerId();
	}, []);

	// Poll for game start when waiting
	useEffect(() => {
		if (step === 'waiting' && inviteCode) {
			const interval = setInterval(async () => {
				try {
					const updatedSession = await multiplayerClient.getGameSession(inviteCode);
					setSession(updatedSession);

					// Check if game started
					if (updatedSession.status === 'active') {
						router.replace(
							`/multiplayer-game?inviteCode=${inviteCode}&playerId=${playerId}`,
						);
					}
				} catch (error) {
					console.error('Failed to poll session:', error);
				}
			}, 2000); // Poll every 2 seconds

			return () => clearInterval(interval);
		}
	}, [step, inviteCode, playerId]);

	const handleInviteCodeSubmit = async (code: string) => {
		setLoading(true);
		try {
			const sessionData = await multiplayerClient.getGameSession(code);
			setInviteCode(code);
			setSession(sessionData);

			if (sessionData.status === 'waiting') {
				setStep('email'); // Go to email step before character
			} else if (sessionData.status === 'active') {
				// Game already started, join directly
				router.replace(`/multiplayer-game?inviteCode=${code}&playerId=${playerId}`);
			} else {
				Alert.alert('Error', 'This game is no longer accepting players');
			}
		} catch (error) {
			Alert.alert(
				'Error',
				error instanceof Error ? error.message : 'Invalid invite code',
			);
		} finally {
			setLoading(false);
		}
	};

	const handleEmailSubmit = () => {
		if (!playerEmail || !playerEmail.includes('@')) {
			Alert.alert('Error', 'Please enter a valid email address');
			return;
		}
		setStep('character');
	};

	const handleCharacterCreated = async (character: Character) => {
		if (!inviteCode || !playerId) return;

		setLoading(true);
		try {
			await multiplayerClient.joinGame({
				inviteCode,
				character,
				playerId,
				playerEmail,
			});

			// Refresh session
			const updatedSession = await multiplayerClient.getGameSession(inviteCode);
			setSession(updatedSession);
			setStep('waiting');
		} catch (error) {
			Alert.alert(
				'Error',
				error instanceof Error ? error.message : 'Failed to join game',
			);
		} finally {
			setLoading(false);
		}
	};

	if (step === 'character') {
		// Reuse character creation flow from new-game.tsx
		// We'll create a modified version that calls handleCharacterCreated
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen
					options={{
						title: 'Create Character',
						headerShown: true,
					}}
				/>
				<ThemedView style={styles.characterContainer}>
					<ThemedText type="title" style={styles.title}>
						Create Your Character
					</ThemedText>
					<ThemedText style={styles.hint}>
						Create a character to join the game
					</ThemedText>
					{/* Character creation will be handled by modified new-game component */}
					{/* For now, we'll show a simplified version */}
					<ThemedText style={styles.note}>
						Note: Full character creation UI coming soon. For now, use the
						character creation wizard.
					</ThemedText>
				</ThemedView>
			</ThemedView>
		);
	}

	if (step === 'waiting') {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen
					options={{
						title: 'Waiting for Host',
						headerShown: true,
					}}
				/>
				<View style={styles.waitingContainer}>
					<ThemedText type="title" style={styles.title}>
						Waiting for Host to Start
					</ThemedText>
					<ThemedText style={styles.hint}>
						You've joined the game! The host will start the game soon.
					</ThemedText>
					{session && (
						<ThemedText style={styles.playerCount}>
							{session.players.length} player{session.players.length !== 1 ? 's' : ''} joined
						</ThemedText>
					)}
				</View>
			</ThemedView>
		);
	}

	if (step === 'email') {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen
					options={{
						title: 'Enter Your Email',
						headerShown: true,
					}}
				/>
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={[
						styles.scrollContent,
						{ paddingTop: insets.top + 20 },
					]}
				>
					<View style={styles.chooserContainer}>
						<ThemedText type="title" style={styles.title}>
							Enter Your Email
						</ThemedText>
						<EmailInput
							value={playerEmail}
							onChangeText={setPlayerEmail}
							autoFocus={true}
						/>
						<TouchableOpacity
							style={[styles.button, (!playerEmail || !playerEmail.includes('@')) && styles.buttonDisabled]}
							onPress={handleEmailSubmit}
							disabled={!playerEmail || !playerEmail.includes('@')}
						>
							<ThemedText style={styles.buttonText}>Continue</ThemedText>
						</TouchableOpacity>
					</View>
				</ScrollView>
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'Join Game',
					headerShown: true,
				}}
			/>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingTop: insets.top + 20 },
				]}
			>
				<InviteCodeInput onSubmit={handleInviteCodeSubmit} loading={loading} />
			</ScrollView>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		paddingBottom: 40,
	},
	chooserContainer: {
		flex: 1,
		padding: 20,
	},
	title: {
		marginBottom: 20,
		textAlign: 'center',
	},
	button: {
		backgroundColor: '#C9B037',
		paddingVertical: 16,
		paddingHorizontal: 32,
		borderRadius: 12,
		marginTop: 20,
		minWidth: 200,
		alignItems: 'center',
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	buttonText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 18,
	},
	characterContainer: {
		flex: 1,
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	waitingContainer: {
		flex: 1,
		padding: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: {
		marginBottom: 12,
		color: '#3B2F1B',
		textAlign: 'center',
	},
	hint: {
		fontSize: 16,
		color: '#6B5B3D',
		textAlign: 'center',
		marginBottom: 24,
	},
	note: {
		fontSize: 14,
		color: '#9B8B7A',
		textAlign: 'center',
		marginTop: 20,
	},
	playerCount: {
		fontSize: 18,
		color: '#3B2F1B',
		marginTop: 20,
		fontWeight: 'bold',
	},
});

export default JoinGameScreen;

