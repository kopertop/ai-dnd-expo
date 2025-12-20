import * as React from 'react';

import type { Character } from '@/types/character';

type CharacterAttacksProps = {
	character: Character;
};

export const CharacterAttacks: React.FC<CharacterAttacksProps> = ({ character }) => {
	return (
		<div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
			<h2 className="mb-4 text-sm font-bold text-slate-900">Attacks & Spells</h2>
			<p className="text-sm text-slate-500">
				{character.preparedSpells && character.preparedSpells.length > 0
					? `${character.preparedSpells.length} prepared spell(s)`
					: 'No prepared spells yet.'}
			</p>
		</div>
	);
};
