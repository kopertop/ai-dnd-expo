import * as React from 'react';

import type { Character } from '@/types/character';

interface CharacterPortraitProps {
	character?: Character | null;
	iconUrl?: string | null;
	trait?: string | null;
	name?: string;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

const SIZE_CLASSES = {
	sm: 'h-12 w-12 text-base',
	md: 'h-16 w-16 text-lg',
	lg: 'h-28 w-28 text-3xl',
};

export const CharacterPortrait: React.FC<CharacterPortraitProps> = ({
	character,
	iconUrl: providedIconUrl,
	trait: providedTrait,
	name: providedName,
	size = 'md',
	className = '',
}) => {
	const [showFallback, setShowFallback] = React.useState(false);
	const [traitImageError, setTraitImageError] = React.useState(false);

	// Resolve character icon
	const iconUrl = React.useMemo(() => {
		if (providedIconUrl) {
			if (typeof providedIconUrl === 'string') {
				if (providedIconUrl.startsWith('http') || providedIconUrl.startsWith('/')) {
					return providedIconUrl;
				}
				return `/assets/images/characters/${providedIconUrl}`;
			}
			if (typeof providedIconUrl === 'object' && 'uri' in providedIconUrl) {
				return providedIconUrl.uri;
			}
		}

		if (character) {
			const characterIcon = character.icon || character.image;
			if (characterIcon) {
				if (typeof characterIcon === 'string') {
					if (characterIcon.startsWith('http') || characterIcon.startsWith('/')) {
						return characterIcon;
					}
					return `/assets/images/characters/${characterIcon}`;
				}
				if (typeof characterIcon === 'object' && 'uri' in characterIcon) {
					return characterIcon.uri;
				}
			}
		}

		return null;
	}, [providedIconUrl, character]);

	// Resolve trait background image
	const traitImageUrl = React.useMemo(() => {
		const traitName = (providedTrait || character?.trait || '')
			.toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '');

		return traitName ? `/assets/images/traits/${traitName}.png` : null;
	}, [providedTrait, character?.trait]);

	// Get display name and initials
	const displayName = providedName || character?.name || '?';
	const initials = React.useMemo(() => {
		return displayName
			.split(' ')
			.map(n => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2) || '?';
	}, [displayName]);

	const sizeClasses = SIZE_CLASSES[size];

	return (
		<div className={`relative ${sizeClasses} ${className}`}>
			{/* Trait Background */}
			{traitImageUrl && !traitImageError && (
				<div className="absolute inset-0 overflow-hidden rounded-lg opacity-30">
					<img
						src={traitImageUrl}
						alt={providedTrait || character?.trait || ''}
						className="h-full w-full object-cover blur-sm"
						onError={() => setTraitImageError(true)}
					/>
				</div>
			)}

			{/* Portrait Container */}
			<div className={`relative z-10 h-full w-full overflow-hidden rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-slate-300 dark:border-slate-600 shadow-md ${sizeClasses}`}>
				{iconUrl && !showFallback ? (
					<img
						src={iconUrl}
						alt={displayName}
						className="h-full w-full object-contain p-1"
						onError={() => setShowFallback(true)}
					/>
				) : (
					<div className="h-full w-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
						{initials}
					</div>
				)}
			</div>
		</div>
	);
};
