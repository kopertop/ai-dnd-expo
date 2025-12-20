import { createFileRoute } from '@tanstack/react-router';

const LayoutAComponent = () => {
	return <div>I'm A!</div>;
};

export const Route = createFileRoute('/_pathless-layout/_nested-layout/route-a')(
	{
		component: LayoutAComponent,
	},
);
