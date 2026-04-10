/**
 * P43-05 — document-ingest edit dirty detection (I-01).
 */
import { describe, expect, it } from 'vitest';
import {
	documentIngestEditFieldsFromPayload,
	documentIngestEditsEqual,
	isDocumentIngestEditDirtyForProposal,
	type DocumentIngestEditFields
} from './proposalDocumentIngestEditGuard';

describe('proposalDocumentIngestEditGuard (P43-05)', () => {
	const basePayload = (): Record<string, unknown> => ({
		_ce_document_timeline_intake: true,
		occurred_at: '2024-06-01T14:00:00.000Z',
		type: 'OBSERVATION',
		text_original: 'hello',
		text_cleaned: 'hello',
		occurred_at_confidence: 'high',
		operator_occurred_at_confirmed: false
	});

	it('documentIngestEditFieldsFromPayload returns null for non–document-ingest', () => {
		expect(documentIngestEditFieldsFromPayload({})).toBeNull();
		expect(documentIngestEditFieldsFromPayload({ _ce_document_timeline_intake: false })).toBeNull();
	});

	it('unchanged editor state matches server snapshot → not dirty', () => {
		const pl = basePayload();
		const edit = documentIngestEditFieldsFromPayload(pl)!;
		const proposal = {
			proposal_type: 'timeline',
			proposed_payload: JSON.stringify(pl)
		};
		expect(isDocumentIngestEditDirtyForProposal(edit, proposal)).toBe(false);
	});

	it('changed text_cleaned vs server → dirty', () => {
		const pl = basePayload();
		const edit = documentIngestEditFieldsFromPayload(pl)!;
		const dirtyEdit: DocumentIngestEditFields = { ...edit, text_cleaned: 'changed' };
		const proposal = {
			proposal_type: 'timeline',
			proposed_payload: JSON.stringify(pl)
		};
		expect(isDocumentIngestEditDirtyForProposal(dirtyEdit, proposal)).toBe(true);
	});

	it('documentIngestEditsEqual is field-wise', () => {
		const a = documentIngestEditFieldsFromPayload(basePayload())!;
		const b = { ...a };
		expect(documentIngestEditsEqual(a, b)).toBe(true);
		expect(documentIngestEditsEqual(a, { ...b, type: 'OTHER' })).toBe(false);
	});

	it('invalid proposed_payload JSON → dirty (fail-safe)', () => {
		const pl = basePayload();
		const edit = documentIngestEditFieldsFromPayload(pl)!;
		expect(
			isDocumentIngestEditDirtyForProposal(edit, {
				proposal_type: 'timeline',
				proposed_payload: 'not-json'
			})
		).toBe(true);
	});

	it('note proposal carrier → not dirty (guard returns false)', () => {
		const pl = basePayload();
		const edit = documentIngestEditFieldsFromPayload(pl)!;
		expect(
			isDocumentIngestEditDirtyForProposal(edit, {
				proposal_type: 'note',
				proposed_payload: JSON.stringify(pl)
			})
		).toBe(false);
	});
});
