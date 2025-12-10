// Character name generation based on race and class

export interface NameLists {
	firstNames: string[];
	lastNames: string[];
}

// Generic fantasy names (fallback)
const GENERIC_FIRST_NAMES = [
	'Aldric', 'Brenna', 'Cedric', 'Dara', 'Ewan', 'Fiona', 'Gareth', 'Helena',
	'Ivor', 'Jenna', 'Kael', 'Lara', 'Marcus', 'Nora', 'Owen', 'Petra',
	'Quinn', 'Rhea', 'Soren', 'Tara', 'Ulric', 'Vera', 'Wren', 'Yara', 'Zane',
];

const GENERIC_LAST_NAMES = [
	'Blackwood', 'Brightblade', 'Darkwater', 'Fireforge', 'Goldleaf', 'Ironheart',
	'Moonwhisper', 'Shadowbane', 'Stormcaller', 'Thornweaver', 'Windrider', 'Starfall',
	'Stonebreaker', 'Silverhand', 'Nightshade', 'Dawnbreaker', 'Frostweaver', 'Sunstrider',
];

// Human names
const HUMAN_FIRST_NAMES = [
	'Alexander', 'Amelia', 'Benjamin', 'Charlotte', 'Daniel', 'Eleanor', 'Frederick', 'Grace',
	'Henry', 'Isabella', 'James', 'Katherine', 'Liam', 'Madeline', 'Nathaniel', 'Olivia',
	'Patrick', 'Rachel', 'Samuel', 'Sophia', 'Thomas', 'Victoria', 'William', 'Zoe',
];

const HUMAN_LAST_NAMES = [
	'Anderson', 'Baker', 'Carter', 'Davis', 'Evans', 'Foster', 'Gray', 'Harris',
	'Johnson', 'King', 'Lewis', 'Miller', 'Nelson', 'Parker', 'Roberts', 'Smith',
	'Thompson', 'Walker', 'White', 'Young',
];

// Elf names
const ELF_FIRST_NAMES = [
	'Aeliana', 'Baelen', 'Caelia', 'Daelin', 'Elandra', 'Faelan', 'Gaelen', 'Haelia',
	'Ilyana', 'Jaelen', 'Kaelia', 'Laelin', 'Maelis', 'Naelia', 'Oraelis', 'Paelin',
	'Qaelia', 'Raelin', 'Saelia', 'Taelin', 'Uraelis', 'Vaelia', 'Waelin', 'Xaelia', 'Yraelis', 'Zaelin',
];

const ELF_LAST_NAMES = [
	'Moonwhisper', 'Starweaver', 'Dawnblade', 'Nightbreeze', 'Silverleaf', 'Goldensong',
	'Shadowdancer', 'Lightbringer', 'Windrider', 'Stormcaller', 'Frostweaver', 'Fireheart',
	'Thornbloom', 'Rosepetal', 'Ivyvine', 'Oakheart', 'Birchbark', 'Willowwind',
];

// Dwarf names
const DWARF_FIRST_NAMES = [
	'Balin', 'Dwalin', 'Fili', 'Kili', 'Bofur', 'Bombur', 'Dori', 'Nori', 'Ori',
	'Oin', 'Gloin', 'Thorin', 'Bifur', 'Gimli', 'Durin', 'Thrain', 'Thror',
	'Balin', 'Dain', 'Bard', 'Brand', 'Borin', 'Dorin', 'Gorin', 'Thorin',
];

const DWARF_LAST_NAMES = [
	'Ironforge', 'Stonebeard', 'Goldhammer', 'Firebeard', 'Steelaxe', 'Bronzebreaker',
	'Copperhelm', 'Silverbeard', 'Ironhand', 'Stonefist', 'Goldheart', 'Fireforge',
	'Steelheart', 'Bronzeblade', 'Copperbeard', 'Silverforge', 'Ironbeard', 'Stonehammer',
];

// Dragonborn names
const DRAGONBORN_FIRST_NAMES = [
	'Arjhan', 'Balasar', 'Bharash', 'Donaar', 'Ghesh', 'Heskan', 'Kriv', 'Medrash',
	'Mehen', 'Nadarr', 'Pandjed', 'Patrin', 'Rhogar', 'Shamash', 'Shedinn', 'Tarhun',
	'Torinn', 'Akra', 'Biri', 'Daar', 'Farideh', 'Harann', 'Havilar', 'Jheri',
	'Kava', 'Korinn', 'Mishann', 'Nala', 'Perra', 'Raiann', 'Sora', 'Surina',
	'Thava', 'Uadjit',
];

const DRAGONBORN_LAST_NAMES = [
	'Clethtinthiallor', 'Daardendrian', 'Delmirev', 'Drachedandion', 'Fenkenkabradon',
	'Kepeshkmolik', 'Kerrhylon', 'Kimbatuul', 'Linxakasendalor', 'Myastan',
	'Nemmonis', 'Norixius', 'Ophinshtalajiir', 'Prexijandilin', 'Shestendeliath',
	'Turnuroth', 'Verthisathurgiesh', 'Yarjerit',
];

