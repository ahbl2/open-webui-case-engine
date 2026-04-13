import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	evidenceSelection,
	ensureEvidenceSelectionCaseScope,
	toggleEvidenceSelection,
	clearEvidenceSelection,
	isEvidenceSelected,
	evidenceSelectionCounts,
	evidenceSelectionKey,
	evidenceSelectionToCreateItems,
	parseEvidenceSelectionKey,
	pruneEvidenceSelectionAfterTimelineSync,
	pruneEvidenceSelectionAfterFilesSync,
	removeEvidenceSelectionKey
} from './p109EvidenceSelection';

describe('p109EvidenceSelection', () => {
	beforeEach(() => {
		evidenceSelection.set({ caseId: '', selected: {} });
	});

	it('ensureEvidenceSelectionCaseScope clears selection when case changes', () => {
		ensureEvidenceSelectionCaseScope('case-a');
		toggleEvidenceSelection('timeline_entry', 'e1', 'case-a');
		expect(get(evidenceSelection).caseId).toBe('case-a');
		expect(isEvidenceSelected(get(evidenceSelection), 'timeline_entry', 'e1')).toBe(true);

		ensureEvidenceSelectionCaseScope('case-b');
		const s = get(evidenceSelection);
		expect(s.caseId).toBe('case-b');
		expect(evidenceSelectionCounts(s).total).toBe(0);
		expect(isEvidenceSelected(s, 'timeline_entry', 'e1')).toBe(false);
	});

	it('toggleEvidenceSelection adds and removes deterministically', () => {
		ensureEvidenceSelectionCaseScope('c1');
		toggleEvidenceSelection('timeline_entry', 't1', 'c1');
		toggleEvidenceSelection('file', 'f1', 'c1');
		let s = get(evidenceSelection);
		expect(evidenceSelectionCounts(s)).toEqual({ total: 2, timeline: 1, files: 1 });
		expect(s.selected[evidenceSelectionKey('timeline_entry', 't1')]).toBe(true);
		expect(s.selected[evidenceSelectionKey('file', 'f1')]).toBe(true);

		toggleEvidenceSelection('timeline_entry', 't1', 'c1');
		s = get(evidenceSelection);
		expect(evidenceSelectionCounts(s)).toEqual({ total: 1, timeline: 0, files: 1 });
	});

	it('clearEvidenceSelection empties keys but keeps caseId', () => {
		ensureEvidenceSelectionCaseScope('c1');
		toggleEvidenceSelection('file', 'f1', 'c1');
		clearEvidenceSelection();
		const s = get(evidenceSelection);
		expect(s.caseId).toBe('c1');
		expect(evidenceSelectionCounts(s).total).toBe(0);
	});

	it('toggleEvidenceSelection rescopes when case id mismatches store', () => {
		ensureEvidenceSelectionCaseScope('c1');
		toggleEvidenceSelection('timeline_entry', 'a', 'c1');
		toggleEvidenceSelection('file', 'b', 'c2');
		const s = get(evidenceSelection);
		expect(s.caseId).toBe('c2');
		expect(evidenceSelectionCounts(s).total).toBe(1);
		expect(isEvidenceSelected(s, 'file', 'b')).toBe(true);
		expect(isEvidenceSelected(s, 'timeline_entry', 'a')).toBe(false);
	});

	it('evidenceSelectionToCreateItems maps keys to sorted create payload', () => {
		const selected: Record<string, true> = {
			[evidenceSelectionKey('file', 'f2')]: true,
			[evidenceSelectionKey('timeline_entry', 't1')]: true,
			[evidenceSelectionKey('file', 'f1')]: true
		};
		const items = evidenceSelectionToCreateItems(selected);
		expect(items).toEqual([
			{ kind: 'file', source_id: 'f1' },
			{ kind: 'file', source_id: 'f2' },
			{ kind: 'timeline_entry', source_id: 't1' }
		]);
	});

	it('parseEvidenceSelectionKey parses timeline and file keys', () => {
		expect(parseEvidenceSelectionKey('timeline_entry:abc')).toEqual({
			kind: 'timeline_entry',
			id: 'abc',
			case_id: ''
		});
		expect(parseEvidenceSelectionKey('file:x-y')).toEqual({
			kind: 'file',
			id: 'x-y',
			case_id: ''
		});
		expect(parseEvidenceSelectionKey('bad')).toBe(null);
	});

	it('pruneEvidenceSelectionAfterTimelineSync drops deleted-in-view and stale ids when corpus is complete', () => {
		ensureEvidenceSelectionCaseScope('c1');
		toggleEvidenceSelection('timeline_entry', 'gone', 'c1');
		toggleEvidenceSelection('timeline_entry', 'del', 'c1');
		toggleEvidenceSelection('timeline_entry', 'keep', 'c1');
		pruneEvidenceSelectionAfterTimelineSync(
			'c1',
			[{ id: 'keep', deleted_at: null }, { id: 'del', deleted_at: '2020-01-01T00:00:00.000Z' }],
			false
		);
		const s = get(evidenceSelection);
		expect(isEvidenceSelected(s, 'timeline_entry', 'keep')).toBe(true);
		expect(isEvidenceSelected(s, 'timeline_entry', 'del')).toBe(false);
		expect(isEvidenceSelected(s, 'timeline_entry', 'gone')).toBe(false);
	});

	it('pruneEvidenceSelectionAfterTimelineSync keeps unknown ids while pagination is incomplete', () => {
		ensureEvidenceSelectionCaseScope('c1');
		toggleEvidenceSelection('timeline_entry', 'page2', 'c1');
		pruneEvidenceSelectionAfterTimelineSync('c1', [{ id: 'a', deleted_at: null }], true);
		expect(isEvidenceSelected(get(evidenceSelection), 'timeline_entry', 'page2')).toBe(true);
	});

	it('removeEvidenceSelectionKey drops one key', () => {
		ensureEvidenceSelectionCaseScope('c1');
		toggleEvidenceSelection('file', 'x', 'c1');
		removeEvidenceSelectionKey('file', 'x', 'c1');
		expect(evidenceSelectionCounts(get(evidenceSelection)).files).toBe(0);
	});

	it('pruneEvidenceSelectionAfterFilesSync matches file list contract', () => {
		ensureEvidenceSelectionCaseScope('c1');
		toggleEvidenceSelection('file', 'missing', 'c1');
		pruneEvidenceSelectionAfterFilesSync('c1', [{ id: 'f1', deleted_at: null }], false);
		expect(isEvidenceSelected(get(evidenceSelection), 'file', 'missing')).toBe(false);
	});
});
