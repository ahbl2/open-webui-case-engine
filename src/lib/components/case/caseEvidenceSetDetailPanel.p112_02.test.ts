/**
 * P112-02 — Export attribution helper + format-specific errors; preview path unchanged.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const panelPath = join(__dirname, 'CaseEvidenceSetDetailPanel.svelte');

describe('CaseEvidenceSetDetailPanel.svelte (P112-02)', () => {
	it('includes deterministic export helper before actions in preview path', () => {
		const src = readFileSync(panelPath, 'utf8');
		const helperIdx = src.indexOf('case-evidence-set-detail--export-helper-p112');
		const actionsIdx = src.indexOf('case-evidence-set-detail--output-actions');
		expect(helperIdx).toBeGreaterThanOrEqual(0);
		expect(actionsIdx).toBeGreaterThan(helperIdx);
		const blockStart = src.indexOf('{:else if composedExpanded}');
		expect(helperIdx).toBeGreaterThan(blockStart);
	});

	it('uses separate error testids for DOCX vs PDF', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('export-feedback-error-docx');
		expect(src).toContain('export-feedback-error-pdf');
		expect(src).toContain('P112_EXPORT_FAILED_DOCX');
		expect(src).toContain('P112_EXPORT_FAILED_PDF');
	});

	it('does not introduce client-side export construction', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toContain('buildCanonicalExportPayload');
	});
});
