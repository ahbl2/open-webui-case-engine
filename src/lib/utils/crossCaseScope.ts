export type AuthUnit = 'CID' | 'SIU';

export function resolveAuthorizedUnits(units: unknown): AuthUnit[] {
	if (!Array.isArray(units)) return [];
	const normalized = units.filter(
		(unit): unit is AuthUnit => unit === 'CID' || unit === 'SIU'
	);
	return Array.from(new Set(normalized));
}

export function formatNonAdminScopeLabel(units: AuthUnit[]): string {
	return units.length > 0 ? units.join(', ') : 'Authorized unit scope';
}
