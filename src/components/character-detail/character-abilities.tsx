import * as React from 'react';

import type { Character } from '@/types/character';
import type { StatKey } from '@/types/stats';
import { STAT_KEYS } from '@/types/stats';
import { getAbilityModifier } from '@/utils/combat-utils';

type CharacterAbilitiesProps = {
	character: Character;
};

export const CharacterAbilities: React.FC<CharacterAbilitiesProps> = ({ character }) => {
	const abilityMods = React.useMemo(() => {
		return STAT_KEYS.reduce((acc, key) => {
			const score = character.stats?.[key] ?? 10;
			acc[key] = getAbilityModifier(score);
			return acc;
		}, {} as Record<StatKey, number>);
	}, [character.stats]);

	return (
		<div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
			<h2 className="mb-4 text-sm font-bold text-slate-900">Abilities</h2>
			<div className="grid grid-cols-3 gap-3">
				{STAT_KEYS.map((key) => {
					const score = character.stats?.[key] ?? 10;
					const mod = abilityMods[key];
					return (
						<div
							key={key}
							className="relative rounded-lg border border-slate-200 bg-slate-50 p-3 text-center"
						>
							<button
								type="button"
								className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-[10px] font-semibold text-slate-700 hover:bg-slate-400"
								title={`${key} information`}
							>
								?
							</button>
							<div className="text-xs font-semibold text-slate-600">{key}</div>
							<div className="mt-1 text-2xl font-bold text-slate-900">{score}</div>
							<div className="mt-1 text-sm font-semibold" style={{ color: 'rgb(201, 176, 55)' }}>
								{mod >= 0 ? '+' : ''}{mod}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
