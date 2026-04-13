/**
 * P111-05 — Export: DOCX/PDF only, separate error paths (no cross-format fallback).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const panelPath = join(__dirname, 'CaseEvidenceSetDetailPanel.svelte');

describe('CaseEvidenceSetDetailPanel.svelte (P111-05)', () => {
	it('uses separate fetch + feedback per format (no fallback)', () => {
		const src = readFileSync(panelPath, 'utf8');
		const docxFn = src.indexOf('async function downloadExportDocx');
		const pdfFn = src.indexOf('async function downloadExportPdf');
		expect(docxFn).toBeGreaterThanOrEqual(0);
		expect(pdfFn).toBeGreaterThan(docxFn);
		expect(src.slice(docxFn, pdfFn)).toContain('fetchEvidenceSetExportDocx');
		expect(src.slice(docxFn, pdfFn)).not.toContain('fetchEvidenceSetExportPdf');
		expect(src.slice(pdfFn)).toContain('fetchEvidenceSetExportPdf');
		expect(src.slice(pdfFn)).not.toContain('fetchEvidenceSetExportDocx');
		expect(src).toContain("p111ExportFeedback = 'docx_err'");
		expect(src).toContain("p111ExportFeedback = 'pdf_err'");
	});
});
