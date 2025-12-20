import customImage from '@/assets/images/custom.png';
import artificerImage from '@/assets/images/classes/artificer.png';
import barbarianImage from '@/assets/images/classes/barbarian.png';
import bardImage from '@/assets/images/classes/bard.png';
import clericImage from '@/assets/images/classes/cleric.png';
import druidImage from '@/assets/images/classes/druid.png';
import fighterImage from '@/assets/images/classes/fighter.png';
import monkImage from '@/assets/images/classes/monk.png';
import paladinImage from '@/assets/images/classes/paladin.png';
import rangerImage from '@/assets/images/classes/ranger.png';
import rogueImage from '@/assets/images/classes/rogue.png';
import sorcererImage from '@/assets/images/classes/sorcerer.png';
import warlockImage from '@/assets/images/classes/warlock.png';
import wizardImage from '@/assets/images/classes/wizard.png';
import acrobaticsImage from '@/assets/images/skills/acrobatics.png';
import arcanaImage from '@/assets/images/skills/arcana.png';
import athleticsImage from '@/assets/images/skills/athletics.png';
import bluffImage from '@/assets/images/skills/bluff.png';
import diplomacyImage from '@/assets/images/skills/diplomacy.png';
import dungeoneeringImage from '@/assets/images/skills/dungeoneering.png';
import enduranceImage from '@/assets/images/skills/endurance.png';
import healImage from '@/assets/images/skills/heal.png';
import historyImage from '@/assets/images/skills/history.png';
import insightImage from '@/assets/images/skills/insight.png';
import intimidateImage from '@/assets/images/skills/intimidate.png';
import natureImage from '@/assets/images/skills/nature.png';
import perceptionImage from '@/assets/images/skills/perception.png';
import religionImage from '@/assets/images/skills/religion.png';
import stealthImage from '@/assets/images/skills/stealth.png';
import streetwiseImage from '@/assets/images/skills/streetwise.png';
import thieveryImage from '@/assets/images/skills/thievery.png';
import dragonbornImage from '@/assets/images/races/dragonborn.png';
import dwarfImage from '@/assets/images/races/dwarf.png';
import eladrinImage from '@/assets/images/races/eladrin.png';
import elfImage from '@/assets/images/races/elf.png';
import gnomeImage from '@/assets/images/races/gnome.png';
import halfElfImage from '@/assets/images/races/half-elf.png';
import halfOrcImage from '@/assets/images/races/half-orc.png';
import halflingImage from '@/assets/images/races/halfling.png';
import humanImage from '@/assets/images/races/human.png';
import tieflingImage from '@/assets/images/races/tiefling.png';
import arcaneTattooedImage from '@/assets/images/traits/arcane-tattooed.png';
import artifactEmbeddedImage from '@/assets/images/traits/artifact-embedded.png';
import celestialBloodImage from '@/assets/images/traits/celestial-blood.png';
import draconicHeritageImage from '@/assets/images/traits/draconic-heritage.png';
import elementalFireImage from '@/assets/images/traits/elemental-fire.png';
import elementalIceImage from '@/assets/images/traits/elemental-ice.png';
import feytouchedImage from '@/assets/images/traits/feytouched.png';
import infernalTaintImage from '@/assets/images/traits/infernal-taint.png';
import markedByDeathImage from '@/assets/images/traits/marked-by-death.png';
import runebloodedImage from '@/assets/images/traits/runeblooded.png';
import shadowboundImage from '@/assets/images/traits/shadowbound.png';
import spellscaredImage from '@/assets/images/traits/spellscared.png';
import starcursedImage from '@/assets/images/traits/starcursed.png';
import stormtouchedImage from '@/assets/images/traits/stormtouched.png';
import { getRaceBaseSpeed } from '@/constants/race-speed';
import type { ClassOption } from '@/types/class-option';
import type { RaceOption } from '@/types/race-option';
import type { Skill } from '@/types/skill';
import type { TraitOption } from '@/types/trait-option';

