import { createFileRoute } from '@tanstack/react-router';

const Home = () => {
	return (
		<div className="p-2">
			<h3>Welcome Home!!!</h3>
		</div>
	);
};

export const Route = createFileRoute('/')({
	component: Home,
});
