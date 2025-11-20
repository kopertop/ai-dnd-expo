/**
 * HTTP service with timeout support
 */

const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Fetch with timeout support
 */
export async function fetchWithTimeout(
	url: string,
	options?: RequestInit,
	timeout: number = DEFAULT_TIMEOUT,
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal,
		});
		clearTimeout(timeoutId);
		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error(`Request timeout after ${timeout}ms`);
		}
		throw error;
	}
}