export const WEB_RACES: RaceOption[] = [
	{
		id: 'human',
		name: 'Human',
		description: 'Versatile and ambitious, humans are found throughout the world.',
		image: humanImage,
		statBonuses: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
		speed: getRaceBaseSpeed('human'),
	},
	{
		id: 'elf',
		name: 'Elf',
		description: 'Graceful, swift, and attuned to nature and magic.',
		image: elfImage,
		statBonuses: { DEX: 2 },
		speed: getRaceBaseSpeed('elf'),
	},
	{
		id: 'dwarf',
		name: 'Dwarf',
		description: 'Stout, hardy, and strong, dwarves are known for their resilience.',
		image: dwarfImage,
		statBonuses: { CON: 2 },
		speed: getRaceBaseSpeed('dwarf'),
	},
	{
		id: 'dragonborn',
		name: 'Dragonborn',
		description: 'Proud, honorable warriors with draconic ancestry.',
		image: dragonbornImage,
		statBonuses: { STR: 2, CHA: 1 },
		speed: getRaceBaseSpeed('dragonborn'),
	},
	{
		id: 'tiefling',
		name: 'Tiefling',
		description: 'Descendants of infernal pacts, marked by horns and tails.',
		image: tieflingImage,
		statBonuses: { CHA: 2, INT: 1 },
		speed: getRaceBaseSpeed('tiefling'),
	},
	{
		id: 'halfling',
		name: 'Halfling',
		description: 'Small, nimble, and lucky, halflings are cheerful wanderers.',
		image: halflingImage,
		statBonuses: { DEX: 2 },
		speed: getRaceBaseSpeed('halfling'),
	},
	{
		id: 'half-elf',
		name: 'Half-Elf',
		description: 'Blending human versatility and elven grace.',
		image: halfElfImage,
		statBonuses: { CHA: 2, DEX: 1, CON: 1 },
		speed: getRaceBaseSpeed('half-elf'),
	},
	{
		id: 'half-orc',
		name: 'Half-Orc',
		description: 'Strong and fierce, half-orcs are often misunderstood.',
		image: halfOrcImage,
		statBonuses: { STR: 2, CON: 1 },
		speed: getRaceBaseSpeed('half-orc'),
	},
	{
		id: 'gnome',
		name: 'Gnome',
		description: 'Inventive and magical, gnomes are clever tricksters.',
		image: gnomeImage,
		statBonuses: { INT: 2 },
		speed: getRaceBaseSpeed('gnome'),
	},
	{
		id: 'eladrin',
		name: 'Eladrin',
		description: 'Fey-touched elves with strong ties to the arcane.',
		image: eladrinImage,
		statBonuses: { DEX: 2, CHA: 1 },
		speed: getRaceBaseSpeed('eladrin'),
	},
	{
		id: 'custom',
		name: 'Custom',
		description: 'Create your own race and ancestry details.',
		image: customImage,
		isCustom: true,
		speed: getRaceBaseSpeed('custom'),
	},
];

export const WEB_CLASSES: ClassOption[] = [
	{
		id: 'fighter',
		name: 'Fighter',
		description: 'Masters of combat, fighters excel with weapons and armor.',
		image: fighterImage,
		primaryStats: ['STR'],
		secondaryStats: ['CON', 'DEX'],
	},
	{
		id: 'rogue',
		name: 'Rogue',
		description: 'Skilled in stealth, thievery, and precision strikes.',
		image: rogueImage,
		primaryStats: ['DEX'],
		secondaryStats: ['INT', 'CHA'],
	},
	{
		id: 'wizard',
		name: 'Wizard',
		description: 'Arcane masters who wield powerful spells through study.',
		image: wizardImage,
		primaryStats: ['INT'],
		secondaryStats: ['CON', 'DEX'],
	},
	{
		id: 'cleric',
		name: 'Cleric',
		description: 'Divine spellcasters who heal allies and smite enemies.',
		image: clericImage,
		primaryStats: ['WIS'],
		secondaryStats: ['STR', 'CON'],
	},
	{
		id: 'ranger',
		name: 'Ranger',
		description: 'Skilled hunters and trackers who protect the wilds.',
		image: rangerImage,
		primaryStats: ['DEX', 'WIS'],
		secondaryStats: ['CON'],
	},
	{
		id: 'paladin',
		name: 'Paladin',
		description: 'Holy warriors who fight for justice and righteousness.',
		image: paladinImage,
		primaryStats: ['STR', 'CHA'],
		secondaryStats: ['CON', 'WIS'],
	},
	{
		id: 'warlock',
		name: 'Warlock',
		description: 'Wielders of dark magic gained through supernatural pacts.',
		image: warlockImage,
		primaryStats: ['CHA'],
		secondaryStats: ['CON', 'DEX'],
	},
	{
		id: 'barbarian',
		name: 'Barbarian',
		description: 'Primal warriors who fight with rage and instinct.',
		image: barbarianImage,
		primaryStats: ['STR'],
		secondaryStats: ['CON'],
	},
	{
		id: 'bard',
		name: 'Bard',
		description: 'Charismatic performers who weave magic through music.',
		image: bardImage,
		primaryStats: ['CHA'],
		secondaryStats: ['DEX', 'CON'],
	},
	{
		id: 'sorcerer',
		name: 'Sorcerer',
		description: 'Innate spellcasters who channel raw magical power.',
		image: sorcererImage,
		primaryStats: ['CHA'],
		secondaryStats: ['CON', 'DEX'],
	},
	{
		id: 'druid',
		name: 'Druid',
		description: 'Nature guardians who can shapeshift and command beasts.',
		image: druidImage,
		primaryStats: ['WIS'],
		secondaryStats: ['CON', 'DEX'],
	},
	{
		id: 'monk',
		name: 'Monk',
		description: 'Disciplined warriors who harness inner power and martial arts.',
		image: monkImage,
		primaryStats: ['DEX', 'WIS'],
		secondaryStats: ['CON'],
	},
	{
		id: 'artificer',
		name: 'Artificer',
		description: 'Magical inventors who create wondrous items and constructs.',
		image: artificerImage,
		primaryStats: ['INT'],
		secondaryStats: ['CON', 'DEX'],
	},
	{
		id: 'custom',
		name: 'Custom',
		description: 'Create your own class and define your role.',
		image: customImage,
		isCustom: true,
		primaryStats: [],
		secondaryStats: [],
	},
];

