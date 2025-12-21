import * as React from 'react';

import { CharacterPortrait } from '~/components/character-portrait';

import type { Character } from '@/types/character';
import type { PlayerInfo } from '@/types/multiplayer-game';

interface PlayerListProps {
	players: PlayerInfo[];
	characters?: Character[];
}

const FALLBACK_COLORS = ['#C9B037', '#8B6914', '#4A6741', '#7A4EAB', '#2E6F91', '#A63D40'];

const hashStringToColor = (input: string) => {
	let hash = 0;
	for (let i = 0; i < input.length; i++) {
		hash = input.charCodeAt(i) + ((hash << 5) - hash);
	}
	const index = Math.abs(hash) % FALLBACK_COLORS.length;
	return FALLBACK_COLORS[index];
};

export const PlayerList: React.FC<PlayerListProps> = ({ players, characters = [] }) => {
	const characterMap = React.useMemo(() => {
		return new Map(characters.map(c => [c.id, c]));
	}, [characters]);

	if (players.length === 0) {
		return (
			<div className="rounded-lg border border-slate-200 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800">
				<p className="text-slate-600 dark:text-slate-400">
					Waiting for players to join...
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
			<h3 className="mb-4 border-b border-slate-200 px-4 py-3 text-lg font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-100">
				Players ({players.length})
			</h3>
			<div className="divide-y divide-slate-200 dark:divide-slate-700">
				{players.map((player) => {
					const character = characterMap.get(player.characterId);
					const displayName = character?.name || player.name || 'Unknown';
					const race = character?.race || player.race || '';
					const className = character?.class || player.class || '';
					const level = character?.level || player.level || 1;
					const trait = character?.trait;

					return (
						<div key={player.playerId} className="flex items-center gap-4 px-4 py-3">
							<CharacterPortrait
								character={character || undefined}
								name={displayName}
								size="sm"
							/>
							<div className="flex-1">
								<p className="font-semibold text-slate-900 dark:text-slate-100">
									{displayName}
								</p>
								<p className="text-sm text-slate-600 dark:text-slate-400">
									Level {level} {race} {className}
									{trait && (
										<span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
											• {trait}
										</span>
									)}
								</p>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
