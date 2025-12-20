import { Outlet, createFileRoute } from '@tanstack/react-router';

const PathlessLayoutComponent = () => {
	return (
		<div className="p-2">
			<div>I'm a pathless layout</div>
			<div>
				<Outlet />
			</div>
		</div>
	);
};

export const Route = createFileRoute('/_pathless-layout')({
	component: PathlessLayoutComponent,
});
