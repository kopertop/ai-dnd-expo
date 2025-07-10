import Feather from '@expo/vector-icons/Feather';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getCharacterImage } from '@/hooks/use-game-state';
import { GameState } from '@/types/game';

interface GameStatusBarProps {
	gameState: GameState;
	style?: ViewStyle;
	onPortraitPress?: () => void;
}

export const GameStatusBar: React.FC<GameStatusBarProps> = ({
	gameState,
	style,
	onPortraitPress,
}) => {
	const playerCharacter = gameState.characters.find(c => c.id === gameState.playerCharacterId);
	return (
		<View style={[styles.statusBarWrapper, style]}>
			{/* Portrait (left, hanging) */}
			<TouchableOpacity
				style={styles.portraitWrapper}
				onPress={onPortraitPress}
				activeOpacity={0.7}
			>
				<Image
					source={getCharacterImage(playerCharacter)}
					style={styles.portrait}
				/>
			</TouchableOpacity>
			{/* Centered info */}
			<View style={styles.centerCol}>
				<View style={styles.statusBar}>
					<View style={styles.infoRow}>
						<ThemedText type="title" style={styles.nameText}>
							<Text>{playerCharacter?.name}</Text>
						</ThemedText>
						<ThemedText style={styles.metaText}>
							<Text>{playerCharacter?.race} / {playerCharacter?.class}</Text>
						</ThemedText>
						<ThemedText style={styles.statText}>
							<Text>HP: {playerCharacter?.health} / {playerCharacter?.maxHealth}</Text>
						</ThemedText>
						<ThemedText style={styles.statText}>
							<Text>AP: {playerCharacter?.actionPoints} / {playerCharacter?.maxActionPoints}</Text>
						</ThemedText>
					</View>
				</View>
			</View>
			{/* Dice (right, inside the bar, centered) */}
			<View style={styles.diceWrapper}>
				<View style={styles.diceIconContainer}>
					<Feather name="hexagon" size={52} color="#C9B037" style={styles.diceIcon} />
					<View style={styles.diceTextContainer}>
						<Text style={styles.diceText}>{playerCharacter?.level}</Text>
					</View>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	statusBarWrapper: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center', // changed from flex-end
		justifyContent: 'center',
		marginBottom: 16,
		position: 'relative',
		zIndex: 10,
		elevation: 2,
		backgroundColor: '#FFF8E1',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 6,
	},
	portraitWrapper: {
		position: 'absolute',
		left: 0,
		bottom: -64, // start a bit below the top of the bar
		zIndex: 11,
		width: 120,
		alignItems: 'center',
		// Make the portrait hang below the bar
		// The portrait itself will have a negative marginTop
	},
	portrait: {
		width: 120,
		height: 120,
		borderRadius: 16,
		borderWidth: 2,
		borderColor: '#C9B037',
		backgroundColor: '#F9F6EF',
		marginTop: -28, // pull the portrait down to hang below the bar
	},
	centerCol: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		marginHorizontal: 90,
	},
	statusBar: {
		backgroundColor: 'transparent',
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 64,
	},
	infoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		marginBottom: 4,
	},
	nameText: {
		fontSize: 22,
		fontWeight: 'bold',
		color: '#8B2323',
		marginRight: 12,
	},
	metaText: {
		fontSize: 16,
		color: '#8B5C2A',
	},
	statText: {
		fontSize: 16,
		color: '#3B2F1B',
		marginRight: 16,
	},
	diceWrapper: {
		width: 90,
		alignItems: 'center',
		justifyContent: 'center',
		display: 'flex',
	},
	diceIconContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
		width: 52,
		height: 52,
	},
	diceTextContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: 'center',
		justifyContent: 'center',
	},
	diceIcon: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	diceText: {
		fontWeight: 'bold',
		fontSize: 20,
		color: '#8B2323',
		includeFontPadding: false,
	},
});
