import { SKILL_LIST } from '@/constants/skills';
import { ClassOption } from '@/types/class-option';
import { RaceOption } from '@/types/race-option';

/**
 * Generate an icon generation prompt for AI image generators (ChatGPT, etc.)
 * based on character race, class, and skills.
 */
export function generateIconPrompt(
	race: RaceOption,
	classOption: ClassOption,
	skills: string[]
): string {
	const skillNames = skills
		.map(skillId => {
			const skill = SKILL_LIST.find(s => s.id === skillId);
			return skill?.name;
		})
		.filter(Boolean)
		.join(', ');

	const primaryStat = classOption.primaryStats[0] || 'STR';
	const statName =
		primaryStat === 'STR'
			? 'strong'
			: primaryStat === 'DEX'
				? 'agile'
				: primaryStat === 'INT'
					? 'intelligent'
					: primaryStat === 'WIS'
						? 'wise'
						: primaryStat === 'CHA'
							? 'charismatic'
							: 'balanced';

	return `Create a D&D miniature of a ${race.name.toLowerCase()} ${classOption.name.toLowerCase()} standing on a circular base.

Character Details:
- Race: ${race.name}
- Class: ${classOption.name}
${classOption.description ? `- Class Description: ${classOption.description}` : ''}
${skillNames ? `- Skills: ${skillNames}` : ''}
- Primary Attribute: ${statName}
${race.description ? `- Race Traits: ${race.description}` : ''}

Visual Style:
- Miniature figure style, suitable for tabletop gaming
- Clear, distinct features that represent the ${race.name} race
- Equipment and appearance appropriate for a ${classOption.name}
- Professional game miniature quality
- Transparent or white background
- Square format (1:1 aspect ratio)
- High detail, suitable for use as a character portrait icon
- True PNG transparent background (alpha channel)

The figure should be centered on the base, facing forward or slightly to the side, with clear visibility of race characteristics and class-appropriate gear or appearance.`;
}
