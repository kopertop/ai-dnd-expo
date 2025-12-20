import { Link, Outlet, createFileRoute } from '@tanstack/react-router';

const PathlessLayoutComponent = () => {
	return (
		<div>
			<div>I'm a nested pathless layout</div>
			<div className="flex gap-2">
				<Link
					to="/route-a"
					activeProps={{
						className: 'font-bold',
					}}
				>
          Go to route A
				</Link>
				<Link
					to="/route-b"
					activeProps={{
						className: 'font-bold',
					}}
				>
          Go to route B
				</Link>
			</div>
			<div>
				<Outlet />
			</div>
		</div>
	);
};

export const Route = createFileRoute('/_pathless-layout/_nested-layout')({
	component: PathlessLayoutComponent,
});
