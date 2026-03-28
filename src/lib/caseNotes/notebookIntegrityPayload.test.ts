import { describe, expect, it } from 'vitest';
import { mergeNotebookWritePayload } from './notebookIntegrityPayload';

describe('P31-02 mergeNotebookWritePayload', () => {
	it('omits integrity_baseline_text when baseline is null', () => {
		expect(mergeNotebookWritePayload({ title: 'T', text: 'Body' }, null)).toEqual({
			title: 'T',
			text: 'Body'
		});
	});

	it('omits integrity_baseline_text when baseline equals trimmed text', () => {
		expect(mergeNotebookWritePayload({ title: 'T', text: '  Same  ' }, 'Same')).toEqual({
			title: 'T',
			text: '  Same  '
		});
	});

	it('includes integrity_baseline_text when baseline differs from trimmed text', () => {
		expect(
			mergeNotebookWritePayload({ title: 'T', text: 'Enhanced', expected_updated_at: 'ts' }, 'Before')
		).toEqual({
			title: 'T',
			text: 'Enhanced',
			expected_updated_at: 'ts',
			integrity_baseline_text: 'Before'
		});
	});

	it('omits empty or whitespace-only baseline', () => {
		expect(mergeNotebookWritePayload({ title: 'T', text: 'X' }, '   ')).toEqual({
			title: 'T',
			text: 'X'
		});
	});
});
