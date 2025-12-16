import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { ExpoIcon } from '@/components/expo-icon';
import { ThemedText } from '@/components/themed-text';
import { RaceByID } from '@/constants/races';
import { getCharacterImage } from '@/hooks/use-game-state';
import { useScreenSize } from '@/hooks/use-screen-size';
import { useSimpleCompanions } from '@/hooks/use-simple-companions';
import { GameState } from '@/types/game';

interface GameStatusBarProps {
	gameState: GameState;
	style?: ViewStyle;
	onPortraitPress?: () => void;
	activeCharacter?: 'dm' | 'player' | string; // 'dm', 'player', or companion ID
}

export const GameStatusBar: React.FC<GameStatusBarProps> = ({
	gameState,
	style,
	onPortraitPress,
	activeCharacter = 'player',
}) => {
	const { isMobile } = useScreenSize();
	const playerCharacter = gameState.characters.find(c => c.id === gameState.playerCharacterId);
	const companions = useSimpleCompanions();

	return (
		<View style={[isMobile ? styles.statusBarWrapperMobile : styles.statusBarWrapper, style]}>
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

			{/* Turn Order Portraits */}
			<View style={[styles.turnOrderPortraits, isMobile && styles.turnOrderPortraitsMobile]}>
				{/* DM Portrait */}
				<TouchableOpacity
					style={[
						activeCharacter === 'dm' ? styles.activePortrait : styles.inactivePortrait,
						isMobile &&
						(activeCharacter === 'dm'
							? styles.activePortraitMobile
							: styles.inactivePortraitMobile),
					]}
				>
					<Image
						source={require('../assets/images/dungeon-master.png')}
						style={[
							activeCharacter === 'dm'
								? styles.activePortraitImage
								: styles.inactivePortraitImage,
							isMobile &&
							(activeCharacter === 'dm'
								? styles.activePortraitImageMobile
								: styles.inactivePortraitImageMobile),
						]}
					/>
					{activeCharacter === 'dm' && (
						<View
							style={[
								styles.activeIndicator,
								isMobile && styles.activeIndicatorMobile,
							]}
						/>
					)}
				</TouchableOpacity>

				{/* Sample Party Member Portrait */}
				<TouchableOpacity
					style={[
						activeCharacter === 'sample'
							? styles.activePortrait
							: styles.inactivePortrait,
						isMobile &&
						(activeCharacter === 'sample'
							? styles.activePortraitMobile
							: styles.inactivePortraitMobile),
					]}
				>
					<Image
						source={RaceByID.human.image}
						style={[
							activeCharacter === 'sample'
								? styles.activePortraitImage
								: styles.inactivePortraitImage,
							isMobile &&
							(activeCharacter === 'sample'
								? styles.activePortraitImageMobile
								: styles.inactivePortraitImageMobile),
						]}
					/>
					{activeCharacter === 'sample' && (
						<View
							style={[
								styles.activeIndicator,
								isMobile && styles.activeIndicatorMobile,
							]}
						/>
					)}
				</TouchableOpacity>

				{/* Companion Portraits */}
				{companions.activeCompanions.slice(0, 2).map((companion, index) => (
					<TouchableOpacity
						key={companion.id}
						style={[
							activeCharacter === companion.id
								? styles.activePortrait
								: styles.inactivePortrait,
							isMobile &&
							(activeCharacter === companion.id
								? styles.activePortraitMobile
								: styles.inactivePortraitMobile),
						]}
					>
						{companion.image ? (
							<Image
								source={{ uri: companion.image }}
								style={[
									activeCharacter === companion.id
										? styles.activePortraitImage
										: styles.inactivePortraitImage,
									isMobile &&
									(activeCharacter === companion.id
										? styles.activePortraitImageMobile
										: styles.inactivePortraitImageMobile),
								]}
							/>
						) : (
							<View
								style={[
									styles.companionAvatar,
									isMobile && styles.companionAvatarMobile,
								]}
							>
								<Text
									style={[
										styles.companionInitial,
										isMobile && styles.companionInitialMobile,
									]}
								>
									{companion.name.charAt(0).toUpperCase()}
								</Text>
							</View>
						)}
						{activeCharacter === companion.id && (
							<View
								style={[
									styles.activeIndicator,
									isMobile && styles.activeIndicatorMobile,
								]}
							/>
						)}
					</TouchableOpacity>
				))}
			</View>
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
									<Text>
										{playerCharacter?.race} / {playerCharacter?.class}
										{playerCharacter?.trait && ` / ${playerCharacter.trait}`}
									</Text>
								</ThemedText>
							</View>
							<View style={styles.statsRowMobile}>
								<ThemedText style={styles.statTextMobile}>
									<Text>
										HP: {playerCharacter?.health}/{playerCharacter?.maxHealth}
									</Text>
								</ThemedText>
								<ThemedText style={styles.statTextMobile}>
									<Text>
										AP: {playerCharacter?.actionPoints}/
										{playerCharacter?.maxActionPoints}
									</Text>
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
								<Text>
									{playerCharacter?.race} / {playerCharacter?.class}
									{playerCharacter?.trait && ` / ${playerCharacter.trait}`}
								</Text>
							</ThemedText>
							<ThemedText style={styles.statText}>
								<Text>
									HP: {playerCharacter?.health} / {playerCharacter?.maxHealth}
								</Text>
							</ThemedText>
							<ThemedText style={styles.statText}>
								<Text>
									AP: {playerCharacter?.actionPoints} /{' '}
									{playerCharacter?.maxActionPoints}
								</Text>
							</ThemedText>
						</View>
					)}
				</View>
			</View>
			{/* Dice (right, inside the bar, centered) */}
			<View style={[styles.diceWrapper, isMobile && styles.diceWrapperMobile]}>
				<View
					style={[styles.diceIconContainer, isMobile && styles.diceIconContainerMobile]}
				>
					<ExpoIcon
						icon="Feather:hexagon"
						size={isMobile ? 40 : 52}
						color="#C9B037"
						style={styles.diceIcon}
					/>
					<View style={styles.diceTextContainer}>
						<Text style={[styles.diceText, isMobile && styles.diceTextMobile]}>
							{playerCharacter?.level}
						</Text>
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
	turnOrderPortraits: {
		position: 'absolute',
		left: 0,
		top: 140,
		zIndex: 12,
		width: 120,
		alignItems: 'center',
		gap: 6,
		flexDirection: 'column-reverse', // Flow downward on desktop
	},
	turnOrderPortraitsMobile: {
		left: 8,
		top: -140, // Flow upward above player portrait on mobile
		width: 80,
		gap: 4,
		flexDirection: 'column', // Flow upward on mobile (normal direction)
	},
	activePortrait: {
		width: 60, // Larger when active
		height: 60,
		borderRadius: 8,
		backgroundColor: '#F9F6EF',
		borderWidth: 3,
		borderColor: '#FFD700', // Gold border for active
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		shadowColor: '#FFD700',
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.6,
		shadowRadius: 8,
		elevation: 8,
	},
	activePortraitMobile: {
		width: 48,
		height: 48,
		borderRadius: 6,
		shadowRadius: 6,
		elevation: 6,
	},
	inactivePortrait: {
		width: 45, // Smaller when inactive
		height: 45,
		borderRadius: 6,
		backgroundColor: '#F9F6EF',
		borderWidth: 1,
		borderColor: '#C9B037',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		opacity: 0.7,
	},
	inactivePortraitMobile: {
		width: 36,
		height: 36,
		borderRadius: 4,
	},
	activePortraitImage: {
		width: 60,
		height: 60,
		borderRadius: 8,
	},
	activePortraitImageMobile: {
		width: 48,
		height: 48,
		borderRadius: 6,
	},
	inactivePortraitImage: {
		width: 45,
		height: 45,
		borderRadius: 6,
	},
	inactivePortraitImageMobile: {
		width: 36,
		height: 36,
		borderRadius: 4,
	},
	activeIndicator: {
		position: 'absolute',
		top: -3,
		right: -3,
		width: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: '#00FF00',
		borderWidth: 2,
		borderColor: '#FFF',
	},
	activeIndicatorMobile: {
		width: 12,
		height: 12,
		borderRadius: 6,
		top: -2,
		right: -2,
	},
	dmAvatar: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: '#8B2323',
		alignItems: 'center',
		justifyContent: 'center',
	},
	dmAvatarMobile: {
		width: 22,
		height: 22,
		borderRadius: 11,
	},
	companionAvatar: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: '#8B5C2A',
		alignItems: 'center',
		justifyContent: 'center',
	},
	companionAvatarMobile: {
		width: 22,
		height: 22,
		borderRadius: 11,
	},
	companionInitial: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#FFF',
	},
	companionInitialMobile: {
		fontSize: 10,
	},
	partyPortrait: {
		width: 50, // 25% larger than smallPortrait (40 * 1.25)
		height: 50,
		borderRadius: 8,
		backgroundColor: '#F9F6EF',
		borderWidth: 1,
		borderColor: '#C9B037',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	partyPortraitMobile: {
		width: 40, // 25% larger than smallPortraitMobile (32 * 1.25)
		height: 40,
		borderRadius: 6,
	},
	partyPortraitImage: {
		width: 50,
		height: 50,
		borderRadius: 8,
	},
	partyPortraitImageMobile: {
		width: 40,
		height: 40,
		borderRadius: 6,
	},
});
