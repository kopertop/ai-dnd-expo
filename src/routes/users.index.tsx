import { createFileRoute } from '@tanstack/react-router';

const UsersIndexComponent = () => {
	return <div>Select a user.</div>;
};

export const Route = createFileRoute('/users/')({
	component: UsersIndexComponent,
});
