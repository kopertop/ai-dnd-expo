import { createFileRoute, useRouteContext } from '@tanstack/react-router';
import { useRouter } from '@tanstack/react-router';
import * as React from 'react';

import { completeGoogleLogin } from '~/utils/auth';

const CODE_VERIFIER_KEY = 'google_oauth_code_verifier';
const REDIRECT_KEY = 'login_redirect_path';

const getGoogleClientId = () => {
	return (
		import.meta.env.VITE_GOOGLE_CLIENT_ID ||
		import.meta.env.VITE_PUBLIC_GOOGLE_CLIENT_ID ||
		import.meta.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
		import.meta.env.GOOGLE_CLIENT_ID ||
		''
	);
};

const generateCodeVerifier = () => {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
		'',
	);
};

const generateCodeChallenge = async (verifier: string) => {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const digest = await crypto.subtle.digest('SHA-256', data);
	const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const LoginRoute = () => {
	const router = useRouter();
	const { user } = useRouteContext({ from: '__root__' });
	const [error, setError] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(false);

	React.useEffect(() => {
		if (user) {
			router.navigate({ to: '/' });
		}
	}, [router, user]);

	React.useEffect(() => {
		if (typeof window === 'undefined') return;

		const params = new URLSearchParams(window.location.search);
		const code = params.get('code');
		const errorParam = params.get('error');
		const redirectParam = params.get('redirect');

		if (errorParam) {
			setError(errorParam);
			return;
		}

		if (redirectParam) {
			sessionStorage.setItem(REDIRECT_KEY, redirectParam);
		}

		if (!code) {
			return;
		}

		const redirectUri = `${window.location.origin}/login`;
		const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY) || undefined;
		const redirectPath = sessionStorage.getItem(REDIRECT_KEY) || '/';

		setLoading(true);
		setError(null);

		completeGoogleLogin({
			data: {
				code,
				redirectUri,
				codeVerifier,
			},
		})
			.then(async () => {
				await router.invalidate();
				sessionStorage.removeItem(REDIRECT_KEY);
				router.navigate({ to: redirectPath });
			})
			.catch((err) => {
				const message = err instanceof Error ? err.message : 'Login failed';
				setError(message);
			})
			.finally(() => {
				setLoading(false);
				window.history.replaceState({}, document.title, '/login');
			});
	}, [router]);

	const handleGoogleSignIn = async () => {
		if (typeof window === 'undefined') return;
		const clientId = getGoogleClientId();

		if (!clientId) {
			setError('Missing Google client ID');
			return;
		}

		setError(null);
		setLoading(true);

		try {
			const redirectUri = `${window.location.origin}/login`;
			const redirectPath =
        new URLSearchParams(window.location.search).get('redirect') || '/';
			sessionStorage.setItem(REDIRECT_KEY, redirectPath);
			const codeVerifier = generateCodeVerifier();
			sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);

			const codeChallenge = await generateCodeChallenge(codeVerifier);
			const params = new URLSearchParams({
				client_id: clientId,
				redirect_uri: redirectUri,
				response_type: 'code',
				scope: 'openid profile email',
				code_challenge: codeChallenge,
				code_challenge_method: 'S256',
			});

			window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Login failed';
			setError(message);
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 text-slate-900">
			<div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
				<div className="space-y-2">
					<h1 className="text-3xl font-semibold">Welcome to AI D&D</h1>
					<p className="text-sm text-slate-600">
            Sign in to continue your adventure.
					</p>
				</div>
				<button
					className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
					onClick={handleGoogleSignIn}
					disabled={loading}
				>
					{loading ? 'Signing in...' : 'Sign in with Google'}
				</button>
				{error ? (
					<div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
						{error}
					</div>
				) : null}
			</div>
		</div>
	);
};

export const Route = createFileRoute('/login')({
	component: LoginRoute,
});
