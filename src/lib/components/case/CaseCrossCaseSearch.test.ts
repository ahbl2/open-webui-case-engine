import { describe, expect, it } from 'vitest';
import { formatNonAdminScopeLabel, resolveAuthorizedUnits } from '$lib/utils/crossCaseScope';

describe('CaseCrossCaseSearch scope label helpers', () => {
	it('derives authorized units only from backend-resolved units list', () => {
		expect(resolveAuthorizedUnits(['CID', 'SIU'])).toEqual(['CID', 'SIU']);
		expect(resolveAuthorizedUnits(['SIU', 'CID', 'SIU'])).toEqual(['SIU', 'CID']);
		expect(resolveAuthorizedUnits(['CID', 'ALL', 'detective', null])).toEqual(['CID']);
		expect(resolveAuthorizedUnits(undefined)).toEqual([]);
	});

	it('formats non-admin scope label from resolved backend units', () => {
		expect(formatNonAdminScopeLabel(['CID'])).toBe('CID');
		expect(formatNonAdminScopeLabel(['CID', 'SIU'])).toBe('CID, SIU');
		expect(formatNonAdminScopeLabel([])).toBe('Authorized unit scope');
	});
});
