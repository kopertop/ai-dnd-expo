// Cloudflare Pages Function: proxies /api/* to Worker API
// Uses Service Binding 'API_WORKER' configured in wrangler.toml

// Define types for better type safety
interface Env {
	API_WORKER: Fetcher;
}

interface Context {
	request: Request;
	env: Env;
	params: Record<string, string>;
	waitUntil: (promise: Promise<any>) => void;
	next: () => Promise<Response>;
	data: Record<string, any>;
}

export const onRequest: any = async (context: Context) => {
	const req = context.request;
	const env = context.env;

	if (!req) {
		return new Response('Bad Request: no request', { status: 400 });
	}

	if (!env.API_WORKER) {
		console.error('API_WORKER service binding not found');
		return new Response('Server Configuration Error: API_WORKER binding missing', { status: 500 });
	}

	const url = new URL(req.url);

	// Preserve the full path (including /api/*) because the API Worker mounts routes under /api/*
	// e.g. /api/games stays /api/games
	const apiPath = url.pathname || '/';

	// Create a new URL for the API request
	// We can use a dummy host since the Service Binding routes directly
	// but keeping the original host header is often good practice
	const newUrl = new URL(apiPath + url.search, url.origin);

	// Create a new request to forward
	// We need to recreate the request to change the URL
	const isBodyless = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
	const apiRequest = new Request(newUrl.toString(), {
		method: req.method,
		headers: req.headers,
		body: isBodyless ? undefined : req.body,
		redirect: 'manual', // Let the client handle redirects
	});

	try {
		// Forward request to API Worker via Service Binding
		const response = await env.API_WORKER.fetch(apiRequest);

		// Return the response as-is
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	} catch (error) {
		console.error('Error forwarding to API Worker:', error);
		return new Response('Internal Server Error: Failed to contact API', { status: 502 });
	}
};
