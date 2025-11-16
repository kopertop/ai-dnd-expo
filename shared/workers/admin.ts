/**
 * Shared admin helper utilities
 */

function normalizeList(list: string): string[] {
	return list
		.split(',')
		.map(entry => entry.trim().toLowerCase())
		.filter(Boolean);
}

export function isAdmin(email: string | null, adminList: string): boolean {
	if (!email) return false;
	const normalizedAdmins = normalizeList(adminList);
	return normalizedAdmins.includes(email.toLowerCase());
}


