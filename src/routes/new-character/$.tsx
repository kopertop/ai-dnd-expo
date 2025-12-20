import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import CharacterCreationFlow from '~/components/character-creation-flow';
import { uploadedImagesQueryOptions } from '~/utils/images';

const NewCharacterStep: React.FC = () => {
	const { _splat } = Route.useParams();
	const selections = _splat ? _splat.split('/').filter(Boolean) : [];

	return <CharacterCreationFlow selections={selections} />;
};

export const Route = createFileRoute('/new-character/$')({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(uploadedImagesQueryOptions('both'));
	},
	component: NewCharacterStep,
});