export const WEB_TRAITS: TraitOption[] = [
	{
		id: 'stormtouched',
		name: 'Stormtouched',
		description: 'Born during a tempest, you have an innate connection to lightning and thunder.',
		image: stormtouchedImage,
		action: {
			name: 'Lightning Burst',
			description: 'Channel the storm within you to unleash electrical fury.',
			effect: 'Explode when surrounded by enemies, doing 3d6 lightning damage to all characters within a 3 block radius, including yourself.',
		},
	},
	{
		id: 'marked-by-death',
		name: 'Marked by Death',
		description: 'You survived a brush with death, gaining insight into the afterlife.',
		image: markedByDeathImage,
		action: {
			name: "Death's Embrace",
			description: 'Channel the power of death to weaken your enemies.',
			effect: 'Once per long rest, force a creature within 30 feet to make a Constitution save or take 2d6 necrotic damage and disadvantage on their next attack.',
		},
	},
	{
		id: 'starcursed',
		name: 'Starcursed',
		description: 'A celestial event at your birth left you with mysterious cosmic powers.',
		image: starcursedImage,
		action: {
			name: 'Cosmic Alignment',
			description: 'Align yourself with the stars to gain temporary insight.',
			effect: 'Once per short rest, gain advantage on your next Intelligence or Wisdom check or force an enemy to reroll their attack against you.',
		},
	},
	{
		id: 'draconic-heritage',
		name: 'Draconic Heritage',
		description: 'Dragon blood flows through your veins, granting draconic resilience.',
		image: draconicHeritageImage,
		action: {
			name: "Dragon's Breath",
			description: 'Unleash the fire within your draconic bloodline.',
			effect: 'Once per long rest, exhale a 15-foot cone of fire, dealing 2d6 fire damage (Dex save for half).',
		},
	},
	{
		id: 'infernal-taint',
		name: 'Infernal Taint',
		description: 'Your soul bears the mark of the Nine Hells, granting infernal powers.',
		image: infernalTaintImage,
		action: {
			name: 'Hellfire Strike',
			description: 'Channel the fires of the Nine Hells through your weapon.',
			effect: 'Once per short rest, add 1d6 fire damage and frighten a target that fails a Wisdom save.',
		},
	},
	{
		id: 'celestial-blood',
		name: 'Celestial Blood',
		description: 'Divine ancestry flows through you, connecting you to the Upper Planes.',
		image: celestialBloodImage,
		action: {
			name: 'Divine Radiance',
			description: 'Channel the light of the heavens to heal and protect.',
			effect: 'Once per long rest, emit bright light for 1 minute and grant 1d6 temporary hit points to allies in range.',
		},
	},
	{
		id: 'elemental-ice',
		name: 'Elemental Ice',
		description: 'You have a natural affinity for cold and ice magic.',
		image: elementalIceImage,
		action: {
			name: 'Frost Nova',
			description: 'Unleash a burst of freezing cold energy.',
			effect: 'Once per short rest, deal 2d6 cold damage in a 10-foot radius and slow enemies on a failed save.',
		},
	},
	{
		id: 'elemental-fire',
		name: 'Elemental Fire',
		description: 'Flames dance at your command, born from inner fire.',
		image: elementalFireImage,
		action: {
			name: 'Flame Surge',
			description: 'Channel your inner fire to enhance your attacks.',
			effect: 'Once per short rest, add 1d6 fire damage to weapon attacks for 1 minute.',
		},
	},
	{
		id: 'shadowbound',
		name: 'Shadowbound',
		description: 'Shadows cling to you, granting stealth and dark vision.',
		image: shadowboundImage,
		action: {
			name: 'Shadow Step',
			description: 'Melt into the shadows to move unseen.',
			effect: 'Once per short rest, teleport up to 30 feet to dim light or darkness and gain advantage on your next attack.',
		},
	},
	{
		id: 'feytouched',
		name: 'Feytouched',
		description: 'Fey magic has left its mark, making you unpredictable and charming.',
		image: feytouchedImage,
		action: {
			name: 'Fey Charm',
			description: 'Use your fey magic to beguile and confuse enemies.',
			effect: 'Once per short rest, charm a creature within 30 feet that fails a Wisdom save for 1 minute.',
		},
	},
	{
		id: 'arcane-tattooed',
		name: 'Arcane Tattooed',
		description: 'Mystical tattoos cover your body, channeling raw magical energy.',
		image: arcaneTattooedImage,
		action: {
			name: 'Tattoo Surge',
			description: 'Activate your arcane tattoos to enhance your magic.',
			effect: 'Once per long rest, gain advantage on spell attacks for 1 minute and cast one spell without spending a slot.',
		},
	},
	{
		id: 'spellscared',
		name: 'Spellscared',
		description: 'A magical accident left you with permanent arcane scars and power.',
		image: spellscaredImage,
		action: {
			name: 'Scar Resonance',
			description: 'Channel residual magic from your scars.',
			effect: 'Once per short rest, absorb spell damage to gain resistance and add 1d6 damage to your next spell.',
		},
	},
	{
		id: 'runeblooded',
		name: 'Runeblooded',
		description: 'Ancient runes pulse through your veins, granting mystical knowledge.',
		image: runebloodedImage,
		action: {
			name: 'Rune Awakening',
			description: 'Awaken the ancient runes within your blood.',
			effect: 'Once per long rest, gain advantage on Arcana and History checks for 1 minute.',
		},
	},
	{
		id: 'artifact-embedded',
		name: 'Artifact Embedded',
		description: 'A powerful artifact has fused with your body, granting unique abilities.',
		image: artifactEmbeddedImage,
		action: {
			name: 'Artifact Surge',
			description: 'Channel the power of the embedded artifact.',
			effect: 'Once per long rest, gain +2 to ability checks and saves and an extra weapon attack each turn for 1 minute.',
		},
	},
	{
		id: 'custom',
		name: 'Custom',
		description: 'Create your own trait and define your unique characteristic.',
		image: customImage,
		isCustom: true,
	},
];

