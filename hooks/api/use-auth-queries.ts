import { useQueryApi } from 'expo-auth-template/frontend';

export function useUserInfo() {
	return useQueryApi<{
		id: string,
		email: string,
		name: string,
		picture: string | undefined,
		created_at: number,
		updated_at: number,
		is_admin: boolean,
	 }>('/me');
}
