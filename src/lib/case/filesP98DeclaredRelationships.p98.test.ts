/**
 * P98-03 — Files surface: honest no-op until file-origin builder exists.
 */
import { describe, it, expect } from 'vitest';
import { caseFileDeclaredRelationshipsPresentation } from './filesP98DeclaredRelationships';

describe('filesP98DeclaredRelationships (P98-03)', () => {
	it('never shows inferred UI for standalone file origin (unsupported in P98-01)', () => {
		const p = caseFileDeclaredRelationshipsPresentation('case-1', 'file-1');
		expect(p.show).toBe(false);
		expect(p.rows.length).toBe(0);
		expect(p.originUnsupported).toBe(true);
	});

	it('does not show rows for invalid scope ids (no backfill)', () => {
		const p = caseFileDeclaredRelationshipsPresentation('', 'f1');
		expect(p.show).toBe(false);
		expect(p.originUnsupported).toBe(false);
	});
});
