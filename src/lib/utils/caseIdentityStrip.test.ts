import { describe, expect, it } from 'vitest';
import {
	caseIdentityStripExpandedPosture,
	caseStatusDsBadgeCompound,
	displayCaseTitle
} from './caseIdentityStrip';

describe('caseIdentityStrip (P76-04)', () => {
	it('displayCaseTitle falls back without inventing data', () => {
		expect(displayCaseTitle(undefined)).toBe('Untitled case');
		expect(displayCaseTitle('')).toBe('Untitled case');
		expect(displayCaseTitle('   ')).toBe('Untitled case');
		expect(displayCaseTitle('Alpha')).toBe('Alpha');
	});

	it('caseStatusDsBadgeCompound maps known lifecycle labels', () => {
		expect(caseStatusDsBadgeCompound('OPEN')).toContain('ds-badge-success');
		expect(caseStatusDsBadgeCompound('closed')).toContain('ds-badge-neutral');
		expect(caseStatusDsBadgeCompound('Pending')).toContain('ds-badge-warning');
		expect(caseStatusDsBadgeCompound('CUSTOM')).toContain('ds-badge-info');
	});

	it('caseStatusDsBadgeCompound uses neutral when status empty', () => {
		expect(caseStatusDsBadgeCompound('')).toContain('ds-badge-neutral');
	});

	it('caseIdentityStripExpandedPosture is true on summary only', () => {
		expect(caseIdentityStripExpandedPosture('summary')).toBe(true);
		expect(caseIdentityStripExpandedPosture('chat')).toBe(false);
		expect(caseIdentityStripExpandedPosture('timeline')).toBe(false);
	});
});
