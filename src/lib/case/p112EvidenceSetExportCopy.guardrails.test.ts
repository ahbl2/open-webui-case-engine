/**
 * P112-02 / P112-05 — Export UI copy: non-authority, deterministic wording; no misleading terms.
 */
import { describe, it, expect } from 'vitest';
import {
	P111_EXPORT_DOCX_BUTTON,
	P111_EXPORT_PDF_BUTTON,
	P112_EXPORT_FROM_PREVIEW_HELPER,
	P111_EXPORT_LOADING_DOCX,
	P111_EXPORT_LOADING_PDF,
	P111_EXPORT_SUCCESS_DOCX,
	P111_EXPORT_SUCCESS_PDF,
	P112_EXPORT_FAILED_DOCX,
	P112_EXPORT_FAILED_PDF,
	P112_EXPORT_FAILED_GENERIC
} from './p111EvidenceSetExportCopy';
import {
	P110_OUTPUT_PREVIEW_SECTION_SUPPORTING,
	P110_OUTPUT_TRACEABILITY_NON_AUTHORITY,
	P110_OUTPUT_TRACEABILITY_PLAIN_TEXT_NOTE
} from './p110EvidenceSetOutputPreviewCopy';
import { P109_EVIDENCE_SET_DETAIL_SUPPORTING_COPY } from './p109EvidenceSetsCopy';

const EXPORT_COPY = [
	P111_EXPORT_DOCX_BUTTON,
	P111_EXPORT_PDF_BUTTON,
	P112_EXPORT_FROM_PREVIEW_HELPER,
	P111_EXPORT_LOADING_DOCX,
	P111_EXPORT_LOADING_PDF,
	P111_EXPORT_SUCCESS_DOCX,
	P111_EXPORT_SUCCESS_PDF,
	P112_EXPORT_FAILED_DOCX,
	P112_EXPORT_FAILED_PDF,
	P112_EXPORT_FAILED_GENERIC
].join('\n');

const EXPORT_ADJACENT_SURFACE = [
	P110_OUTPUT_PREVIEW_SECTION_SUPPORTING,
	P110_OUTPUT_TRACEABILITY_NON_AUTHORITY,
	P110_OUTPUT_TRACEABILITY_PLAIN_TEXT_NOTE,
	P109_EVIDENCE_SET_DETAIL_SUPPORTING_COPY
].join('\n');

/** Substring checks (avoid accidental “summary” in “summarization”, etc.). */
const FORBIDDEN_SUBSTRINGS = [
	'report',
	'analysis',
	'official',
	'summary',
	'record copy',
	'narrative',
	'fallback'
];

describe('p112 export copy guardrails', () => {
	it('does not use misleading terms in export-facing strings', () => {
		const lower = EXPORT_COPY.toLowerCase();
		for (const w of FORBIDDEN_SUBSTRINGS) {
			expect(lower.includes(w), `unexpected term "${w}" in export copy`).toBe(false);
		}
	});

	it('P112-05: preview/detail copy adjacent to export omits forbidden wording', () => {
		const lower = EXPORT_ADJACENT_SURFACE.toLowerCase();
		for (const w of FORBIDDEN_SUBSTRINGS) {
			expect(lower.includes(w), `unexpected term "${w}" in export-adjacent copy`).toBe(false);
		}
	});

	it('helper ties export to deterministic preview and Case Engine', () => {
		expect(P112_EXPORT_FROM_PREVIEW_HELPER).toMatch(/deterministic/i);
		expect(P112_EXPORT_FROM_PREVIEW_HELPER).toMatch(/Case Engine/);
		expect(P112_EXPORT_FROM_PREVIEW_HELPER.toLowerCase()).toMatch(/read-only|authoritative/);
	});

	it('failure lines are format-specific', () => {
		expect(P112_EXPORT_FAILED_DOCX).toMatch(/DOCX/i);
		expect(P112_EXPORT_FAILED_PDF).toMatch(/PDF/i);
		expect(P112_EXPORT_FAILED_DOCX).not.toContain('PDF');
		expect(P112_EXPORT_FAILED_PDF).not.toContain('DOCX');
	});

	it('success lines stay format-specific and do not imply in-system record creation', () => {
		expect(P111_EXPORT_SUCCESS_DOCX).toMatch(/DOCX/i);
		expect(P111_EXPORT_SUCCESS_PDF).toMatch(/PDF/i);
		expect(P111_EXPORT_SUCCESS_DOCX).not.toContain('PDF');
		expect(P111_EXPORT_SUCCESS_PDF).not.toContain('DOCX');
		expect(P111_EXPORT_SUCCESS_DOCX.toLowerCase()).toMatch(/not added to the case/);
		expect(P111_EXPORT_SUCCESS_PDF.toLowerCase()).toMatch(/not added to the case/);
		expect(P111_EXPORT_SUCCESS_DOCX.toLowerCase()).not.toMatch(/alternate|another format|try pdf|try docx/);
	});
});
