import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { useScreenSize } from '@/hooks/use-screen-size';
import { PlayerInfo } from '@/types/multiplayer-game';

interface PlayerListProps {
	players: PlayerInfo[];
	characters?: Array<{ id: string; name: string; race: string; class: string }>;
}

export const PlayerList: React.FC<PlayerListProps> = ({ players, characters }) => {
	const { isMobile } = useScreenSize();

	if (players.length === 0) {
		return (
			<ThemedView style={styles.container}>
				<ThemedText style={styles.emptyText}>
					Waiting for players to join...
				</ThemedText>
			</ThemedView>
		);
	}

	return (
		<ThemedView style={styles.container}>
			<ThemedText type="subtitle" style={styles.title}>
				Players ({players.length})
			</ThemedText>
			<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={true}>
				{players.map((player, index) => {
					const character = characters?.find(c => c.id === player.characterId);
					return (
						<View
							key={player.playerId}
							style={[styles.playerCard, isMobile && styles.playerCardMobile]}
						>
							<View style={styles.playerNumber}>
								<ThemedText style={styles.playerNumberText}>
									{index + 1}
								</ThemedText>
							</View>
							<View style={styles.playerInfo}>
								<ThemedText style={styles.playerName}>
									{character?.name || player.name}
								</ThemedText>
								{character && (
									<ThemedText style={styles.playerDetails}>
										{character.race} {character.class}
									</ThemedText>
								)}
							</View>
						</View>
					);
				})}
			</ScrollView>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
	},
	title: {
		marginBottom: 16,
		fontSize: 20,
		color: '#3B2F1B',
	},
	scrollView: {
		flex: 1,
	},
	emptyText: {
		textAlign: 'center',
		color: '#6B5B3D',
		fontSize: 16,
		marginTop: 40,
	},
	playerCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E2D3B3',
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#C9B037',
	},
	playerCardMobile: {
		padding: 12,
		marginBottom: 10,
	},
	playerNumber: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#C9B037',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	playerNumberText: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 18,
	},
	playerInfo: {
		flex: 1,
	},
	playerName: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#3B2F1B',
		marginBottom: 4,
	},
	playerDetails: {
		fontSize: 14,
		color: '#6B5B3D',
	},
});

