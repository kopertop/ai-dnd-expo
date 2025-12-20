import { useSession } from '@tanstack/react-start/server';

export type AuthUser = {
  id: string
  email: string
  name: string
  picture?: string
  is_admin?: boolean
}

export type AuthSessionData = {
  deviceToken?: string
  user?: AuthUser
}

const getSessionPassword = () => {
	const secret = process.env.SESSION_SECRET;
	if (secret && secret.length >= 32) {
		return secret;
	}

	if (process.env.NODE_ENV === 'production') {
		throw new Error('SESSION_SECRET must be at least 32 characters.');
	}

	if (secret && secret.length < 32) {
		console.warn('SESSION_SECRET is too short; using dev fallback secret.');
	}

	return 'dev-session-secret-dev-session-secret';
};

export const useAuthSession = () => {
	return useSession<AuthSessionData>({
		name: 'ai-dnd-session',
		password: getSessionPassword(),
		cookie: {
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			path: '/',
		},
	});
};
