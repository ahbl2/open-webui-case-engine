/**
 * P110-02 — Read-only output preview from Case Engine expansion (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseEvidenceSetDetailPanel.svelte');

describe('CaseEvidenceSetDetailPanel.svelte (P110-02)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('loads expanded read model after detail (no writes)', () => {
		expect(src).toContain('getEvidenceSetExpanded');
		expect(src).toContain('CaseEngineEvidenceSetExpanded');
		expect(src).toContain('expanded');
		expect(src).toContain('expandedError');
	});

	it('exposes preview region test ids and P110 surface marker', () => {
		expect(src).toContain('case-evidence-set-detail--output-preview');
		expect(src).toContain('case-evidence-set-detail--preview-error');
		expect(src).toContain('case-evidence-set-detail--preview-body');
		expect(src).toContain('data-ce-p110-surface="evidence-set-output-preview"');
	});

	it('renders timeline text as pre with whitespace preserved', () => {
		expect(src).toContain('case-evidence-set-detail--preview-timeline-text');
		expect(src).toContain('whitespace-pre-wrap');
		expect(src).toContain('text_original');
	});

	it('imports P110 copy module', () => {
		expect(src).toContain("$lib/case/p110EvidenceSetOutputPreviewCopy");
	});

	it('uses deterministic composition for preview rows', () => {
		expect(src).toContain('composeDeterministicEvidenceSetOutput');
		expect(src).toContain("$lib/case/p110EvidenceSetOutputComposition");
		expect(src).toContain('composedExpanded');
	});
});

describe('CaseEvidenceSetDetailPanel.svelte (P110-04)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('uses serializeDeterministicPlainTextOutput with clipboard + download helpers only', () => {
		expect(src).toContain('serializeDeterministicPlainTextOutput');
		expect(src).toContain('writePlainTextToClipboard');
		expect(src).toContain("$lib/case/p110EvidenceSetOutputClipboard");
		expect(src).toContain('triggerPlainTextDownload');
		expect(src).toContain("$lib/case/p110EvidenceSetOutputDownload");
		expect(src).toContain('buildDeterministicPlainTextFilename');
	});

	it('exposes read-only output actions and feedback test ids', () => {
		expect(src).toContain('case-evidence-set-detail--output-actions');
		expect(src).toContain('case-evidence-set-detail--copy-output');
		expect(src).toContain('case-evidence-set-detail--download-output');
		expect(src).toContain('case-evidence-set-detail--copy-feedback-success');
		expect(src).toContain('case-evidence-set-detail--copy-feedback-error');
		expect(src).toContain('case-evidence-set-detail--download-feedback-success');
		expect(src).toContain('case-evidence-set-detail--download-feedback-error');
		expect(src).toContain('data-ce-p110-output-action');
	});

	it('does not introduce lifecycle or packaged-deliverable wording on actions', () => {
		expect(src).not.toMatch(/\b(delete|retire|restore|rename)\b|download package|official report/i);
	});
});

describe('CaseEvidenceSetDetailPanel.svelte (P110-05)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('surfaces traceability block and enriched record timestamps', () => {
		expect(src).toContain('case-evidence-set-detail--output-traceability');
		expect(src).toContain('P110_OUTPUT_TRACEABILITY_CASE_SET_LINE');
		expect(src).toContain('P110_OUTPUT_VERSION_LINE');
		expect(src).toContain('P110_COMPOSITION_RULES_VERSION');
		expect(src).toContain('formatEvidenceSetSavedAt(row.created_at)');
		expect(src).toContain('formatEvidenceSetSavedAt(f.created_at)');
	});
});
