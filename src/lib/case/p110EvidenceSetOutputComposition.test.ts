import { describe, expect, it } from 'vitest';
import type { CaseEngineEvidenceSetExpanded } from '$lib/apis/caseEngine/evidenceSetsApi';
import {
	composeDeterministicEvidenceSetOutput,
	P110_COMPOSITION_RULES_VERSION,
	serializeDeterministicPlainTextOutput,
	sortFilesDeterministic,
	sortMembershipDeterministic,
	sortTimelineEntriesDeterministic
} from './p110EvidenceSetOutputComposition';

function sampleExpanded(): CaseEngineEvidenceSetExpanded {
	return {
		evidence_set: {
			id: 'set-1',
			case_id: 'case-a',
			name: 'Bundle',
			created_at: '2020-01-01T00:00:00.000Z',
			created_by: 'u1'
		},
		timeline_entries: [
			{
				source_id: 't-late',
				occurred_at: '2020-02-01T00:00:00.000Z',
				created_at: '2020-02-01T00:00:00.000Z',
				created_by: 'u1',
				type: 'OBSERVATION',
				text_original: 'second'
			},
			{
				source_id: 't-early',
				occurred_at: '2020-01-01T00:00:00.000Z',
				created_at: '2020-01-01T00:00:00.000Z',
				created_by: 'u1',
				type: 'OBSERVATION',
				text_original: 'first'
			},
			{
				source_id: 't-tie-b',
				occurred_at: '2020-01-15T12:00:00.000Z',
				created_at: '2020-01-15T12:00:00.000Z',
				created_by: 'u1',
				type: 'OBSERVATION',
				text_original: 'b'
			},
			{
				source_id: 't-tie-a',
				occurred_at: '2020-01-15T12:00:00.000Z',
				created_at: '2020-01-15T12:00:00.000Z',
				created_by: 'u1',
				type: 'OBSERVATION',
				text_original: 'a'
			}
		],
		files: [
			{
				source_id: 'f-b',
				original_filename: 'b.pdf',
				mime_type: 'application/pdf',
				uploaded_by: 'u1',
				uploaded_at: '2020-03-01T00:00:00.000Z',
				created_at: '2020-03-01T00:00:00.000Z'
			},
			{
				source_id: 'f-a',
				original_filename: 'a.pdf',
				mime_type: 'application/pdf',
				uploaded_by: 'u1',
				uploaded_at: '2020-03-02T00:00:00.000Z',
				created_at: '2020-03-02T00:00:00.000Z'
			}
		],
		membership: [
			{ item_kind: 'file', source_id: 'f-b' },
			{ item_kind: 'timeline_entry', source_id: 't-early' },
			{ item_kind: 'timeline_entry', source_id: 't-late' }
		]
	};
}

describe('p110EvidenceSetOutputComposition', () => {
	it('exposes a stable rules version', () => {
		expect(P110_COMPOSITION_RULES_VERSION).toBe(1);
	});

	it('sorts timeline by occurred_at then source_id', () => {
		const s = sampleExpanded();
		const t = sortTimelineEntriesDeterministic(s.timeline_entries);
		expect(t.map((x) => x.source_id)).toEqual(['t-early', 't-tie-a', 't-tie-b', 't-late']);
	});

	it('sorts files by source_id', () => {
		const s = sampleExpanded();
		const f = sortFilesDeterministic(s.files);
		expect(f.map((x) => x.source_id)).toEqual(['f-a', 'f-b']);
	});

	it('sorts membership by kind then source_id', () => {
		const s = sampleExpanded();
		const m = sortMembershipDeterministic(s.membership);
		expect(m).toEqual([
			{ item_kind: 'file', source_id: 'f-b' },
			{ item_kind: 'timeline_entry', source_id: 't-early' },
			{ item_kind: 'timeline_entry', source_id: 't-late' }
		]);
	});

	it('composeDeterministicEvidenceSetOutput is idempotent', () => {
		const raw = sampleExpanded();
		const once = composeDeterministicEvidenceSetOutput(raw);
		const twice = composeDeterministicEvidenceSetOutput(once);
		expect(twice).toEqual(once);
	});

	it('composeDeterministicEvidenceSetOutput fixes shuffled server arrays', () => {
		const raw = sampleExpanded();
		const shuffled: CaseEngineEvidenceSetExpanded = {
			...raw,
			timeline_entries: [...raw.timeline_entries].reverse(),
			files: [...raw.files].reverse(),
			membership: [...raw.membership].reverse()
		};
		const composed = composeDeterministicEvidenceSetOutput(shuffled);
		expect(composed).toEqual(composeDeterministicEvidenceSetOutput(raw));
	});

	it('serializeDeterministicPlainTextOutput is stable and preserves text_original newlines', () => {
		const raw = sampleExpanded();
		raw.timeline_entries[0].text_original = 'line1\nline2';
		const a = serializeDeterministicPlainTextOutput(raw);
		const b = serializeDeterministicPlainTextOutput(raw);
		expect(a).toBe(b);
		expect(a).toContain('line1\nline2');
		expect(a).toContain('[timeline]');
		expect(a).toContain('[files]');
		expect(a).toContain('[membership]');
	});
});
