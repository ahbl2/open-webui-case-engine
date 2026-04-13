/**
 * P107-05 — Audit display helpers (literal fields only).
 */
import { describe, expect, it } from 'vitest';

import { auditFieldDisplay } from './p107CaseEntityAudit';

describe('p107CaseEntityAudit', () => {
	it('auditFieldDisplay returns em dash for null/undefined/blank', () => {
		const dash = '\u2014';
		expect(auditFieldDisplay(null)).toBe(dash);
		expect(auditFieldDisplay(undefined)).toBe(dash);
		expect(auditFieldDisplay('')).toBe(dash);
		expect(auditFieldDisplay('   ')).toBe(dash);
	});

	it('auditFieldDisplay returns trimmed literal strings (no synthesis)', () => {
		expect(auditFieldDisplay('admin')).toBe('admin');
		expect(auditFieldDisplay('  2024-01-02T00:00:00.000Z  ')).toBe('2024-01-02T00:00:00.000Z');
	});
});
