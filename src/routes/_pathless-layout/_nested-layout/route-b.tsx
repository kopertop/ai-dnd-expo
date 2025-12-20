import { createFileRoute } from '@tanstack/react-router';

const LayoutBComponent = () => {
	return <div>I'm B!</div>;
};

export const Route = createFileRoute('/_pathless-layout/_nested-layout/route-b')(
	{
		component: LayoutBComponent,
	},
);
