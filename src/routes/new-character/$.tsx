import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import CharacterCreationFlow from '~/components/character-creation-flow';

const NewCharacterStep: React.FC = () => {
	const { _splat } = Route.useParams();
	const selections = _splat ? _splat.split('/').filter(Boolean) : [];

	return <CharacterCreationFlow selections={selections} />;
};

export const Route = createFileRoute('/new-character/$')({
	component: NewCharacterStep,
});
