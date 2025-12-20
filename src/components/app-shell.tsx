import { Link } from '@tanstack/react-router';
import * as React from 'react';

import AppFooter from '~/components/app-footer';
import type { AuthUser } from '~/utils/session';

type AppShellProps = {
	user: AuthUser | null
	children: React.ReactNode
};

const getInitials = (value: string) => {
	const trimmed = value.trim();
	if (!trimmed) return '?';
	const parts = trimmed.split(/\s+/).slice(0, 2);
	return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
};

type UserMenuProps = {
	user: AuthUser | null
};

const UserMenu: React.FC<UserMenuProps> = ({ user }) => {
	const [open, setOpen] = React.useState(false);
	const menuRef = React.useRef<HTMLDivElement | null>(null);

	React.useEffect(() => {
		if (!open) return;
		const handleClick = (event: MouseEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (!menuRef.current?.contains(target)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClick);
		return () => document.removeEventListener('mousedown', handleClick);
	}, [open]);

	if (!user) {
		return (
			<Link
				to="/login"
				className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
			>
				Sign in
			</Link>
		);
	}

	const displayName = user.name || user.email;
	const initials = getInitials(displayName || 'User');

	return (
		<div ref={menuRef} className="relative">
			<button
				type="button"
				onClick={() => setOpen((prev) => !prev)}
				aria-haspopup="menu"
				aria-expanded={open}
				className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
			>
				{user.picture ? (
					<img
						src={user.picture}
						alt={displayName}
						className="h-8 w-8 rounded-full object-cover"
					/>
				) : (
					<span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">
						{initials}
					</span>
				)}
				<span className="hidden max-w-[160px] truncate sm:block">
					{displayName}
				</span>
				<span className="text-slate-400">▾</span>
			</button>
			{open ? (
				<div
					role="menu"
					className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 text-sm shadow-lg"
				>
					<div className="px-3 py-2 text-xs text-slate-500">
						{user.email}
					</div>
					{user.is_admin ? (
						<Link
							to="/admin"
							className="block rounded-lg px-3 py-2 font-medium text-slate-900 hover:bg-slate-100"
							role="menuitem"
						>
							Admin
						</Link>
					) : null}
					<Link
						to="/settings"
						className="block rounded-lg px-3 py-2 font-medium text-slate-900 hover:bg-slate-100"
						role="menuitem"
					>
						Settings
					</Link>
					<Link
						to="/logout"
						className="block rounded-lg px-3 py-2 font-medium text-rose-600 hover:bg-rose-50"
						role="menuitem"
					>
						Log out
					</Link>
				</div>
			) : null}
		</div>
	);
};

const AppShell: React.FC<AppShellProps> = ({ user, children }) => {
	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
				<div className="mx-auto flex w-full max-w-6xl items-center gap-6 px-6 py-4">
					<Link
						to="/"
						className="text-base font-semibold uppercase tracking-wide text-slate-900"
					>
						AI D&amp;D
					</Link>
					<nav className="flex flex-1 flex-wrap items-center gap-4 text-sm font-semibold text-slate-600">
						<Link
							to="/"
							activeOptions={{ exact: true }}
							activeProps={{ className: 'text-amber-700' }}
						>
							Home
						</Link>
						<Link
							to="/characters"
							activeProps={{ className: 'text-amber-700' }}
						>
							Characters
						</Link>
						<Link
							to="/host-game"
							activeProps={{ className: 'text-amber-700' }}
						>
							Host Game
						</Link>
						<Link
							to="/join-game"
							activeProps={{ className: 'text-amber-700' }}
						>
							Join Game
						</Link>
					<Link
						to="/new-game"
						activeProps={{ className: 'text-amber-700' }}
					>
						New Game
					</Link>
					{user?.is_admin ? (
						<Link
							to="/admin"
							activeProps={{ className: 'text-amber-700' }}
						>
							Admin
						</Link>
					) : null}
				</nav>
					<UserMenu user={user} />
				</div>
			</header>
			<main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
				{children}
			</main>
			<AppFooter />
		</div>
	);
};

export default AppShell;
