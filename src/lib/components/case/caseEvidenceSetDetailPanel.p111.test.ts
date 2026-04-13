/**
 * P111-04 — Evidence set panel: export buttons + wiring (source inspection).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const panelPath = join(__dirname, 'CaseEvidenceSetDetailPanel.svelte');

describe('CaseEvidenceSetDetailPanel.svelte (P111-04)', () => {
	it('wires Case Engine export fetch + binary download only', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('fetchEvidenceSetExportDocx');
		expect(src).toContain('fetchEvidenceSetExportPdf');
		expect(src).toContain('triggerBinaryDownload');
		expect(src).toContain('buildEvidenceSetExportDocxFilename');
		expect(src).toContain('buildEvidenceSetExportPdfFilename');
		expect(src).not.toContain('buildCanonicalExportPayload');
		expect(src).toMatch(/fetchEvidenceSetExportDocx\(\s*caseId,\s*setId,\s*caseEngineToken/);
	});

	it('exposes export controls and disabled state', () => {
		const src = readFileSync(panelPath, 'utf8');
		const docxIdx = src.indexOf('data-testid="case-evidence-set-detail--export-docx"');
		const composedIdx = src.indexOf('composedExpanded');
		expect(composedIdx).toBeGreaterThanOrEqual(0);
		expect(docxIdx).toBeGreaterThan(composedIdx);
		expect(src).toContain('data-testid="case-evidence-set-detail--export-docx"');
		expect(src).toContain('data-testid="case-evidence-set-detail--export-pdf"');
		expect(src).toContain('disabled={p111ExportBusy !== \'none\'}');
		expect(src).toContain('data-testid="case-evidence-set-detail--export-feedback-error-docx"');
		expect(src).toContain('data-testid="case-evidence-set-detail--export-feedback-error-pdf"');
	});
});
