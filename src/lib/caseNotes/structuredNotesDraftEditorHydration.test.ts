import { describe, expect, it } from 'vitest';
import { computeStructuredDraftHydration } from './structuredNotesDraftEditorHydration';

const note = { id: 7, title: 'T1', updated_at: '2026-01-01T00:00:00Z' };

describe('structuredNotesDraftEditorHydration (P34-29)', () => {
	it('empty / whitespace rendered text → empty', () => {
		expect(computeStructuredDraftHydration('create', '', null)).toEqual({
			ok: false,
			reason: 'empty'
		});
		expect(computeStructuredDraftHydration('create', '  \n\t', null)).toEqual({
			ok: false,
			reason: 'empty'
		});
	});

	it('create mode → createText, no persistence implied', () => {
		const plan = computeStructuredDraftHydration('create', 'Line one.\n', null);
		expect(plan).toEqual({ ok: true, branch: 'create', createText: 'Line one.\n' });
	});

	it('edit mode with selected note → editText only', () => {
		const plan = computeStructuredDraftHydration('edit', 'Draft body.', note);
		expect(plan).toEqual({ ok: true, branch: 'edit_existing', editText: 'Draft body.' });
	});

	it('view mode → switch-to-edit plan with title and expected_updated_at', () => {
		const plan = computeStructuredDraftHydration('view', 'X', note);
		expect(plan).toEqual({
			ok: true,
			branch: 'view_to_edit',
			noteId: 7,
			editTitle: 'T1',
			editText: 'X',
			editExpectedUpdatedAt: '2026-01-01T00:00:00Z'
		});
	});

	it('idle / edit without note / view without note → unsupported_mode', () => {
		expect(computeStructuredDraftHydration('idle', 'x', null)).toEqual({
			ok: false,
			reason: 'unsupported_mode'
		});
		expect(computeStructuredDraftHydration('edit', 'x', null)).toEqual({
			ok: false,
			reason: 'unsupported_mode'
		});
		expect(computeStructuredDraftHydration('view', 'x', null)).toEqual({
			ok: false,
			reason: 'unsupported_mode'
		});
	});
});
