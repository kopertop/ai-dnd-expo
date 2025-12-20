const normalizeBaseUrl = (value: string) => {
	return value.endsWith('/') ? value : `${value}/`;
};

const getExplicitBaseUrl = () => {
	return (
		process.env.VITE_API_BASE_URL ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    ''
	);
};

export const resolveApiBaseUrl = (origin?: string) => {
	const explicit = getExplicitBaseUrl();
	if (explicit) {
		return normalizeBaseUrl(explicit);
	}

	if (origin) {
		return normalizeBaseUrl(`${origin}/api/`);
	}

	return '/api/';
};
