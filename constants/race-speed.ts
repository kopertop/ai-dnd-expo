export const DEFAULT_RACE_SPEED = 6;
export const SMALL_RACE_SPEED = 5;

export const RACE_BASE_SPEED: Record<string, number> = {
	human: DEFAULT_RACE_SPEED,
	elf: DEFAULT_RACE_SPEED,
	dragonborn: DEFAULT_RACE_SPEED,
	tiefling: DEFAULT_RACE_SPEED,
	'half-elf': DEFAULT_RACE_SPEED,
	'half-orc': DEFAULT_RACE_SPEED,
	eladrin: DEFAULT_RACE_SPEED,
	dwarf: SMALL_RACE_SPEED,
	halfling: SMALL_RACE_SPEED,
	gnome: SMALL_RACE_SPEED,
	custom: DEFAULT_RACE_SPEED,
};

export const getRaceBaseSpeed = (raceId?: string) => {
	if (!raceId) {
		return DEFAULT_RACE_SPEED;
	}

	return RACE_BASE_SPEED[raceId] ?? DEFAULT_RACE_SPEED;
};

