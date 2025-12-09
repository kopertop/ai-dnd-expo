import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { useScreenSize } from '@/hooks/use-screen-size';
import { Character } from '@/types/character';
import { PlayerInfo } from '@/types/multiplayer-game';

interface PlayerListProps {
	players: PlayerInfo[];
	characters?: Character[];
}

const FALLBACK_COLORS = ['#C9B037', '#8B6914', '#4A6741', '#7A4EAB', '#2E6F91', '#A63D40'];

const hashStringToColor = (input: string) => {
	let hash = 0;
	for (let i = 0; i < input.length; i++) {
		hash = input.charCodeAt(i) + ((hash << 5) - hash);
	}

	const index = Math.abs(hash) % FALLBACK_COLORS.length;
	return FALLBACK_COLORS[index];
};

const buildImageSource = (image?: string) => {
	if (!image) {
		return undefined;
	}

	if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('data:')) {
		return { uri: image };
	}

	return { uri: `data:image/png;base64,${image}` };
};

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
					const raceClass = character
						? `${character.race} ${character.class}`
						: [player.race, player.class].filter(Boolean).join(' ');
					const level = character ? character.level : player.level;
					const detailParts = [];
					if (raceClass) {
						detailParts.push(raceClass);
					}
					if (typeof level === 'number') {
						detailParts.push(`Level ${level}`);
					}
					const portraitSource = buildImageSource(character?.image);
					const portraitInitials = (character?.name || player.name || '?').slice(0, 2).toUpperCase();
					const portraitColor = hashStringToColor(character?.id ?? player.playerId);
					return (
						<View
							key={player.playerId}
							style={[styles.playerCard, isMobile && styles.playerCardMobile]}
						>
							<View style={styles.portraitWrapper}>
								{portraitSource ? (
									<Image source={portraitSource} style={styles.portraitImage} resizeMode="contain" />
								) : (
									<View
										style={[
											styles.portraitFallback,
											{ backgroundColor: portraitColor },
										]}
									>
										<ThemedText style={styles.portraitInitial}>
											{portraitInitials}
										</ThemedText>
									</View>
								)}
							</View>
							<View style={styles.playerInfo}>
								<ThemedText style={styles.playerName}>
									{character?.name || player.name}
								</ThemedText>
								{detailParts.length > 0 && (
									<ThemedText style={styles.playerDetails}>
										{detailParts.join(' • ')}
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
	portraitWrapper: {
		width: 48,
		height: 48,
		borderRadius: 24,
		overflow: 'hidden',
		marginRight: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	portraitImage: {
		width: '100%',
		height: '100%',
	},
	portraitFallback: {
		width: '100%',
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 24,
	},
	portraitInitial: {
		color: '#FFF9EF',
		fontWeight: '700',
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

