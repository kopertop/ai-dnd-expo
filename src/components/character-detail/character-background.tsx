import * as React from 'react';

import type { Character } from '@/types/character';

type CharacterBackgroundProps = {
	character: Character;
};

export const CharacterBackground: React.FC<CharacterBackgroundProps> = ({ character }) => {
	const parseBackground = (description: string) => {
		const lines = description.split('\n').filter(line => line.trim());
		const sections: Array<{ type: 'header' | 'text'; content: string }> = [];

		lines.forEach(line => {
			if (line.trim().startsWith('#')) {
				sections.push({ type: 'header', content: line.trim() });
			} else {
				sections.push({ type: 'text', content: line.trim() });
			}
		});

		return sections;
	};

	const backgroundSections = character.description ? parseBackground(character.description) : [];

	return (
		<div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
			<h2 className="mb-4 text-sm font-bold text-slate-900">Background / Goals / Notes</h2>
			{backgroundSections.length > 0 ? (
				<div className="space-y-2 text-sm text-slate-700">
					{backgroundSections.map((section, idx) => (
						<div key={idx}>
							{section.type === 'header' ? (
								<div className="font-semibold">{section.content}</div>
							) : (
								<div className="ml-4">{section.content}</div>
							)}
						</div>
					))}
				</div>
			) : (
				<p className="text-sm text-slate-500">No background provided.</p>
			)}
		</div>
	);
};
