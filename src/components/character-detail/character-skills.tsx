import * as React from 'react';

import { SKILL_DESCRIPTIONS } from '@/constants/skill-descriptions';
import type { Character } from '@/types/character';
import type { StatKey } from '@/types/stats';
import { calculateProficiencyBonus, getAbilityModifier, isSkillProficient } from '@/utils/combat-utils';
import { WEB_SKILLS } from '~/data/character-options';

import { Tooltip } from '~/components/tooltip';

type CharacterSkillsProps = {
	character: Character;
};

export const CharacterSkills: React.FC<CharacterSkillsProps> = ({ character }) => {
	const abilityMods = React.useMemo(() => {
		const STAT_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;
		return STAT_KEYS.reduce((acc, key) => {
			const score = character.stats?.[key] ?? 10;
			acc[key] = getAbilityModifier(score);
			return acc;
		}, {} as Record<typeof STAT_KEYS[number], number>);
	}, [character.stats]);

	const proficiency = calculateProficiencyBonus(character.level);

	const skillEntries = React.useMemo(() => {
		return WEB_SKILLS.map(skill => {
			const isProficient = isSkillProficient(character, skill.id);
			const baseMod = abilityMods[skill.ability as StatKey] ?? 0;
			const total = baseMod + (isProficient ? proficiency : 0);
			return {
				...skill,
				isProficient,
				modifier: total,
			};
		});
	}, [character.skills, abilityMods, proficiency]);

	const getSkillImageSrc = (skill: typeof WEB_SKILLS[0]) => {
		if (typeof skill.image === 'string') {
			return skill.image;
		}
		if (typeof (skill.image as { uri?: string } | undefined)?.uri === 'string') {
			return (skill.image as { uri: string }).uri;
		}
		return null;
	};

	return (
		<div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
			<h2 className="mb-4 text-sm font-bold text-slate-900">Skills & Proficiencies</h2>
			<div className="grid grid-cols-4 gap-2">
				{skillEntries.map((skill) => {
					const imageSrc = getSkillImageSrc(skill);
					return (
						<div
							key={skill.id}
							className="relative rounded-lg border border-slate-200 bg-slate-50 p-2 text-center"
						>
							<div className="absolute right-1 top-1">
								<Tooltip
									content={SKILL_DESCRIPTIONS[skill.id] || `${skill.name} information`}
									position="bottom"
								>
									<button
										type="button"
										className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 text-[8px] font-semibold text-slate-700 hover:bg-slate-400"
									>
										?
									</button>
								</Tooltip>
							</div>
							{imageSrc && (
								<div className="mb-1 flex justify-center">
									<img src={imageSrc} alt={skill.name} className="h-8 w-8 object-contain" />
								</div>
							)}
							<div className="text-[10px] font-semibold text-slate-700">{skill.name}</div>
							<div className="mt-0.5 text-xs font-semibold" style={{ color: 'rgb(201, 176, 55)' }}>
								{skill.modifier >= 0 ? '+' : ''}{skill.modifier}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
