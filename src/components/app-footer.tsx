import { Link } from '@tanstack/react-router';
import * as React from 'react';

import packageJson from '../../package.json';

const AppFooter: React.FC = () => {
	const version = packageJson.version ?? '0.0.0';

	return (
		<footer className="border-t border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/40">
			<div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-slate-500 dark:text-slate-300">
				<Link
					to="/licenses"
					className="font-semibold text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
				>
					Licenses &amp; Credits
				</Link>
				<span>v{version}</span>
			</div>
		</footer>
	);
};

export default AppFooter;
