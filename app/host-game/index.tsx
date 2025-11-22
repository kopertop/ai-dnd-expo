import { useAuth } from 'expo-auth-template/frontend';
import { Stack, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Platform,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppFooter } from '@/components/app-footer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { multiplayerClient } from '@/services/api/multiplayer-client';
import { HostedGameSummary } from '@/types/api/multiplayer-api';

const HostGameIndexScreen: React.FC = () => {
	const [hostedGames, setHostedGames] = useState<HostedGameSummary[]>([]);
	const [gamesLoading, setGamesLoading] = useState(true);
	const [gamesError, setGamesError] = useState<string | null>(null);
	const [resumingGame, setResumingGame] = useState(false);
	const [deletingGameId, setDeletingGameId] = useState<string | null>(null);
	const insets = useSafeAreaInsets();
	const { user } = useAuth();
	const hostId = user?.id ?? null;

	const resumableGames = useMemo(
		() => [...hostedGames].sort((a, b) => b.updatedAt - a.updatedAt),
		[hostedGames],
	);

	const loadHostedGames = useCallback(async () => {
		if (!user?.id && !user?.email) {
			setHostedGames([]);
			setGamesLoading(false);
			return;
		}

		setGamesError(null);
		setGamesLoading(true);
		try {
			const overview = await multiplayerClient.getMyGames();
			const resumable = (overview.hostedGames || []).filter((game: { status: string }) =>
				game.status === 'waiting' || game.status === 'active',
			);
			setHostedGames(resumable);
		} catch (error) {
			console.error('Failed to load hosted games:', error);
			setGamesError(error instanceof Error ? error.message : 'Failed to load hosted games');
		} finally {
			setGamesLoading(false);
		}
	}, [user?.id, user?.email]);

	useEffect(() => {
		loadHostedGames();
	}, [loadHostedGames]);

	const handleDeleteGame = useCallback(
		async (game: HostedGameSummary) => {
			const performDelete = async () => {
				setDeletingGameId(game.id);
				try {
					await multiplayerClient.deleteGame(game.inviteCode);
					await loadHostedGames();
				} catch (error) {
					Alert.alert(
						'Error',
						error instanceof Error ? error.message : 'Failed to delete game',
					);
				} finally {
					setDeletingGameId(null);
				}
			};

			if (Platform.OS === 'web') {
				const confirmed = window.confirm(
					`Are you sure you want to delete "${game.quest.name}"? This action cannot be undone.`,
				);
				if (confirmed) {
					await performDelete();
				}
				return;
			}

			Alert.alert(
				'Delete Game',
				`Are you sure you want to delete "${game.quest.name}"? This action cannot be undone.`,
				[
					{
						text: 'Cancel',
						style: 'cancel',
					},
					{
						text: 'Delete',
						style: 'destructive',
						onPress: performDelete,
					},
				],
			);
		},
		[loadHostedGames],
	);

	const handleResumeHostedGame = useCallback(
		async (game: HostedGameSummary) => {
			if (!hostId) {
				Alert.alert('Error', 'Missing host identity. Please re-authenticate and try again.');
				return;
			}

			setResumingGame(true);
			try {
				const existingSession = await multiplayerClient.getGameSession(game.inviteCode);
				if (existingSession.status === 'waiting') {
					router.push(`/host-game/${game.inviteCode}`);
				} else if (existingSession.status === 'active') {
					router.replace(`/multiplayer-game?inviteCode=${game.inviteCode}&hostId=${hostId}`);
				} else {
					Alert.alert(
						'Unavailable',
						`This game is ${existingSession.status}. Start a new session instead.`,
					);
				}
			} catch (error) {
				Alert.alert(
					'Error',
					error instanceof Error ? error.message : 'Failed to resume game',
				);
			} finally {
				setResumingGame(false);
			}
		},
		[hostId],
	);

	const handleStartNewGame = useCallback(() => {
		// Navigate to create new game - will be handled by [id].tsx with 'new' as id
		router.push('/host-game/new');
	}, []);

	if (!user) {
		return (
			<ThemedView style={styles.container}>
				<Stack.Screen
					options={{
						title: 'Host Game',
						headerShown: true,
					}}
				/>
				<View style={styles.loaderFallback}>
					<ActivityIndicator size="large" color="#8B6914" />
					<ThemedText style={styles.loadingText}>Loading your profile...</ThemedText>
				</View>
				<AppFooter />
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'Host Game',
					headerShown: true,
				}}
			/>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: insets.bottom + 20 },
				]}
			>
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<ThemedText type="title" style={styles.sectionTitle}>
							Your Hosted Games
						</ThemedText>
					</View>

					{gamesLoading ? (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size="small" color="#8B6914" />
							<ThemedText style={styles.loadingText}>Loading hosted games...</ThemedText>
						</View>
					) : gamesError ? (
						<View style={styles.errorBox}>
							<ThemedText style={styles.errorText}>{gamesError}</ThemedText>
							<TouchableOpacity
								style={[styles.button, styles.refreshButton]}
								onPress={() => loadHostedGames().catch(() => undefined)}
							>
								<ThemedText style={styles.buttonTextGold}>Retry</ThemedText>
							</TouchableOpacity>
						</View>
					) : resumableGames.length === 0 ? (
						<View style={styles.emptyStateBox}>
							<ThemedText style={styles.emptyStateText}>No hosted games yet.</ThemedText>
							<ThemedText style={styles.emptyStateSubtext}>
								Start a new adventure to generate an invite code.
							</ThemedText>
						</View>
					) : (
						resumableGames.map(game => (
							<View key={game.id} style={styles.gameCard}>
								<View style={styles.gameCardHeader}>
									<ThemedText style={styles.gameTitle}>{game.quest.name}</ThemedText>
									<View
										style={[
											styles.statusBadge,
											game.status === 'active'
												? styles.statusActive
												: game.status === 'waiting'
													? styles.statusWaiting
													: styles.statusIdle,
										]}
									>
										<ThemedText style={styles.statusText}>{game.status.toUpperCase()}</ThemedText>
									</View>
								</View>
								<ThemedText style={styles.gameMeta}>Invite Code: {game.inviteCode}</ThemedText>
								<ThemedText style={styles.gameMeta}>
									World: {game.world} • Start: {game.startingArea}
								</ThemedText>
								<ThemedText style={styles.gameMeta}>
									Updated {new Date(game.updatedAt).toLocaleString()}
								</ThemedText>
								<View style={styles.gameCardActions}>
									<TouchableOpacity
										style={[
											styles.button,
											styles.resumeButton,
											(resumingGame || deletingGameId === game.id) && styles.buttonDisabled,
										]}
										onPress={() => handleResumeHostedGame(game)}
										disabled={resumingGame || deletingGameId === game.id}
									>
										<ThemedText style={styles.resumeButtonText}>
											{resumingGame
												? 'Opening...'
												: game.status === 'active'
													? 'Rejoin Game'
													: 'Open Lobby'}
										</ThemedText>
									</TouchableOpacity>
									<TouchableOpacity
										style={[
											styles.button,
											styles.deleteButton,
											(resumingGame || deletingGameId === game.id) && styles.buttonDisabled,
										]}
										onPress={() => handleDeleteGame(game)}
										disabled={resumingGame || deletingGameId === game.id}
									>
										<ThemedText style={styles.deleteButtonText}>
											{deletingGameId === game.id ? 'Deleting...' : 'Delete'}
										</ThemedText>
									</TouchableOpacity>
								</View>
							</View>
						))
					)}
				</View>

				<View style={styles.section}>
					<TouchableOpacity
						style={[styles.button, styles.startNewButton]}
						onPress={handleStartNewGame}
					>
						<ThemedText style={styles.startNewButtonText}>Start a New Game</ThemedText>
					</TouchableOpacity>
				</View>
			</ScrollView>
			<AppFooter />
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
		paddingBottom: 40,
		gap: 24,
	},
	section: {
		paddingHorizontal: 20,
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	sectionTitle: {
		textAlign: 'left',
	},
	loadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20,
		gap: 12,
	},
	loadingText: {
		color: '#6B5B3D',
	},
	errorBox: {
		padding: 20,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#F2C94C',
		backgroundColor: '#FFF7E1',
		alignItems: 'center',
		gap: 12,
	},
	errorText: {
		color: '#B91C1C',
		fontWeight: '600',
		textAlign: 'center',
	},
	refreshButton: {
		backgroundColor: '#8B6914',
	},
	emptyStateBox: {
		padding: 24,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		backgroundColor: '#FFF9EF',
		alignItems: 'center',
		gap: 8,
	},
	emptyStateText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#3B2F1B',
	},
	emptyStateSubtext: {
		fontSize: 14,
		color: '#6B5B3D',
		textAlign: 'center',
	},
	gameCard: {
		borderWidth: 1,
		borderColor: '#E2D3B3',
		borderRadius: 16,
		padding: 16,
		backgroundColor: '#FFF9EF',
		marginBottom: 12,
	},
	gameCardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	gameTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#3B2F1B',
		flex: 1,
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
	},
	statusActive: {
		backgroundColor: '#4A6741',
	},
	statusWaiting: {
		backgroundColor: '#C9B037',
	},
	statusIdle: {
		backgroundColor: '#8B6914',
	},
	statusText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#FFF9EF',
	},
	gameMeta: {
		fontSize: 14,
		color: '#6B5B3D',
		marginBottom: 4,
	},
	gameCardActions: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 12,
	},
	button: {
		backgroundColor: '#C9B037',
		paddingVertical: 12,
		paddingHorizontal: 24,
		borderRadius: 12,
		flex: 1,
		alignItems: 'center',
	},
	buttonTextGold: {
		color: '#FFFFFF',
		fontWeight: '600',
		fontSize: 14,
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	buttonText: {
		color: '#FFFFFF',
		fontWeight: '600',
		fontSize: 14,
	},
	resumeButton: {
		backgroundColor: '#4A6741',
	},
	resumeButtonText: {
		color: '#FFFFFF',
		fontWeight: '600',
		fontSize: 14,
	},
	deleteButton: {
		backgroundColor: '#B91C1C',
	},
	deleteButtonText: {
		color: '#FFF9EF',
		fontWeight: '600',
		fontSize: 14,
	},
	startNewButton: {
		backgroundColor: '#8B6914',
		paddingVertical: 16,
	},
	startNewButtonText: {
		color: '#FFFFFF',
		fontWeight: '600',
		fontSize: 14,
	},
	loaderFallback: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
	},
});

export default HostGameIndexScreen;

