import * as React from 'react';

import type { Character } from '@/types/character';

type CharacterCombatProps = {
	character: Character;
	armorClass: number;
	initiative: number;
	passivePerception: number;
};

export const CharacterCombat: React.FC<CharacterCombatProps> = ({
	character,
	armorClass,
	initiative,
	passivePerception,
}) => {
	return (
		<div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
			<h2 className="mb-4 text-sm font-bold text-slate-900">Combat</h2>
			<div className="grid grid-cols-2 gap-3">
				<div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
					<div className="text-xs font-semibold text-slate-600">Hit Points</div>
					<div className="mt-1 text-lg font-bold text-slate-900">
						{character.health} / {character.maxHealth}
					</div>
				</div>
				<div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
					<div className="text-xs font-semibold text-slate-600">Action Points</div>
					<div className="mt-1 text-lg font-bold text-slate-900">
						{character.actionPoints} / {character.maxActionPoints}
					</div>
				</div>
			</div>
		</div>
	);
};
