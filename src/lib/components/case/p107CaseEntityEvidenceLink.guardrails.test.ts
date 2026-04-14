/**
 * P107-03 — Entity ↔ evidence linking guardrails (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const detailPath = join(here, 'CaseEntityDetailPanel.svelte');
const formPath = join(here, 'CaseEntityEvidenceLinkForm.svelte');
const copyPath = join(here, '../../case/p107CaseEntityEvidenceLinkCopy.ts');
const p126LinkCopyPath = join(here, '../../caseContext/p126EntityExplicitLinkCopy.ts');

describe('CaseEntityDetailPanel.svelte (P107-03)', () => {
	const src = readFileSync(detailPath, 'utf8');

	it('wires evidence link create/remove via API module (no inline fetch)', () => {
		expect(src).toContain('removeCaseEntityEvidenceLink');
		expect(src).toContain('CaseEntityEvidenceLinkForm');
		expect(src).not.toContain('fetch(');
	});

	it('exposes unlink control for evidence rows', () => {
		expect(src).toContain('data-testid="case-entity-detail--evidence-unlink"');
	});

	it('does not add entity-to-entity or graph language in panel source', () => {
		const lower = src.toLowerCase();
		expect(lower).not.toContain('related entities');
		expect(lower).not.toContain('graph');
	});
});

describe('CaseEntityEvidenceLinkForm.svelte (P107-03)', () => {
	const src = readFileSync(formPath, 'utf8');

	it('uses createCaseEntityEvidenceLink and only timeline_entry / case_file pickers', () => {
		expect(src).toContain('createCaseEntityEvidenceLink');
		expect(src).toContain('listCaseTimelineEntries');
		expect(src).toContain('listCaseFiles');
		expect(src).toContain('timeline_entry');
		expect(src).toContain('case_file');
		expect(src).not.toContain('fetch(');
	});

	it('exposes link evidence entry point test ids', () => {
		expect(src).toContain('data-testid="case-entity-detail--link-evidence-toggle"');
		expect(src).toContain('data-testid="case-entity-detail--link-evidence-submit"');
	});
});

describe('p107CaseEntityEvidenceLinkCopy (P107-03)', () => {
	const src = readFileSync(copyPath, 'utf8');
	const lower = src.toLowerCase();

	it('unlink copy stays explicit (no graph language)', () => {
		expect(lower).toContain('remove');
		expect(lower).not.toContain('graph');
		expect(lower).not.toContain('related entities');
	});
});

describe('p126EntityExplicitLinkCopy (P126-04)', () => {
	const src = readFileSync(p126LinkCopyPath, 'utf8');
	const lower = src.toLowerCase();

	it('frames manual explicit links without suggestion or graph language', () => {
		expect(lower).toContain('manual');
		expect(lower).not.toContain('suggest');
		expect(lower).not.toContain('graph');
		expect(lower).not.toContain('related entities');
	});
});
