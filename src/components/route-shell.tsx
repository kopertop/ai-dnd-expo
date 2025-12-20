import * as React from 'react';

type RouteShellProps = {
  title: string
  description?: string
  children?: React.ReactNode
}

const RouteShell: React.FC<RouteShellProps> = ({
	title,
	description,
	children,
}) => {
	return (
		<section className="space-y-6">
			<header className="space-y-1">
				<h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
					{title}
				</h1>
				{description ? (
					<p className="text-sm text-slate-600 dark:text-slate-300">
						{description}
					</p>
				) : null}
			</header>
			<section className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40">
				{children || (
					<p className="text-sm text-slate-500 dark:text-slate-400">
						Content pending migration.
					</p>
				)}
			</section>
		</section>
	);
};

export default RouteShell;
