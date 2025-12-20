import { router } from 'expo-router';
import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from './themed-text';

import { useCloneCharacter } from '@/hooks/api/use-character-queries';
import { Character } from '@/types/character';
import { CHARACTER_IMAGE_OPTIONS } from '@/types/character-figure';

type CharacterListProps = {
	characters: Character[];
	isLoading: boolean;
	isAllCharactersView?: boolean;
	currentUserId?: string;
	isAdmin?: boolean;
};

const resolveCharacterImage = (icon?: string): ImageSourcePropType | { uri: string } | undefined => {
	if (!icon) return undefined;
	// Check if it's a preset key
	const match = CHARACTER_IMAGE_OPTIONS.find(option => option.key === icon);
	if (match) return match.source;
	// Otherwise assume it's a URI
	return { uri: icon };
};

export const CharacterList: React.FC<CharacterListProps> = ({
	characters,
	isLoading,
	isAllCharactersView = false,
	currentUserId,
	isAdmin = false,
}) => {
	const cloneMutation = useCloneCharacter();

	if (isLoading) {
		return <ThemedText style={styles.sectionHint}>Loading characters...</ThemedText>;
	}

	if (characters.length === 0) {
		return (
			<View style={styles.emptyCard}>
				<ThemedText style={styles.sectionHint}>No characters found.</ThemedText>
			</View>
		);
	}

	const handleClone = async (character: Character, e: any) => {
		e.stopPropagation();
		try {
			const result = await cloneMutation.mutateAsync({
				path: `/characters/${character.id}/clone`
			});
			const clonedCharacter = (result as any)?.character || result;
			// Navigate to character creation with pre-filled data
			router.push({
				pathname: '/new-character',
				params: {
					mode: 'character',
					cloneFrom: character.id,
					clonedData: JSON.stringify(clonedCharacter),
				} as never
			});
		} catch (error) {
			console.error('Failed to clone character:', error);
		}
	};

	return (
		<>
			{characters.map(character => {
				const portraitSource = resolveCharacterImage(character.icon);
				const portraitInitials = (character.name || '?').slice(0, 2).toUpperCase();
				// Show clone button for non-admins in "All Characters" view
				const showCloneButton = isAllCharactersView && !isAdmin;

				return (
					<TouchableOpacity
						key={character.id}
						style={styles.characterCard}
						onPress={() => router.push({ pathname: '/characters/[id]', params: { id: character.id } } as never)}
					>
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
							<View style={styles.portraitWrapper}>
								{portraitSource ? (
									<Image source={portraitSource} style={styles.portraitImage} resizeMode="contain" />
								) : (
									<View style={styles.portraitFallback}>
										<ThemedText style={styles.portraitInitial}>{portraitInitials}</ThemedText>
									</View>
								)}
							</View>
							<View style={{ flex: 1 }}>
								<ThemedText style={styles.characterName}>{character.name}</ThemedText>
								<ThemedText style={styles.characterMeta}>
									{character.race} {character.class} • Level {character.level}
								</ThemedText>
								{character.trait ? (
									<ThemedText style={styles.characterTrait}>{character.trait}</ThemedText>
								) : null}
								{isAllCharactersView && (character.owner_email || character.owner_id) && (
									<ThemedText style={styles.ownerText}>
										Created by {character.owner_email || character.owner_id}
									</ThemedText>
								)}
							</View>
						</View>
						<View style={styles.actionButtons}>
							{showCloneButton && (
								<TouchableOpacity
									style={styles.cloneButton}
									onPress={(e) => handleClone(character, e)}
									disabled={cloneMutation.isPending}
								>
									<ThemedText style={styles.cloneLabel}>
										{cloneMutation.isPending ? 'Cloning...' : 'Clone'}
									</ThemedText>
								</TouchableOpacity>
							)}
							<ThemedText style={styles.viewLabel}>View Sheet</ThemedText>
						</View>
					</TouchableOpacity>
				);
			})}
		</>
	);
};

const styles = StyleSheet.create({
	sectionHint: {
		color: '#6B5B3D',
	},
	emptyCard: {
		gap: 12,
		padding: 14,
		borderRadius: 10,
		backgroundColor: 'rgba(255,255,255,0.7)',
	},
	characterCard: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: 'rgba(255,255,255,0.85)',
		borderWidth: 1,
		borderColor: '#E6D5B8',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	characterName: {
		fontWeight: '600',
	},
	characterMeta: {
		color: '#6B5B3D',
	},
	characterTrait: {
		color: '#8A765C',
		fontSize: 12,
		marginTop: 2,
	},
	viewLabel: {
		color: '#8B6914',
		fontWeight: '700',
	},
	actionButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	cloneButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#8B6914',
		backgroundColor: 'transparent',
	},
	cloneLabel: {
		color: '#8B6914',
		fontWeight: '600',
		fontSize: 12,
	},
	portraitWrapper: {
		width: 48,
		height: 48,
		borderRadius: 8,
		overflow: 'hidden',
		backgroundColor: '#E6D5B8',
		justifyContent: 'center',
		alignItems: 'center',
	},
	portraitImage: {
		width: 48,
		height: 48,
	},
	portraitFallback: {
		width: 48,
		height: 48,
		borderRadius: 8,
		backgroundColor: '#C9B037',
		justifyContent: 'center',
		alignItems: 'center',
	},
	portraitInitial: {
		color: '#3B2F1B',
		fontWeight: 'bold',
		fontSize: 16,
	},
	ownerText: {
		color: '#8A765C',
		fontSize: 11,
		marginTop: 4,
		fontStyle: 'italic',
	},
});
