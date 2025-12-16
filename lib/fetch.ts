
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

export async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
	const url = `${API_URL}${path}`;

	// Do not set Content-Type header for FormData, let the browser/native handle it
	const response = await fetch(url, {
		method: 'POST',
		body: formData,
	});

	if (!response.ok) {
		let errorMessage = 'An error occurred during upload';
		try {
			const errorData = await response.json();
			errorMessage = errorData.message || errorData.error || errorMessage;
		} catch {
			errorMessage = `HTTP error! status: ${response.status}`;
		}
		throw new Error(errorMessage);
	}

	return response.json();
}
