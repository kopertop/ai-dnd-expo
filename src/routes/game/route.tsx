import { Outlet, createFileRoute } from '@tanstack/react-router';
import * as React from 'react';

const GameLayout: React.FC = () => {
	return <Outlet />;
};

export const Route = createFileRoute('/game')({
	component: GameLayout,
});
