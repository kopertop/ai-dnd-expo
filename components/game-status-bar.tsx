import Feather from '@expo/vector-icons/Feather';
import React, { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

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
	const [screenData, setScreenData] = useState(Dimensions.get('window'));
	const playerCharacter = gameState.characters.find(c => c.id === gameState.playerCharacterId);

	// Track screen dimensions for responsive layout
	useEffect(() => {
		const onChange = (result: { window: any; screen: any }) => {
			setScreenData(result.window);
		};

		const subscription = Dimensions.addEventListener('change', onChange);
		return () => subscription?.remove();
	}, []);

	// Determine if we should use mobile layout
	const isMobile = screenData.width < 768;

	return (
		<View style={[
			isMobile ? styles.statusBarWrapperMobile : styles.statusBarWrapper,
			style,
		]}>
			{/* Portrait (left, hanging) */}
			<TouchableOpacity
				style={[styles.portraitWrapper, isMobile && styles.portraitWrapperMobile]}
				onPress={onPortraitPress}
				activeOpacity={0.7}
			>
				<Image
					source={getCharacterImage(playerCharacter)}
					style={[styles.portrait, isMobile && styles.portraitMobile]}
				/>
			</TouchableOpacity>
			{/* Centered info */}
			<View style={[styles.centerCol, isMobile && styles.centerColMobile]}>
				<View style={[styles.statusBar, isMobile && styles.statusBarMobile]}>
					{isMobile ? (
						// Mobile layout - stacked vertically
						<View style={styles.infoCol}>
							<View style={styles.infoRowMobile}>
								<ThemedText type="title" style={styles.nameTextMobile}>
									<Text>{playerCharacter?.name}</Text>
								</ThemedText>
								<ThemedText style={styles.metaTextMobile}>
									<Text>{playerCharacter?.race} / {playerCharacter?.class}</Text>
								</ThemedText>
							</View>
							<View style={styles.statsRowMobile}>
								<ThemedText style={styles.statTextMobile}>
									<Text>HP: {playerCharacter?.health}/{playerCharacter?.maxHealth}</Text>
								</ThemedText>
								<ThemedText style={styles.statTextMobile}>
									<Text>AP: {playerCharacter?.actionPoints}/{playerCharacter?.maxActionPoints}</Text>
								</ThemedText>
							</View>
						</View>
					) : (
						// Desktop layout - horizontal
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
					)}
				</View>
			</View>
			{/* Dice (right, inside the bar, centered) */}
			<View style={[styles.diceWrapper, isMobile && styles.diceWrapperMobile]}>
				<View style={[styles.diceIconContainer, isMobile && styles.diceIconContainerMobile]}>
					<Feather name="hexagon" size={isMobile ? 40 : 52} color="#C9B037" style={styles.diceIcon} />
					<View style={styles.diceTextContainer}>
						<Text style={[styles.diceText, isMobile && styles.diceTextMobile]}>{playerCharacter?.level}</Text>
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
		alignItems: 'center',
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
	statusBarWrapperMobile: {
		paddingVertical: 2,
		margin: 0,
		padding: 0,
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
		zIndex: 10,
		elevation: 2,
		backgroundColor: '#FFF8E1',
	},
	portraitWrapper: {
		position: 'absolute',
		left: 0,
		bottom: -64,
		zIndex: 11,
		width: 120,
		alignItems: 'center',
	},
	portraitWrapperMobile: {
		left: 8,
		top: -32,
		width: 80,
		position: 'absolute',
		zIndex: 11,
		alignItems: 'center',

	},
	portrait: {
		width: 120,
		height: 120,
		borderRadius: 16,
		borderWidth: 2,
		borderColor: '#C9B037',
		backgroundColor: '#F9F6EF',
		marginTop: -28,
	},
	portraitMobile: {
		width: 80,
		height: 80,
		borderRadius: 12,
		borderWidth: 2,
		marginTop: 0, // No negative margin - keep it contained
	},
	centerCol: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		marginHorizontal: 90,
	},
	centerColMobile: {
		marginHorizontal: 30, // Further reduced margins for mobile
		marginLeft: 95, // Account for smaller portrait
	},
	statusBar: {
		backgroundColor: 'transparent',
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 64,
	},
	statusBarMobile: {
		minHeight: 30,
		paddingVertical: 1,
	},
	infoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		marginBottom: 4,
	},
	infoCol: {
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2,
	},
	infoRowMobile: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 0,
	},
	statsRowMobile: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	nameText: {
		fontSize: 22,
		fontWeight: 'bold',
		color: '#8B2323',
		marginRight: 12,
	},
	nameTextMobile: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#8B2323',
		marginRight: 6,
	},
	metaText: {
		fontSize: 16,
		color: '#8B5C2A',
	},
	metaTextMobile: {
		fontSize: 12,
		color: '#8B5C2A',
	},
	statText: {
		fontSize: 16,
		color: '#3B2F1B',
		marginRight: 16,
	},
	statTextMobile: {
		fontSize: 12,
		color: '#3B2F1B',
		fontWeight: '600',
	},
	diceWrapper: {
		width: 90,
		alignItems: 'center',
		justifyContent: 'center',
		display: 'flex',
	},
	diceWrapperMobile: {
		width: 50,
		marginRight: 8,
	},
	diceIconContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
		width: 52,
		height: 52,
	},
	diceIconContainerMobile: {
		width: 40,
		height: 40,
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
	diceTextMobile: {
		fontSize: 16,
	},
});
