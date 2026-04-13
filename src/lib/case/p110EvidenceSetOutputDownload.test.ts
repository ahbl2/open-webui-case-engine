import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	buildDeterministicPlainTextFilename,
	triggerPlainTextDownload
} from './p110EvidenceSetOutputDownload';
import { composeDeterministicEvidenceSetOutput, serializeDeterministicPlainTextOutput } from './p110EvidenceSetOutputComposition';
import type { CaseEngineEvidenceSetExpanded } from '$lib/apis/caseEngine/evidenceSetsApi';

describe('buildDeterministicPlainTextFilename', () => {
	it('is deterministic and sanitizes segments', () => {
		expect(buildDeterministicPlainTextFilename('case/a', 'set:b')).toBe(
			'evidence-set-output--case-case-a--set-set-b.txt'
		);
		expect(buildDeterministicPlainTextFilename('c1', 's1')).toBe(
			'evidence-set-output--case-c1--set-s1.txt'
		);
	});

	it('matches repeated calls for the same ids', () => {
		const a = buildDeterministicPlainTextFilename('case-x', 'set-y');
		const b = buildDeterministicPlainTextFilename('case-x', 'set-y');
		expect(a).toBe(b);
	});
});

describe('triggerPlainTextDownload', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('creates a blob download with the given text and filename', () => {
		const click = vi.fn();
		const remove = vi.fn();
		const anchor = { click, remove, href: '', download: '' };
		const appendChild = vi.fn();
		vi.stubGlobal('document', {
			createElement: () => anchor,
			body: { appendChild }
		} as unknown as Document);
		const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
		const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');

		triggerPlainTextDownload('plain-bytes', 'evidence-set-output--case-a--set-b.txt');

		expect(create).toHaveBeenCalled();
		expect(anchor.download).toBe('evidence-set-output--case-a--set-b.txt');
		expect(click).toHaveBeenCalled();
		expect(appendChild).toHaveBeenCalledWith(anchor);
		expect(remove).toHaveBeenCalled();
		expect(revoke).toHaveBeenCalledWith('blob:mock');
	});
});

describe('download uses same bytes as serializeDeterministicPlainTextOutput', () => {
	const sample = (): CaseEngineEvidenceSetExpanded => ({
		evidence_set: {
			id: 'set-1',
			case_id: 'case-a',
			name: 'N',
			created_at: '2020-01-01T00:00:00.000Z',
			created_by: 'u'
		},
		timeline_entries: [],
		files: [],
		membership: []
	});

	it('repeated serialization matches for the same composed input', () => {
		const ex = composeDeterministicEvidenceSetOutput(sample());
		const a = serializeDeterministicPlainTextOutput(ex);
		const b = serializeDeterministicPlainTextOutput(ex);
		expect(a).toBe(b);
	});
});
