import React, { useState } from 'react';
import { Alert, Button, ScrollView, Text, TextInput, View } from 'react-native';

import { newGameStyles } from '../styles/new-game.styles';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface CharacterData {
	name: string;
	race: string;
	class: string;
	level: number;
	background: string;
	alignment: string;
	abilities: {
		strength: number;
		dexterity: number;
		constitution: number;
		intelligence: number;
		wisdom: number;
		charisma: number;
	};
	hitPoints: number;
	armorClass: number;
	speed: number;
	proficiencyBonus: number;
	skills: string[];
	equipment: string[];
	spells: string[];
	notes: string;
}

interface CharacterSheetBuilderProps {
	onCharacterCreate: (character: CharacterData) => void;
	onCancel: () => void;
	initialData?: Partial<CharacterData>;
}

export const CharacterSheetBuilder: React.FC<CharacterSheetBuilderProps> = ({
	onCharacterCreate,
	onCancel,
	initialData,
}) => {
	const [character, setCharacter] = useState<CharacterData>({
		name: initialData?.name || '',
		race: initialData?.race || '',
		class: initialData?.class || '',
		level: initialData?.level || 1,
		background: initialData?.background || '',
		alignment: initialData?.alignment || 'Neutral',
		abilities: {
			strength: 10,
			dexterity: 10,
			constitution: 10,
			intelligence: 10,
			wisdom: 10,
			charisma: 10,
			...initialData?.abilities,
		},
		hitPoints: initialData?.hitPoints || 8,
		armorClass: initialData?.armorClass || 10,
		speed: initialData?.speed || 30,
		proficiencyBonus: initialData?.proficiencyBonus || 2,
		skills: initialData?.skills || [],
		equipment: initialData?.equipment || [],
		spells: initialData?.spells || [],
		notes: initialData?.notes || '',
	});

	const updateCharacter = (field: keyof CharacterData, value: string | number | string[]) => {
		setCharacter(prev => ({
			...prev,
			[field]: value,
		}));
	};

	const updateAbility = (ability: keyof CharacterData['abilities'], value: number) => {
		setCharacter(prev => ({
			...prev,
			abilities: {
				...prev.abilities,
				[ability]: value,
			},
		}));
	};

	const validateAndSubmit = () => {
		if (!character.name || !character.race || !character.class) {
			Alert.alert('Missing Information', 'Please fill in at least the character name, race, and class.');
			return;
		}

		onCharacterCreate(character);
	};

	const getAbilityModifier = (score: number): number => {
		return Math.floor((score - 10) / 2);
	};

	return (
		<ThemedView style={newGameStyles.container}>
			<ScrollView contentContainerStyle={newGameStyles.scrollViewContent}>
				<ThemedText type="title" style={newGameStyles.title}>
					<Text>Character Sheet Builder</Text>
				</ThemedText>

				<View style={newGameStyles.sectionBox}>
					<ThemedText type="subtitle" style={newGameStyles.sectionTitle}>
						<Text>Basic Information</Text>
					</ThemedText>
					
					<ThemedText style={newGameStyles.label}>
						<Text>Character Name:</Text>
					</ThemedText>
					<TextInput
						style={newGameStyles.input}
						placeholder="Enter character name"
						value={character.name}
						onChangeText={(value) => updateCharacter('name', value)}
					/>

					<ThemedText style={newGameStyles.label}>
						<Text>Race:</Text>
					</ThemedText>
					<TextInput
						style={newGameStyles.input}
						placeholder="e.g., Human, Elf, Dwarf"
						value={character.race}
						onChangeText={(value) => updateCharacter('race', value)}
					/>

					<ThemedText style={newGameStyles.label}>
						<Text>Class:</Text>
					</ThemedText>
					<TextInput
						style={newGameStyles.input}
						placeholder="e.g., Fighter, Wizard, Rogue"
						value={character.class}
						onChangeText={(value) => updateCharacter('class', value)}
					/>

					<ThemedText style={newGameStyles.label}>
						<Text>Level:</Text>
					</ThemedText>
					<TextInput
						style={newGameStyles.input}
						placeholder="1"
						keyboardType="numeric"
						value={character.level.toString()}
						onChangeText={(value) => updateCharacter('level', parseInt(value) || 1)}
					/>

					<ThemedText style={newGameStyles.label}>
						<Text>Background:</Text>
					</ThemedText>
					<TextInput
						style={newGameStyles.input}
						placeholder="e.g., Acolyte, Criminal, Folk Hero"
						value={character.background}
						onChangeText={(value) => updateCharacter('background', value)}
					/>

					<ThemedText style={newGameStyles.label}>
						<Text>Alignment:</Text>
					</ThemedText>
					<TextInput
						style={newGameStyles.input}
						placeholder="e.g., Lawful Good, Chaotic Neutral"
						value={character.alignment}
						onChangeText={(value) => updateCharacter('alignment', value)}
					/>
				</View>

				<View style={newGameStyles.sectionBox}>
					<ThemedText type="subtitle" style={newGameStyles.sectionTitle}>
						<Text>Ability Scores</Text>
					</ThemedText>

					{Object.entries(character.abilities).map(([ability, score]) => (
						<View key={ability}>
							<ThemedText style={newGameStyles.label}>
								<Text>{ability.charAt(0).toUpperCase() + ability.slice(1)}: {score} (Modifier: {getAbilityModifier(score) >= 0 ? '+' : ''}{getAbilityModifier(score)})</Text>
							</ThemedText>
							<TextInput
								style={newGameStyles.input}
								placeholder="10"
								keyboardType="numeric"
								value={score.toString()}
								onChangeText={(value) => updateAbility(ability as keyof CharacterData['abilities'], parseInt(value) || 10)}
							/>
						</View>
					))}
				</View>

				<View style={newGameStyles.sectionBox}>
					<ThemedText type="subtitle" style={newGameStyles.sectionTitle}>
						<Text>Combat Stats</Text>
					</ThemedText>

					<ThemedText style={newGameStyles.label}>
						<Text>Hit Points:</Text>
					</ThemedText>
					<TextInput
						style={newGameStyles.input}
						placeholder="8"
						keyboardType="numeric"
						value={character.hitPoints.toString()}
						onChangeText={(value) => updateCharacter('hitPoints', parseInt(value) || 8)}
					/>

					<ThemedText style={newGameStyles.label}>
						<Text>Armor Class:</Text>
					</ThemedText>
					<TextInput
						style={newGameStyles.input}
						placeholder="10"
						keyboardType="numeric"
						value={character.armorClass.toString()}
						onChangeText={(value) => updateCharacter('armorClass', parseInt(value) || 10)}
					/>

					<ThemedText style={newGameStyles.label}>
						<Text>Speed (feet):</Text>
					</ThemedText>
					<TextInput
						style={newGameStyles.input}
						placeholder="30"
						keyboardType="numeric"
						value={character.speed.toString()}
						onChangeText={(value) => updateCharacter('speed', parseInt(value) || 30)}
					/>

					<ThemedText style={newGameStyles.label}>
						<Text>Proficiency Bonus:</Text>
					</ThemedText>
					<TextInput
						style={newGameStyles.input}
						placeholder="2"
						keyboardType="numeric"
						value={character.proficiencyBonus.toString()}
						onChangeText={(value) => updateCharacter('proficiencyBonus', parseInt(value) || 2)}
					/>
				</View>

				<View style={newGameStyles.sectionBox}>
					<ThemedText type="subtitle" style={newGameStyles.sectionTitle}>
						<Text>Additional Notes</Text>
					</ThemedText>

					<ThemedText style={newGameStyles.label}>
						<Text>Character Notes:</Text>
					</ThemedText>
					<TextInput
						style={[newGameStyles.input, newGameStyles.textArea]}
						placeholder="Add any additional character details, backstory, or notes here..."
						multiline
						numberOfLines={4}
						value={character.notes}
						onChangeText={(value) => updateCharacter('notes', value)}
					/>

					<ThemedText style={newGameStyles.infoText}>
						<Text>Skills, Equipment, and Spells can be managed in-game after character creation.</Text>
					</ThemedText>
				</View>

				<View style={newGameStyles.wizardNavigation}>
					<Button title="Cancel" onPress={onCancel} />
					<Button title="Create Character" onPress={validateAndSubmit} />
				</View>
			</ScrollView>
		</ThemedView>
	);
};

CharacterSheetBuilder.displayName = 'CharacterSheetBuilder';