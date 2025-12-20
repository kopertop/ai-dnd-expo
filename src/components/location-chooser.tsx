import * as React from 'react';

import type { LocationOption } from '@/types/location-option';

const LOCATIONS: Omit<LocationOption, 'image'>[] = [
	{ id: 'tavern', name: 'Tavern', description: 'A bustling inn or tavern, the classic meeting place for adventurers.' },
	{ id: 'cave', name: 'Cave', description: 'A dark, mysterious cave, perfect for exploration or hiding.' },
	{ id: 'camp', name: 'Camp', description: 'A wilderness or military encampment, temporary or permanent.' },
	{ id: 'palace', name: 'Palace', description: 'A royal palace or castle, full of intrigue and grandeur.' },
	{ id: 'bedroom', name: 'Bedroom', description: 'A private chamber, perfect for secrets or waking up to adventure.' },
	{ id: 'ship', name: 'Ship', description: 'A sea or air vessel, ready for travel and adventure.' },
	{ id: 'marketplace', name: 'Marketplace', description: 'A bustling bazaar, full of merchants, thieves, and secrets.' },
	{ id: 'temple', name: 'Temple', description: 'A sacred or profane place of worship, mystery, or quest.' },
	{ id: 'dungeon', name: 'Dungeon', description: 'A classic crawl, full of danger and treasure.' },
	{ id: 'forest', name: 'Forest', description: 'A mystical or wild grove, home to ancient secrets.' },
	{ id: 'tower', name: 'Tower', description: 'A wizard\'s study or arcane tower, full of magical mysteries.' },
	{ id: 'arena', name: 'Arena', description: 'A colosseum for combat, spectacle, or intrigue.' },
	{ id: 'library', name: 'Library', description: 'A place of knowledge, research, or forbidden tomes.' },
	{ id: 'smithy', name: 'Smithy', description: 'A smith\'s forge, for crafting and invention.' },
	{ id: 'trail', name: 'Trail', description: 'A trail between two cities, perfect for adventure or exploration.' },
	{ id: 'farm', name: 'Farm', description: 'A rural homestead or village, simple but full of secrets.' },
	{ id: 'graveyard', name: 'Graveyard', description: 'A crypt or cemetery, haunted or somber.' },
	{ id: 'portal', name: 'Portal', description: 'A magical gate or teleportation circle, for planar journeys.' },
	{ id: 'custom', name: 'Custom', description: 'Create your own location! Name and describe your unique starting point.', isCustom: true },
];

interface LocationChooserProps {
	onSelect: (location: LocationOption) => void;
	selectedLocation?: LocationOption | null;
}

export const LocationChooser: React.FC<LocationChooserProps> = ({
	onSelect,
	selectedLocation,
}) => {
	const [customName, setCustomName] = React.useState('');
	const [customDesc, setCustomDesc] = React.useState('');
	const [showCustomForm, setShowCustomForm] = React.useState(false);

	const handleSelect = (location: Omit<LocationOption, 'image'>) => {
		if (location.isCustom) {
			setShowCustomForm(true);
		} else {
			onSelect({
				...location,
				image: `/assets/images/locations/${location.id}.png`,
			});
		}
	};

	const handleCustomSubmit = () => {
		if (customName.trim() && customDesc.trim()) {
			onSelect({
				id: 'custom',
				name: customName,
				description: customDesc,
				image: '/assets/images/locations/custom.png',
				isCustom: true,
			});
		}
	};

	return (
		<div className="space-y-6">
			<h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 text-center">
				Choose Your Starting Location
			</h2>
			{showCustomForm ? (
				<div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
					<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
						Location Name
					</label>
					<input
						type="text"
						className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
						placeholder="Enter location name"
						value={customName}
						onChange={(e) => setCustomName(e.target.value)}
					/>
					<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 mt-4">
						Description
					</label>
					<textarea
						className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
						placeholder="Describe your location"
						value={customDesc}
						onChange={(e) => setCustomDesc(e.target.value)}
						rows={3}
					/>
					<button
						type="button"
						onClick={handleCustomSubmit}
						className="mt-4 rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500"
					>
						Create Location
					</button>
				</div>
			) : (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
					{LOCATIONS.map((location) => {
						const isSelected = selectedLocation?.id === location.id;
						return (
							<button
								key={location.id}
								type="button"
								onClick={() => handleSelect(location)}
								className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
									isSelected
										? 'border-amber-500 ring-2 ring-amber-200'
										: 'border-slate-200 hover:border-amber-300 dark:border-slate-700'
								}`}
							>
								<img
									src={`/assets/images/locations/${location.id}.png`}
									alt={location.name}
									className="h-full w-full object-cover"
								/>
								<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
									<h3 className="text-sm font-bold text-white">{location.name}</h3>
									<p className="mt-1 text-xs text-white/90 line-clamp-2">{location.description}</p>
								</div>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
};
