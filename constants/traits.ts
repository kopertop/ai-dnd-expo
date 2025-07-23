import { TraitOption } from '@/types/trait-option';

export const TRAITS: TraitOption[] = [
	{
		id: 'stormtouched',
		name: 'Stormtouched',
		description: 'Born during a tempest, you have an innate connection to lightning and thunder.',
		image: require('../assets/images/traits/stormtouched.png'),
		action: {
			name: 'Lightning Burst',
			description: 'Channel the storm within you to unleash electrical fury.',
			effect: 'Explode when surrounded by enemies, doing 3d6 lightning damage to all characters within a 3 block radius, including yourself.',
		},
	},
	{
		id: 'marked-by-death',
		name: 'Marked by Death',
		description: 'You have survived a brush with death, gaining insight into the afterlife.',
		image: require('../assets/images/traits/marked-by-death.png'),
		action: {
			name: 'Death\'s Embrace',
			description: 'Channel the power of death to weaken your enemies.',
			effect: 'Once per long rest, you can force a creature within 30 feet to make a Constitution saving throw. On a failure, they take 2d6 necrotic damage and have disadvantage on their next attack roll.',
		},
	},
	{
		id: 'starcursed',
		name: 'Starcursed',
		description: 'A celestial event at your birth left you with mysterious cosmic powers.',
		image: require('../assets/images/traits/starcursed.png'),
		action: {
			name: 'Cosmic Alignment',
			description: 'Align yourself with the stars to gain temporary insight.',
			effect: 'Once per short rest, you can gain advantage on your next Intelligence or Wisdom check, or force an enemy to reroll their attack against you.',
		},
	},
	{
		id: 'draconic-heritage',
		name: 'Draconic Heritage',
		description: 'Dragon blood flows through your veins, granting you draconic resilience.',
		image: require('../assets/images/traits/draconic-heritage.png'),
		action: {
			name: 'Dragon\'s Breath',
			description: 'Unleash the fire within your draconic bloodline.',
			effect: 'Once per long rest, you can exhale a 15-foot cone of fire, dealing 2d6 fire damage to all creatures in the area. They must make a Dexterity saving throw for half damage.',
		},
	},
	{
		id: 'infernal-taint',
		name: 'Infernal Taint',
		description: 'Your soul bears the mark of the Nine Hells, granting infernal powers.',
		image: require('../assets/images/traits/infernal-taint.png'),
		action: {
			name: 'Hellfire Strike',
			description: 'Channel the fires of the Nine Hells through your weapon.',
			effect: 'Once per short rest, when you hit with a weapon attack, you can add 1d6 fire damage and force the target to make a Wisdom saving throw or be frightened of you until the end of their next turn.',
		},
	},
	{
		id: 'celestial-blood',
		name: 'Celestial Blood',
		description: 'Divine ancestry flows through you, connecting you to the Upper Planes.',
		image: require('../assets/images/traits/celestial-blood.png'),
		action: {
			name: 'Divine Radiance',
			description: 'Channel the light of the heavens to heal and protect.',
			effect: 'Once per long rest, you can emit bright light in a 20-foot radius for 1 minute. During this time, you and allies within the light gain 1d6 temporary hit points, and undead have disadvantage on attacks against you.',
		},
	},
	{
		id: 'elemental-ice',
		name: 'Elemental Ice',
		description: 'You have a natural affinity for cold and ice magic.',
		image: require('../assets/images/traits/elemental-ice.png'),
		action: {
			name: 'Frost Nova',
			description: 'Unleash a burst of freezing cold energy.',
			effect: 'Once per short rest, you can create a 10-foot radius burst of ice around you. All creatures in the area take 2d6 cold damage and must make a Constitution saving throw or be slowed (speed halved) until the end of their next turn.',
		},
	},
	{
		id: 'elemental-fire',
		name: 'Elemental Fire',
		description: 'Flames dance at your command, born from inner fire.',
		image: require('../assets/images/traits/elemental-fire.png'),
		action: {
			name: 'Flame Surge',
			description: 'Channel your inner fire to enhance your attacks.',
			effect: 'Once per short rest, you can wreathe your weapon in flames for 1 minute. During this time, your weapon attacks deal an additional 1d6 fire damage, and you can use a bonus action to make a ranged spell attack (1d8 fire damage, range 60 feet).',
		},
	},
	{
		id: 'shadowbound',
		name: 'Shadowbound',
		description: 'Shadows cling to you, granting stealth and dark vision.',
		image: require('../assets/images/traits/shadowbound.png'),
		action: {
			name: 'Shadow Step',
			description: 'Melt into the shadows to move unseen.',
			effect: 'Once per short rest, you can teleport up to 30 feet to an unoccupied space you can see that is in dim light or darkness. You have advantage on your next attack roll against a creature that didn\'t see you teleport.',
		},
	},
	{
		id: 'feytouched',
		name: 'Feytouched',
		description: 'Fey magic has left its mark, making you unpredictable and charming.',
		image: require('../assets/images/traits/feytouched.png'),
		action: {
			name: 'Fey Charm',
			description: 'Use your fey magic to beguile and confuse enemies.',
			effect: 'Once per short rest, you can target one creature within 30 feet. They must make a Wisdom saving throw or be charmed by you for 1 minute. While charmed, they can\'t attack you and you have advantage on Charisma checks against them.',
		},
	},
	{
		id: 'arcane-tattooed',
		name: 'Arcane Tattooed',
		description: 'Mystical tattoos cover your body, channeling raw magical energy.',
		image: require('../assets/images/traits/arcane-tattooed.png'),
		action: {
			name: 'Tattoo Surge',
			description: 'Activate your arcane tattoos to enhance your magical abilities.',
			effect: 'Once per long rest, you can activate your tattoos for 1 minute. During this time, you have advantage on spell attack rolls, and when you cast a spell of 1st level or higher, you can cast it without expending a spell slot once.',
		},
	},
	{
		id: 'spellscared',
		name: 'Spellscared',
		description: 'A magical accident left you with permanent arcane scars and power.',
		image: require('../assets/images/traits/spellscared.png'),
		action: {
			name: 'Scar Resonance',
			description: 'Channel the residual magic from your scars.',
			effect: 'Once per short rest, when you take damage from a spell, you can use your reaction to absorb some of the magic. You gain resistance to that damage type until the end of your next turn, and your next spell deals an additional 1d6 damage.',
		},
	},
	{
		id: 'runeblooded',
		name: 'Runeblooded',
		description: 'Ancient runes pulse through your veins, granting mystical knowledge.',
		image: require('../assets/images/traits/runeblooded.png'),
		action: {
			name: 'Rune Awakening',
			description: 'Awaken the ancient runes within your blood.',
			effect: 'Once per long rest, you can activate your runes for 1 minute. During this time, you can read and understand any written language, and you have advantage on Intelligence (Arcana) and Intelligence (History) checks.',
		},
	},
	{
		id: 'artifact-embedded',
		name: 'Artifact Embedded',
		description: 'A powerful artifact has fused with your body, granting unique abilities.',
		image: require('../assets/images/traits/artifact-embedded.png'),
		action: {
			name: 'Artifact Surge',
			description: 'Channel the power of the embedded artifact.',
			effect: 'Once per long rest, you can activate your embedded artifact for 1 minute. During this time, you gain a +2 bonus to all ability checks and saving throws, and you can use a bonus action to make an additional weapon attack once per turn.',
		},
	},
	{
		id: 'custom',
		name: 'Custom',
		description: 'Create your own trait! Define your unique magical or physical characteristic.',
		image: require('../assets/images/custom.png'),
		isCustom: true,
	},
];

export const TraitByID: Record<string, TraitOption> = TRAITS.reduce(
	(acc, trait) => {
		acc[trait.id] = trait;
		return acc;
	},
	{} as Record<string, TraitOption>,
);
