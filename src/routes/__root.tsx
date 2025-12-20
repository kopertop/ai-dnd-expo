/// <reference types="vite/client" />
import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
	redirect,
	useRouterState,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import * as React from 'react';

import AppFooter from '~/components/app-footer';
import AppShell from '~/components/app-shell';
import { DefaultCatchBoundary } from '~/components/default-catch-boundary';
import { NotFound } from '~/components/not-found';
import appCss from '~/styles/app.css?url';
import { fetchCurrentUser } from '~/utils/auth';
import { seo } from '~/utils/seo';
import type { AuthUser } from '~/utils/session';

const RootComponent = () => {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
};

const RootDocument = ({ children }: { children: React.ReactNode }) => {
	const { user } = Route.useRouteContext();
	const routerState = useRouterState();
	const pathname = routerState.location.pathname;
	const hideChrome =
		pathname === '/login' || pathname.startsWith('/auth');

	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<HeadContent />
			</head>
			<body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
				{hideChrome ? (
					<div className="flex min-h-screen flex-col">
						<main className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
							{children}
						</main>
						<AppFooter />
					</div>
				) : (
					<AppShell user={user}>{children}</AppShell>
				)}
				{import.meta.env.DEV ? (
					<TanStackRouterDevtools position="bottom-right" />
				) : null}
				{import.meta.env.DEV ? (
					<ReactQueryDevtools buttonPosition="bottom-left" />
				) : null}
				<Scripts />
			</body>
		</html>
	);
};

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  user: AuthUser | null
}>()({
	beforeLoad: async ({ location }) => {
		const user = await fetchCurrentUser();
		const isPublic =
      location.pathname.startsWith('/login') ||
      location.pathname.startsWith('/auth') ||
      location.pathname.startsWith('/party-test');

		if (!user && !isPublic) {
			throw redirect({
				to: '/login',
				search: {
					redirect: location.pathname,
				},
			});
		}

		return {
			user,
		};
	},
	head: () => ({
		meta: [
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1',
			},
			...seo({
				title: 'Dungeons & Dragons',
				description: 'Tabletop adventures for solo and multiplayer play.',
			}),
		],
		links: [
			{ rel: 'stylesheet', href: appCss },
			{
				rel: 'apple-touch-icon',
				sizes: '180x180',
				href: '/apple-touch-icon.png',
			},
			{
				rel: 'icon',
				type: 'image/png',
				sizes: '32x32',
				href: '/favicon-32x32.png',
			},
			{
				rel: 'icon',
				type: 'image/png',
				sizes: '16x16',
				href: '/favicon-16x16.png',
			},
			{ rel: 'manifest', href: '/site.webmanifest', color: '#fffff' },
			{ rel: 'icon', href: '/favicon.ico' },
		],
	}),
	errorComponent: (props) => {
		return (
			<RootDocument>
				<DefaultCatchBoundary {...props} />
			</RootDocument>
		);
	},
	notFoundComponent: () => <NotFound />,
	component: RootComponent,
});