// Halfling names
const HALFLING_FIRST_NAMES = [
	'Alton', 'Ander', 'Cade', 'Corrin', 'Eldon', 'Errich', 'Finnan', 'Garret',
	'Lindal', 'Lyle', 'Merric', 'Milo', 'Osborn', 'Perrin', 'Reed', 'Roscoe',
	'Wellby', 'Alain', 'Andry', 'Bree', 'Callie', 'Cora', 'Euphemia', 'Jillian',
	'Kithri', 'Lavinia', 'Lidda', 'Merla', 'Nedda', 'Paela', 'Portia', 'Seraphina',
	'Shaena', 'Trym', 'Vani', 'Verna',
];

const HALFLING_LAST_NAMES = [
	'Brushgather', 'Goodbarrel', 'Greenbottle', 'High-hill', 'Hilltopple', 'Leagallow',
	'Tealeaf', 'Thorngage', 'Tosscobble', 'Underbough', 'Appleblossom', 'Berrybush',
	'Brightfield', 'Goldpetal', 'Honeywell', 'Meadowbrook', 'Rosewood', 'Sweetwater',
];

// Tiefling names
const TIEFLING_FIRST_NAMES = [
	'Akmenos', 'Amnon', 'Barakas', 'Damakos', 'Ekemon', 'Iados', 'Kairon', 'Leucis',
	'Melech', 'Mordai', 'Morthos', 'Pelaios', 'Skamos', 'Therai', 'Akmenos', 'Bryseis',
	'Criella', 'Damaia', 'Ea', 'Kallista', 'Lerissa', 'Makaria', 'Nemeia', 'Orianna',
	'Phelaia', 'Rieta', 'Therai',
];

const TIEFLING_LAST_NAMES = [
	'Art', 'Carrion', 'Chant', 'Creed', 'Despair', 'Excellence', 'Fear', 'Glory',
	'Hope', 'Ideal', 'Music', 'Nowhere', 'Open', 'Poetry', 'Quest', 'Random',
	'Reverence', 'Sorrow', 'Temerity', 'Torment', 'Weary',
];

// Class-specific name modifiers (can be used as middle names or titles)
const CLASS_MODIFIERS: Record<string, string[]> = {
	fighter: ['the Brave', 'the Strong', 'the Valiant', 'the Mighty', 'Iron', 'Steel'],
	wizard: ['the Wise', 'the Learned', 'the Arcane', 'the Scholar', 'Bright', 'Sage'],
	rogue: ['the Shadow', 'the Swift', 'the Silent', 'the Quick', 'Dark', 'Swift'],
	cleric: ['the Devout', 'the Blessed', 'the Holy', 'the Pious', 'Light', 'Divine'],
	ranger: ['the Hunter', 'the Tracker', 'the Wild', 'the Fierce', 'Wild', 'Forest'],
	paladin: ['the Just', 'the Noble', 'the Righteous', 'the Pure', 'Noble', 'Bright'],
	barbarian: ['the Fierce', 'the Savage', 'the Wild', 'the Untamed', 'Wild', 'Fierce'],
	bard: ['the Melodious', 'the Charming', 'the Witty', 'the Entertaining', 'Silver', 'Golden'],
	sorcerer: ['the Mystic', 'the Enchanted', 'the Gifted', 'the Magical', 'Arcane', 'Mystic'],
	warlock: ['the Bound', 'the Cursed', 'the Dark', 'the Forbidden', 'Dark', 'Shadow'],
	monk: ['the Disciplined', 'the Focused', 'the Balanced', 'the Serene', 'Serene', 'Focused'],
	druid: ['the Natural', 'the Wild', 'the Primal', 'the Earthbound', 'Green', 'Earth'],
};

// Race-specific name lists
const RACE_NAME_LISTS: Record<string, NameLists> = {
	human: { firstNames: HUMAN_FIRST_NAMES, lastNames: HUMAN_LAST_NAMES },
	elf: { firstNames: ELF_FIRST_NAMES, lastNames: ELF_LAST_NAMES },
	dwarf: { firstNames: DWARF_FIRST_NAMES, lastNames: DWARF_LAST_NAMES },
	dragonborn: { firstNames: DRAGONBORN_FIRST_NAMES, lastNames: DRAGONBORN_LAST_NAMES },
	halfling: { firstNames: HALFLING_FIRST_NAMES, lastNames: HALFLING_LAST_NAMES },
	tiefling: { firstNames: TIEFLING_FIRST_NAMES, lastNames: TIEFLING_LAST_NAMES },
};

/**
 * Generate a random character name based on race and class
 */
export function generateRandomName(race: string, className: string): string {
	const raceKey = race.toLowerCase();
	const classKey = className.toLowerCase();
	
	// Get race-specific names or fall back to generic
	const nameList = RACE_NAME_LISTS[raceKey] || {
		firstNames: GENERIC_FIRST_NAMES,
		lastNames: GENERIC_LAST_NAMES,
	};
	
	// Pick random first and last name
	const firstName = nameList.firstNames[Math.floor(Math.random() * nameList.firstNames.length)];
	const lastName = nameList.lastNames[Math.floor(Math.random() * nameList.lastNames.length)];
	
	// Optionally add class modifier (30% chance)
	const modifiers = CLASS_MODIFIERS[classKey];
	if (modifiers && Math.random() < 0.3) {
		const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
		return `${firstName} ${modifier} ${lastName}`;
	}
	
	return `${firstName} ${lastName}`;
}
