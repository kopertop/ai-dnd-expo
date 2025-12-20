import { createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

import CharacterCreationFlow from '~/components/character-creation-flow';

const NewCharacterIndex: React.FC = () => {
	return <CharacterCreationFlow selections={[]} />;
};

export const Route = createFileRoute('/new-character/')({
	component: NewCharacterIndex,
});
