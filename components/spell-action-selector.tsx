import React, { useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Character } from '@/types/character';

interface Spell {
	name: string;
	level: number;
	actionPoints: number;
	description?: string;
}

interface Action {
	name: string;
	type: 'cast_spell' | 'basic_attack' | 'use_item' | 'heal_potion';
	actionPoints: number;
	description?: string;
}

interface SpellActionSelectorProps {
	visible: boolean;
	onClose: () => void;
	character: Character | null;
	onSelect: (action: Action) => void;
	isDM?: boolean;
}

// Default spells based on character class (simplified)
const getDefaultSpells = (characterClass: string, level: number): Spell[] => {
	const spells: Spell[] = [];
	
	if (characterClass.toLowerCase().includes('wizard') || characterClass.toLowerCase().includes('sorcerer')) {
		spells.push(
			{ name: 'Magic Missile', level: 1, actionPoints: 2, description: 'Deal 1d4+1 force damage' },
			{ name: 'Firebolt', level: 0, actionPoints: 1, description: 'Deal 1d10 fire damage' },
			{ name: 'Shield', level: 1, actionPoints: 2, description: 'Gain +5 AC until next turn' },
		);
		if (level >= 3) {
			spells.push({ name: 'Fireball', level: 3, actionPoints: 3, description: 'Deal 8d6 fire damage in area' });
		}
	} else if (characterClass.toLowerCase().includes('cleric')) {
		spells.push(
			{ name: 'Cure Wounds', level: 1, actionPoints: 2, description: 'Heal 1d8+3 HP' },
			{ name: 'Sacred Flame', level: 0, actionPoints: 1, description: 'Deal 1d8 radiant damage' },
			{ name: 'Bless', level: 1, actionPoints: 2, description: 'Grant +1d4 to attack rolls' },
		);
	} else {
		// Default spells for other classes
		spells.push(
			{ name: 'Minor Heal', level: 0, actionPoints: 1, description: 'Heal 1d4 HP' },
		);
	}
	
	return spells;
};

export const SpellActionSelector: React.FC<SpellActionSelectorProps> = ({
	visible,
	onClose,
	character,
	onSelect,
	isDM = false,
}) => {
	const availableActions = useMemo(() => {
		if (!character) return [];

		const actions: Action[] = [
			{
				name: 'Basic Attack',
				type: 'basic_attack',
				actionPoints: 1,
				description: 'Perform a melee or ranged attack',
			},
		];

		// Add spells
		const spells = getDefaultSpells(character.class, character.level);
		spells.forEach((spell) => {
			actions.push({
				name: spell.name,
				type: 'cast_spell',
				actionPoints: spell.actionPoints,
				description: spell.description,
			});
		});

		// Add healing potion if available
		const hasPotion = character.inventory?.some((item: any) => 
			typeof item === 'object' && item?.name?.toLowerCase().includes('potion'),
		) || false;
		
		if (hasPotion) {
			actions.push({
				name: 'Heal with Potion',
				type: 'heal_potion',
				actionPoints: 1,
				description: 'Use a healing potion to restore 2d4+2 HP',
			});
		}

		// Filter by available action points
		return actions.filter(action => action.actionPoints <= (character.actionPoints ?? 0));
	}, [character]);

	const handleSelect = (action: Action) => {
		onSelect(action);
		onClose();
	};

	if (!character) {
		return null;
	}

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onClose}
		>
			<TouchableOpacity
				style={styles.overlay}
				activeOpacity={1}
				onPress={onClose}
			>
				<TouchableOpacity
					activeOpacity={1}
					onPress={(e) => e.stopPropagation()}
					style={styles.modal}
				>
					<ThemedView style={styles.content}>
						<ThemedText type="subtitle" style={styles.title}>
							{isDM ? `Actions for ${character.name}` : 'Select Action'}
						</ThemedText>
						<ThemedText style={styles.subtitle}>
							Action Points: {character.actionPoints ?? 0} / {character.maxActionPoints ?? 3}
						</ThemedText>
						<ScrollView style={styles.list}>
							{availableActions.length === 0 ? (
								<ThemedText style={styles.emptyText}>
									No actions available. Not enough action points.
								</ThemedText>
							) : (
								availableActions.map((action, index) => (
									<TouchableOpacity
										key={`${action.type}-${index}`}
										style={styles.actionItem}
										onPress={() => handleSelect(action)}
									>
										<View style={styles.actionContent}>
											<ThemedText style={styles.actionName}>{action.name}</ThemedText>
											{action.description && (
												<ThemedText style={styles.actionDescription}>{action.description}</ThemedText>
											)}
										</View>
										<View style={styles.actionPointsBadge}>
											<ThemedText style={styles.actionPointsText}>
												{action.actionPoints} AP
											</ThemedText>
										</View>
									</TouchableOpacity>
								))
							)}
						</ScrollView>
						<TouchableOpacity
							style={styles.closeButton}
							onPress={onClose}
						>
							<ThemedText style={styles.closeButtonText}>Close</ThemedText>
						</TouchableOpacity>
					</ThemedView>
				</TouchableOpacity>
			</TouchableOpacity>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modal: {
		width: '90%',
		maxWidth: 500,
		maxHeight: '80%',
	},
	content: {
		backgroundColor: '#FFF9EF',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#C9B037',
		padding: 20,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 8,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: 14,
		color: '#6B5B3D',
		marginBottom: 16,
		textAlign: 'center',
	},
	list: {
		maxHeight: 400,
	},
	emptyText: {
		textAlign: 'center',
		color: '#6B5B3D',
		padding: 20,
	},
	actionItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#E2D3B3',
		padding: 12,
		marginBottom: 8,
	},
	actionContent: {
		flex: 1,
	},
	actionName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#3B2F1B',
		marginBottom: 4,
	},
	actionDescription: {
		fontSize: 12,
		color: '#6B5B3D',
	},
	actionPointsBadge: {
		backgroundColor: '#4A6741',
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 4,
		marginLeft: 12,
	},
	actionPointsText: {
		color: '#FFF9EF',
		fontSize: 12,
		fontWeight: '600',
	},
	closeButton: {
		marginTop: 16,
		paddingVertical: 12,
		backgroundColor: '#4A6741',
		borderRadius: 8,
		alignItems: 'center',
	},
	closeButtonText: {
		color: '#FFF9EF',
		fontSize: 14,
		fontWeight: '600',
	},
});

