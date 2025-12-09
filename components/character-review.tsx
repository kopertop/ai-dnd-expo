import React, { useMemo, useState } from 'react';
import {
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import { CharacterSheet5e } from '@/components/character-sheet-5e';
import { generateRandomBackground } from '@/constants/backgrounds';
import { generateRandomName } from '@/constants/character-names';
import { Character } from '@/types/character';
import { ClassOption } from '@/types/class-option';
import { RaceOption } from '@/types/race-option';
import { PartialStatBlock, StatBlock } from '@/types/stats';

interface CharacterReviewProps {
	name: string;
	description: string;
	race: RaceOption;
	classOption: ClassOption;
	baseStats: StatBlock; // before racial bonuses
	racialBonuses: PartialStatBlock;
	onBack: () => void;
	onFinish: (finalData: {
		name: string;
		description: string;
		stats: StatBlock;
		skills: string[];
		icon?: any;
	}) => void;
	skills: string[];
}

// Helper to create a temporary Character object from creation data
const createTempCharacter = (
	name: string,
	description: string,
	race: RaceOption,
	classOption: ClassOption,
	baseStats: StatBlock,
	racialBonuses: Partial<StatBlock>,
	skills: string[],
	icon?: any,
): Character => {
	// Apply racial bonuses to base stats
	const finalStats: StatBlock = {
		STR: (baseStats.STR || 10) + (racialBonuses.STR || 0),
		DEX: (baseStats.DEX || 10) + (racialBonuses.DEX || 0),
		CON: (baseStats.CON || 10) + (racialBonuses.CON || 0),
		INT: (baseStats.INT || 10) + (racialBonuses.INT || 0),
		WIS: (baseStats.WIS || 10) + (racialBonuses.WIS || 0),
		CHA: (baseStats.CHA || 10) + (racialBonuses.CHA || 0),
	};

	// Convert icon to string format
	let iconValue = '';
	if (icon) {
		if (typeof icon === 'object' && icon.uri) {
			iconValue = icon.uri;
		} else if (typeof icon === 'number') {
			// It's a required asset (preset) - we'd need to find the key
			// For now, just use empty string
			iconValue = '';
		} else if (typeof icon === 'string') {
			iconValue = icon;
		}
	}

	return {
		id: 'temp-' + Date.now(), // Temporary ID
		level: 1,
		race: race.name,
		name: name,
		class: classOption.name,
		trait: undefined, // Will be set if needed
		icon: iconValue,
		description: description,
		stats: finalStats,
		skills: skills,
		inventory: [],
		equipped: {},
		health: 10, // Default starting health
		maxHealth: 10,
		actionPoints: 3,
		maxActionPoints: 3,
		statusEffects: [],
		preparedSpells: [],
	};
};

export const CharacterReview: React.FC<CharacterReviewProps> = ({
	name: initialName,
	description: initialDescription,
	race,
	classOption,
	baseStats,
	racialBonuses,
	onBack,
	onFinish,
	skills,
}) => {
	const [name, setName] = useState(initialName);
	const [description, setDescription] = useState(initialDescription);
	const [selectedIcon, setSelectedIcon] = useState<any>(race.image);

	const handleRandomizeName = () => {
		const randomName = generateRandomName(race.name, classOption.name);
		setName(randomName);
	};

	const handleRandomizeBackground = () => {
		const randomBackground = generateRandomBackground(race.name, classOption.name);
		setDescription(randomBackground);
	};

	// Create temporary character object for CharacterSheet5e
	const tempCharacter = useMemo(
		() =>
			createTempCharacter(
				name,
				description,
				race,
				classOption,
				baseStats,
				racialBonuses,
				skills,
				selectedIcon,
			),
		[name, description, race, classOption, baseStats, racialBonuses, skills, selectedIcon],
	);

	// Handle character updates from CharacterSheet5e (e.g., icon changes, description changes)
	// Note: CharacterSheet5e will try to persist updates via API, but since we're using a temp character,
	// those API calls will fail. We just sync the local state here.
	const handleCharacterUpdated = (updated: Character) => {
		// Update icon if changed (from PortraitSelector)
		if (updated.icon !== undefined && updated.icon !== tempCharacter.icon) {
			// Convert icon string back to object if it's a URI
			if (typeof updated.icon === 'string' && updated.icon.startsWith('http')) {
				setSelectedIcon({ uri: updated.icon });
			} else {
				setSelectedIcon(updated.icon);
			}
		}
		// Sync description if changed (from CharacterSheet5e's textarea)
		if (updated.description !== undefined && updated.description !== description) {
			setDescription(updated.description);
		}
		// Note: CharacterSheet5e doesn't allow editing name directly in the banner,
		// so we handle name in our header section above
	};

	const handleSave = () => {
		// Calculate final stats with racial bonuses
		const finalStats: StatBlock = {
			STR: (baseStats.STR || 10) + (racialBonuses.STR || 0),
			DEX: (baseStats.DEX || 10) + (racialBonuses.DEX || 0),
			CON: (baseStats.CON || 10) + (racialBonuses.CON || 0),
			INT: (baseStats.INT || 10) + (racialBonuses.INT || 0),
			WIS: (baseStats.WIS || 10) + (racialBonuses.WIS || 0),
			CHA: (baseStats.CHA || 10) + (racialBonuses.CHA || 0),
		};

		onFinish({
			name,
			description,
			stats: finalStats,
			skills,
			icon: selectedIcon,
		});
	};

	return (
		<View style={styles.container}>
			{/* Use CharacterSheet5e to display the character */}
			<CharacterSheet5e
				character={tempCharacter}
				onCharacterUpdated={handleCharacterUpdated}
				editableName={true}
				onNameChange={setName}
				onRandomizeName={handleRandomizeName}
				editableBackground={true}
				onBackgroundChange={setDescription}
				onRandomizeBackground={handleRandomizeBackground}
			/>

			{/* Save Character button */}
			<View style={styles.actionsRow}>
				<TouchableOpacity style={styles.finishButton} onPress={handleSave}>
					<Text style={styles.finishButtonText}>Save Character</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: '100%',
	},
	actionsRow: {
		marginTop: 24,
		paddingHorizontal: 16,
		paddingBottom: 16,
		width: '100%',
		alignItems: 'center',
	},
	finishButton: {
		width: '100%',
		backgroundColor: '#4caf50',
		paddingVertical: 16,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	finishButtonText: {
		color: '#FFFFFF',
		fontSize: 18,
		fontWeight: 'bold',
	},
});
