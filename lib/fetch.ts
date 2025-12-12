
import { apiService } from 'expo-auth-template/frontend';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

export async function fetchAPI<T>(path: string, options: RequestInit = {}): Promise<T> {
	const url = `${API_URL}${path}`;
	const headers = {
		'Content-Type': 'application/json',
		...options.headers,
	};

	const response = await fetch(url, {
		...options,
		headers,
	});

	if (!response.ok) {
		let errorMessage = 'An error occurred';
		try {
			const errorData = await response.json();
			errorMessage = errorData.message || errorData.error || errorMessage;
		} catch {
			errorMessage = `HTTP error! status: ${response.status}`;
		}
		throw new Error(errorMessage);
	}

	// Handle 204 No Content
	if (response.status === 204) {
		return {} as T;
	}

	return response.json();
}

export async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
	// Normalize path: apiService.fetchApi expects paths without /api/ prefix
	// If path starts with /api/, remove it since apiService adds it automatically
	const normalizedPath = path.startsWith('/api/') ? path.slice(5) : path.startsWith('/api') ? path.slice(4) : path;
	// Use apiService.fetchApi which automatically includes authentication headers
	// Do not set Content-Type header for FormData, let the browser/native handle it
	const response = await apiService.fetchApi(normalizedPath, {
		method: 'POST',
		body: formData,
	}) as T;
	return response;
}
