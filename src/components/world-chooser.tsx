import * as React from 'react';

import type { WorldOption } from '@/types/world-option';

const WORLDS: Omit<WorldOption, 'image'>[] = [
	{
		id: 'faerun',
		name: 'Faerûn',
		description: 'The classic Forgotten Realms setting, a land of magic, monsters, and adventure.',
	},
	{
		id: 'eberron',
		name: 'Eberron',
		description: 'A world of magic-fueled technology, airships, and intrigue, where anything is possible.',
	},
	{
		id: 'underdark',
		name: 'Underdark',
		description: 'A vast, dark, and dangerous subterranean realm filled with drow, mind flayers, and ancient secrets.',
	},
	{
		id: 'custom',
		name: 'Custom',
		description: 'Create your own world! Name and describe your unique setting.',
		isCustom: true,
	},
];

interface WorldChooserProps {
	onSelect: (world: WorldOption) => void;
	selectedWorld?: WorldOption | null;
}

export const WorldChooser: React.FC<WorldChooserProps> = ({ onSelect, selectedWorld }) => {
	const [customName, setCustomName] = React.useState('');
	const [customDesc, setCustomDesc] = React.useState('');
	const [showCustomForm, setShowCustomForm] = React.useState(false);

	const handleSelect = (world: Omit<WorldOption, 'image'>) => {
		if (world.isCustom) {
			setShowCustomForm(true);
		} else {
			onSelect({
				...world,
				image: `/assets/images/worlds/${world.id}.png`,
			});
		}
	};

	const handleCustomSubmit = () => {
		if (customName.trim() && customDesc.trim()) {
			onSelect({
				id: 'custom',
				name: customName,
				description: customDesc,
				image: '/assets/images/worlds/custom.png',
				isCustom: true,
			});
		}
	};

	return (
		<div className="space-y-6">
			<h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 text-center">
				Choose Your World
			</h2>
			{showCustomForm ? (
				<div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
					<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
						World Name
					</label>
					<input
						type="text"
						className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
						placeholder="Enter world name"
						value={customName}
						onChange={(e) => setCustomName(e.target.value)}
					/>
					<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 mt-4">
						Description
					</label>
					<textarea
						className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
						placeholder="Describe your world"
						value={customDesc}
						onChange={(e) => setCustomDesc(e.target.value)}
						rows={3}
					/>
					<button
						type="button"
						onClick={handleCustomSubmit}
						className="mt-4 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500"
					>
						Create World
					</button>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{WORLDS.map((world) => {
						const isSelected = selectedWorld?.id === world.id;
						return (
							<button
								key={world.id}
								type="button"
								onClick={() => handleSelect(world)}
								className={`relative h-64 overflow-hidden rounded-lg border-2 transition-all ${
									isSelected
										? 'border-amber-500 ring-2 ring-amber-200'
										: 'border-slate-200 hover:border-amber-300 dark:border-slate-700'
								}`}
							>
								<img
									src={`/assets/images/worlds/${world.id}.png`}
									alt={world.name}
									className="h-full w-full object-cover"
								/>
								<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
									<h3 className="text-xl font-bold text-white">{world.name}</h3>
									<p className="mt-1 text-sm text-white/90">{world.description}</p>
								</div>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};
