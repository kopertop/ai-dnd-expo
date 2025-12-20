/// <reference types="vite/client" />
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
	redirect,
} from '@tanstack/react-router';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import * as React from 'react';
import type { QueryClient } from '@tanstack/react-query';

import { DefaultCatchBoundary } from '~/components/default-catch-boundary';
import { NotFound } from '~/components/not-found';
import appCss from '~/styles/app.css?url';
import { seo } from '~/utils/seo';
import { fetchCurrentUser } from '~/utils/auth';
import type { AuthUser } from '~/utils/session';

const RootComponent = () => {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
};

const RootDocument = ({ children }: { children: React.ReactNode }) => {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
				{children}
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
				charSet: 'utf-8',
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1',
			},
			...seo({
				title: 'AI D&D Platform',
				description: 'AI-powered tabletop adventures for solo and multiplayer play.',
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
