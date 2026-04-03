/**
 * P36-02 — Integrity tab surfaces case audit including narrative lifecycle; read-only copy.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const tabPath = join(dirname(fileURLToPath(import.meta.url)), 'CaseIntegrityTab.svelte');

describe('CaseIntegrityTab P36-02 narrative audit hint', () => {
	it('documents narrative lifecycle audit visibility without implying restore', () => {
		const src = readFileSync(tabPath, 'utf8');
		expect(src).toMatch(/case-audit-narrative-governance-hint/);
		expect(src).toMatch(/Narrative lifecycle actions/);
		expect(src).toMatch(/read-only/);
		expect(src).toMatch(/getCaseAudit/);
		expect(src).not.toMatch(/restore.*narrative/i);
	});
});
