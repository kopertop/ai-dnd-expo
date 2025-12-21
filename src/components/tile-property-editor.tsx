import * as React from 'react';

import { TERRAIN_TYPES, getTerrainDisplayName, isValidTerrainType } from '@/constants/terrain-types';

export interface TileProperties {
	terrainType: string;
	movementCost: number;
	isBlocked: boolean;
	isDifficult: boolean;
	providesCover: boolean;
	coverType: 'half' | 'three-quarters' | 'full' | null;
	elevation: number;
	featureType: string | null;
}

interface TilePropertyEditorProps {
	properties: TileProperties;
	onChange: (properties: TileProperties) => void;
	onClose?: () => void;
	selectedCount?: number;
	compact?: boolean;
}

const TilePropertyEditor: React.FC<TilePropertyEditorProps> = ({
	properties,
	onChange,
	onClose,
	selectedCount = 1,
	compact = false,
}) => {
	// Normalize terrain type - default to 'stone' if empty, 'none', or invalid
	const normalizedTerrainType =
		properties.terrainType &&
		properties.terrainType !== 'none' &&
		isValidTerrainType(properties.terrainType)
			? properties.terrainType
			: 'stone';

	const [localProps, setLocalProps] = React.useState<TileProperties>({
		...properties,
		terrainType: normalizedTerrainType,
	});

	// Update localProps when properties prop changes (e.g., when selecting a different tile)
	React.useEffect(() => {
		const normalizedTerrainType =
			properties.terrainType &&
			properties.terrainType !== 'none' &&
			isValidTerrainType(properties.terrainType)
				? properties.terrainType
				: 'stone';

		setLocalProps({
			...properties,
			terrainType: normalizedTerrainType,
		});
	}, [
		properties.terrainType,
		properties.movementCost,
		properties.isBlocked,
		properties.isDifficult,
		properties.providesCover,
		properties.coverType,
		properties.elevation,
		properties.featureType,
	]);

	const handleChange = <K extends keyof TileProperties>(key: K, value: TileProperties[K]) => {
		const newProps = { ...localProps, [key]: value };

		// Auto-update logic
		if (key === 'isBlocked' && value === true) {
			newProps.movementCost = 999;
			newProps.isDifficult = false;
		}

		if (key === 'isDifficult' && value === true) {
			newProps.isBlocked = false;
			if (newProps.movementCost <= 1) newProps.movementCost = 2;
		} else if (key === 'isDifficult' && value === false && !newProps.isBlocked) {
			if (newProps.movementCost === 2) newProps.movementCost = 1;
		}

		if (key === 'providesCover' && value === false) {
			newProps.coverType = null;
		} else if (key === 'providesCover' && value === true && !newProps.coverType) {
			newProps.coverType = 'half';
		}

		setLocalProps(newProps);
		onChange(newProps);
	};

	const content = (
		<div className={compact ? 'space-y-4' : 'space-y-6'}>
			{selectedCount > 1 ? (
				<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
					{selectedCount} tiles selected. Changes will apply to all.
				</div>
			) : null}

			<div className="space-y-4">
				<div className="border-b border-slate-200 pb-2 dark:border-slate-700">
					<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Movement & Terrain</h3>
				</div>

				<div className="space-y-2">
					<label className="block">
						<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
							Terrain Type
						</div>
						<select
							value={localProps.terrainType || 'stone'}
							onChange={(e) => handleChange('terrainType', e.target.value)}
							className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
						>
							{TERRAIN_TYPES.map((terrain) => (
								<option key={terrain} value={terrain}>
									{getTerrainDisplayName(terrain)}
								</option>
							))}
						</select>
					</label>

					<label className="block">
						<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
							Movement Cost
						</div>
						<input
							type="number"
							value={localProps.movementCost}
							onChange={(e) => {
								const val = parseFloat(e.target.value);
								if (!isNaN(val)) handleChange('movementCost', val);
							}}
							className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
						/>
					</label>

					<div className="flex items-center justify-between">
						<label className="text-sm font-medium text-slate-900 dark:text-slate-100">
							Blocked (Impassible)
						</label>
						<input
							type="checkbox"
							checked={localProps.isBlocked}
							onChange={(e) => handleChange('isBlocked', e.target.checked)}
							className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
						/>
					</div>

					<div className="flex items-center justify-between">
						<label className="text-sm font-medium text-slate-900 dark:text-slate-100">
							Difficult Terrain
						</label>
						<input
							type="checkbox"
							checked={localProps.isDifficult}
							onChange={(e) => handleChange('isDifficult', e.target.checked)}
							className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
						/>
					</div>
				</div>
			</div>

			<div className="space-y-4">
				<div className="border-b border-slate-200 pb-2 dark:border-slate-700">
					<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Cover & Visibility</h3>
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<label className="text-sm font-medium text-slate-900 dark:text-slate-100">
							Provides Cover
						</label>
						<input
							type="checkbox"
							checked={localProps.providesCover}
							onChange={(e) => handleChange('providesCover', e.target.checked)}
							className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
						/>
					</div>

					{localProps.providesCover ? (
						<div className="grid grid-cols-3 gap-2">
							<button
								type="button"
								onClick={() => handleChange('coverType', 'half')}
								className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
									localProps.coverType === 'half'
										? 'border-amber-600 bg-amber-600 text-white'
										: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
								}`}
							>
								Half (+2)
							</button>
							<button
								type="button"
								onClick={() => handleChange('coverType', 'three-quarters')}
								className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
									localProps.coverType === 'three-quarters'
										? 'border-amber-600 bg-amber-600 text-white'
										: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
								}`}
							>
								3/4 (+5)
							</button>
							<button
								type="button"
								onClick={() => handleChange('coverType', 'full')}
								className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
									localProps.coverType === 'full'
										? 'border-amber-600 bg-amber-600 text-white'
										: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
								}`}
							>
								Full
							</button>
						</div>
					) : null}
				</div>
			</div>

			<div className="space-y-4">
				<div className="border-b border-slate-200 pb-2 dark:border-slate-700">
					<h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Details</h3>
				</div>

				<div className="space-y-2">
					<label className="block">
						<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">Elevation</div>
						<input
							type="number"
							value={localProps.elevation}
							onChange={(e) => {
								const val = parseInt(e.target.value, 10);
								if (!isNaN(val)) handleChange('elevation', val);
							}}
							className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
						/>
					</label>

					<label className="block">
						<div className="mb-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
							Feature Type
						</div>
						<input
							type="text"
							value={localProps.featureType || ''}
							onChange={(e) => handleChange('featureType', e.target.value || null)}
							placeholder="None"
							className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-amber-500/30"
						/>
					</label>
				</div>
			</div>
		</div>
	);

	if (compact) {
		return content;
	}

	return (
		<div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Tile Properties</h2>
				{onClose ? (
					<button
						type="button"
						onClick={onClose}
						className="rounded-md px-2 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
					>
						✕
					</button>
				) : null}
			</div>
			{content}
		</div>
	);
};

export default TilePropertyEditor;
