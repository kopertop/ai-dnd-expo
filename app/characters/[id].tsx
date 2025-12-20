import { useQueryApi } from 'expo-auth-template/frontend';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import CharacterSheet5e from '@/components/character-sheet-5e';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useUserInfo } from '@/hooks/api/use-auth-queries';
import { useDeleteCharacter, useMyCharacters } from '@/hooks/api/use-character-queries';
import { Character } from '@/types/character';

const CharacterSheetScreen: React.FC = () => {
	const params = useLocalSearchParams<{ id?: string }>();
	const characterIdParam = Array.isArray(params.id) ? params.id[0] : params.id;

	const { data: userInfo } = useUserInfo();
	const { data: myCharactersData, isLoading: listLoading } = useMyCharacters();
	const myCharacters = Array.isArray(myCharactersData)
		? myCharactersData
		: myCharactersData?.characters || [];

	const initialCharacter = useMemo(
		() => myCharacters.find(char => char.id === characterIdParam),
		[myCharacters, characterIdParam],
	);

	const [localCharacter, setLocalCharacter] = useState<Character | null>(null);

	const {
		data: characterData,
		isLoading: detailLoading,
		error: detailError,
	} = useQueryApi<{ character: Character }>(
		characterIdParam ? `/characters/${characterIdParam}` : '',
		{
			enabled: !!characterIdParam,
		},
	);

	const deleteMutation = useDeleteCharacter();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmInput, setConfirmInput] = useState('');

	const character = localCharacter || characterData?.character || initialCharacter || null;
	const isLoading = listLoading || detailLoading;

	// Check if character is owned by current user
	const isOwned = useMemo(() => {
		if (!character) return false;
		return myCharacters.some(char => char.id === character.id);
	}, [character, myCharacters]);

	const isAdmin = userInfo?.is_admin === true;
	const isAdminViewingOther = isAdmin && !isOwned;
	const isReadOnly = !isOwned && !isAdmin;

	const deleteDisabled =
		!character ||
		!isOwned ||
		deleteMutation.isPending ||
		confirmInput.trim().toLowerCase() !== character.name.trim().toLowerCase();

	const handleDelete = async () => {
		if (!character) return;
		try {
			await deleteMutation.mutateAsync({ path: `/characters/${character.id}` });
			setConfirmOpen(false);
			setLocalCharacter(null);
			setConfirmInput('');
			router.replace('/');
		} catch (error) {
			Alert.alert(
				'Delete failed',
				error instanceof Error ? error.message : 'Unable to delete character.',
			);
		}
	};

	return (
		<ThemedView style={styles.container}>
			<Stack.Screen
				options={{
					title: character?.name || 'Character Sheet',
				}}
			/>
			{isLoading && (
				<View style={styles.center}>
					<ActivityIndicator />
					<ThemedText style={styles.loadingText}>Loading character...</ThemedText>
				</View>
			)}
			{!isLoading && detailError && (
				<View style={styles.center}>
					<ThemedText style={styles.errorText}>Failed to load character.</ThemedText>
					<ThemedText style={styles.errorText}>
						{detailError instanceof Error ? detailError.message : 'Unknown error'}
					</ThemedText>
				</View>
			)}
			{!isLoading && !character && (
				<View style={styles.center}>
					<ThemedText style={styles.errorText}>Character not found.</ThemedText>
				</View>
			)}
			{!isLoading && character && (
				<View style={styles.sheetWrapper}>
					{isAdminViewingOther && (
						<View style={styles.adminBanner}>
							<ThemedText style={styles.adminBannerText}>
								Admin View - Editing {character.name} (owned by another player)
							</ThemedText>
						</View>
					)}
					{isReadOnly && (
						<View style={styles.readOnlyBanner}>
							<ThemedText style={styles.readOnlyBannerText}>
								Read-only view - This character belongs to another player
							</ThemedText>
						</View>
					)}
					<CharacterSheet5e
						character={character}
						onCharacterUpdated={updated => setLocalCharacter(updated)}
						readOnly={isReadOnly}
						isAdminViewingOther={isAdminViewingOther}
					/>
					{isOwned && (
						<View style={styles.actionsRow}>
							<Pressable
								style={styles.deleteButton}
								onPress={() => {
									setConfirmInput('');
									setConfirmOpen(true);
								}}
							>
								<ThemedText style={styles.deleteButtonText}>Delete Character</ThemedText>
							</Pressable>
						</View>
					)}
				</View>
			)}
			<Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalBox}>
						<ThemedText style={styles.modalTitle}>Delete this character?</ThemedText>
						<ThemedText style={styles.modalDescription}>
							Type the character name to confirm. This action cannot be undone.
						</ThemedText>
						<TextInput
							style={styles.confirmInput}
							value={confirmInput}
							onChangeText={setConfirmInput}
							placeholder={character?.name || 'Character name'}
							placeholderTextColor="#8a6c5a"
							autoCapitalize="none"
							autoCorrect={false}
						/>
						<View style={styles.modalActions}>
							<Pressable
								style={[styles.modalButton, styles.cancelButton]}
								onPress={() => setConfirmOpen(false)}
							>
								<ThemedText style={styles.cancelText}>Cancel</ThemedText>
							</Pressable>
							<Pressable
								style={[
									styles.modalButton,
									styles.confirmButton,
									deleteDisabled && styles.disabledButton,
								]}
								disabled={deleteDisabled}
								onPress={handleDelete}
							>
								<ThemedText style={styles.confirmText}>
									{deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
								</ThemedText>
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>
		</ThemedView>
	);
};

export default CharacterSheetScreen;

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#E9DFC7',
	},
	sheetWrapper: {
		flex: 1,
	},
	actionsRow: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	deleteButton: {
		backgroundColor: '#7a1f1f',
		borderRadius: 10,
		paddingVertical: 12,
		alignItems: 'center',
	},
	deleteButtonText: {
		color: '#fff7ea',
		fontWeight: '700',
	},
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
		gap: 8,
	},
	loadingText: {
		color: '#5C4631',
	},
	errorText: {
		color: '#7A2E2E',
		textAlign: 'center',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.45)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	modalBox: {
		width: '100%',
		maxWidth: 460,
		backgroundColor: '#fffaf0',
		borderRadius: 12,
		padding: 16,
		gap: 10,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
	},
	modalDescription: {
		color: '#6b4c35',
	},
	confirmInput: {
		borderWidth: 1,
		borderColor: '#cbb08a',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		color: '#2a160e',
	},
	modalActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 10,
		marginTop: 6,
	},
	modalButton: {
		flex: 1,
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
	},
	cancelButton: {
		backgroundColor: '#f2e4cb',
	},
	confirmButton: {
		backgroundColor: '#7a1f1f',
	},
	cancelText: {
		color: '#2a160e',
		fontWeight: '600',
	},
	confirmText: {
		color: '#fffaf0',
		fontWeight: '700',
	},
	disabledButton: {
		opacity: 0.6,
	},
	adminBanner: {
		backgroundColor: '#FFE5B4',
		padding: 12,
		borderBottomWidth: 2,
		borderBottomColor: '#FFA500',
		marginBottom: 8,
	},
	adminBannerText: {
		color: '#8B4513',
		fontWeight: '600',
		textAlign: 'center',
	},
	readOnlyBanner: {
		backgroundColor: '#E8E8E8',
		padding: 12,
		borderBottomWidth: 2,
		borderBottomColor: '#999',
		marginBottom: 8,
	},
	readOnlyBannerText: {
		color: '#666',
		fontWeight: '600',
		textAlign: 'center',
	},
});
