import { apiService } from 'expo-auth-template/frontend';

export async function fetchAPI<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiService.fetchApi(path, options) as Promise<T>;
}

export async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  return apiService.fetchApi(path, {
    method: 'POST',
    body: formData,
  }) as Promise<T>;
}
