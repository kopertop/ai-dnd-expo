import * as React from 'react';

import { predefinedQuests } from '@/constants/quests';
import type { Quest } from '@/types/quest';

interface CampaignSelectorProps {
	onSelect: (quest: Quest) => void;
	selectedCampaign?: Quest | null;
}

export const CampaignSelector: React.FC<CampaignSelectorProps> = ({
	onSelect,
	selectedCampaign,
}) => {
	return (
		<div className="space-y-4">
			<h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 text-center">
				Select a Campaign
			</h2>
			<div className="space-y-4">
				{predefinedQuests.map((quest) => {
					const isSelected = selectedCampaign?.id === quest.id;
					return (
						<button
							key={quest.id}
							type="button"
							onClick={() => onSelect(quest)}
							className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
								isSelected
									? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200 dark:bg-amber-900/20 dark:border-amber-400'
									: 'border-slate-200 bg-white hover:border-amber-300 dark:border-slate-700 dark:bg-slate-800'
							}`}
						>
							<div className="mb-2">
								<h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
									{quest.name}
								</h3>
								<div className="mt-1 flex gap-4 text-sm text-slate-600 dark:text-slate-400">
									{quest.maxPlayers && (
										<span>Up to {quest.maxPlayers} players</span>
									)}
									{quest.estimatedDuration && (
										<span>~{quest.estimatedDuration} min</span>
									)}
								</div>
							</div>
							<p className="mb-3 text-sm text-slate-700 dark:text-slate-300">
								{quest.description}
							</p>
							<div className="border-t border-slate-200 pt-3 dark:border-slate-700">
								<p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
									Objectives:
								</p>
								<ul className="space-y-1">
									{quest.objectives.map((obj, index) => (
										<li key={obj.id} className="text-sm text-slate-600 dark:text-slate-400">
											{index + 1}. {obj.description}
										</li>
									))}
								</ul>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};
