/**
 * P119/P120 export request body builder.
 */
import { describe, it, expect } from 'vitest';
import { buildP119ExportRequestBody } from './caseExportP119RequestBody';
import { CASE_EXPORT_P120_TEMPLATE_IDS } from './caseExportP120Template';

describe('buildP119ExportRequestBody', () => {
	it('omits template for P119-only plain text (default)', () => {
		const b = buildP119ExportRequestBody({
			includeNotes: false,
			includeWorkflow: false,
			includeRelationships: false,
			format: 'plain_text'
		});
		expect(b.template).toBeUndefined();
		expect(b.format).toBe('plain_text');
		expect(b.inclusion).toEqual({});
	});

	it('includes template when Phase 120 mode is set (plain text)', () => {
		const b = buildP119ExportRequestBody({
			includeNotes: true,
			includeWorkflow: false,
			includeRelationships: false,
			format: 'plain_text',
			phase120Mode: 'RAW_EXPORT'
		});
		expect(b.template).toBe('RAW_EXPORT');
	});

	it('never includes template for JSON', () => {
		const b = buildP119ExportRequestBody({
			includeNotes: true,
			includeWorkflow: false,
			includeRelationships: false,
			format: 'json',
			phase120Mode: 'CHRONOLOGICAL_REPORT'
		});
		expect(b.template).toBeUndefined();
	});

	it('supported template ids match closed backend set', () => {
		expect(CASE_EXPORT_P120_TEMPLATE_IDS).toEqual([
			'RAW_EXPORT',
			'CHRONOLOGICAL_REPORT',
			'TIMELINE_WITH_NOTES'
		]);
	});
});