export const WEB_SKILLS: Skill[] = [
	{ id: 'athletics', name: 'Athletics', ability: 'STR', image: athleticsImage },
	{ id: 'acrobatics', name: 'Acrobatics', ability: 'DEX', image: acrobaticsImage },
	{ id: 'stealth', name: 'Stealth', ability: 'DEX', image: stealthImage },
	{ id: 'thievery', name: 'Thievery', ability: 'DEX', image: thieveryImage },
	{ id: 'endurance', name: 'Endurance', ability: 'CON', image: enduranceImage },
	{ id: 'arcana', name: 'Arcana', ability: 'INT', image: arcanaImage },
	{ id: 'history', name: 'History', ability: 'INT', image: historyImage },
	{ id: 'religion', name: 'Religion', ability: 'INT', image: religionImage },
	{ id: 'dungeoneering', name: 'Dungeoneering', ability: 'WIS', image: dungeoneeringImage },
	{ id: 'heal', name: 'Heal', ability: 'WIS', image: healImage },
	{ id: 'insight', name: 'Insight', ability: 'WIS', image: insightImage },
	{ id: 'nature', name: 'Nature', ability: 'WIS', image: natureImage },
	{ id: 'perception', name: 'Perception', ability: 'WIS', image: perceptionImage },
	{ id: 'bluff', name: 'Bluff', ability: 'CHA', image: bluffImage },
	{ id: 'diplomacy', name: 'Diplomacy', ability: 'CHA', image: diplomacyImage },
	{ id: 'intimidate', name: 'Intimidate', ability: 'CHA', image: intimidateImage },
	{ id: 'streetwise', name: 'Streetwise', ability: 'CHA', image: streetwiseImage },
];
