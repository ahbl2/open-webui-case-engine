/**
 * P109-04 / P109-05 — Evidence set detail panel guardrails (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseEvidenceSetDetailPanel.svelte');
const pagePath = join(here, '../../../routes/(app)/case/[id]/evidence-sets/[setId]/+page.svelte');

describe('CaseEvidenceSetDetailPanel.svelte (P109-04)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('uses getEvidenceSetDetail + getEvidenceSetExpanded (read paths only)', () => {
		expect(src).toContain('getEvidenceSetDetail');
		expect(src).toContain('getEvidenceSetExpanded');
		expect(src).not.toContain('createEvidenceSet');
		expect(src).not.toContain('POST');
	});

	it('renders timeline and file sections with stable test ids', () => {
		expect(src).toContain('case-evidence-set-detail--section-timeline');
		expect(src).toContain('case-evidence-set-detail--section-files');
		expect(src).toContain('case-evidence-set-detail--list-timeline');
		expect(src).toContain('case-evidence-set-detail--list-files');
		expect(src).toContain('case-evidence-set-detail--output-preview');
		expect(src).toContain('case-evidence-set-detail--preview-timeline');
		expect(src).toContain('case-evidence-set-detail--preview-files');
		expect(src).toContain('timelineItems');
		expect(src).toContain('fileItems');
	});

	it('exposes loading, error, and not-found surfaces', () => {
		expect(src).toContain('case-evidence-set-detail--loading');
		expect(src).toContain('case-evidence-set-detail--error');
		expect(src).toContain('case-evidence-set-detail--not-found');
	});

	it('provides back link to management list only', () => {
		expect(src).toContain('case-evidence-set-detail--back');
		expect(src).toMatch(/evidence-sets/);
		expect(src).not.toMatch(/\bgoto\s*\(/);
	});

	it('does not introduce lifecycle or bulk action affordances', () => {
		expect(src).not.toMatch(/\b(delete|retire|restore|rename)\b|download package|add item|remove item/i);
	});

	it('P109-05: read-only badge, audit label, shared attribution helper', () => {
		expect(src).toContain('case-evidence-set-detail--readonly-badge');
		expect(src).toContain('P109_EVIDENCE_SET_DETAIL_AUDIT_LABEL');
		expect(src).toContain('P109_EVIDENCE_SET_AUDIT_ATTRIBUTION_LINE');
		expect(src).toContain('formatEvidenceSetSavedAt');
		expect(src).toContain('data-ce-p109-surface="evidence-set-readonly"');
	});
});

describe('evidence-sets/[setId]/+page.svelte (P109-04)', () => {
	const src = readFileSync(pagePath, 'utf8');

	it('remounts detail panel on case + set id and passes token', () => {
		expect(src).toContain('{#key `${caseId}|${setId}`}');
		expect(src).toContain('CaseEvidenceSetDetailPanel');
		expect(src).toContain('$page.params.setId');
	});
});
