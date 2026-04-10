import { describe, it, expect } from 'vitest';
import {
	hrefForSupportLinkTarget,
	isWorkflowSupportLinkStale,
	normalizeSupportLinkTargetIdForLookup,
	primaryLabelForSupportLink,
	savedSupportLinkDisplay,
	secondaryIdLineForSupportLink,
	supportLinkKindShortLabel,
	type SupportLinkSavedDisplay,
	type SupportLinkTargetIndex
} from './workflowSupportLinkDisplay';
import type { WorkflowSupportLink } from '$lib/apis/caseEngine';

function sdLine(
	p: Pick<SupportLinkSavedDisplay, 'primaryLine' | 'secondaryLine' | 'teaser'> &
		Partial<Pick<SupportLinkSavedDisplay, 'previewTitle' | 'previewMeta' | 'previewBody'>>
): SupportLinkSavedDisplay {
	return {
		primaryLine: p.primaryLine,
		secondaryLine: p.secondaryLine,
		teaser: p.teaser,
		previewTitle: p.previewTitle ?? p.primaryLine,
		previewMeta: p.previewMeta ?? p.secondaryLine,
		previewBody: p.previewBody ?? p.teaser
	};
}

describe('workflowSupportLinkDisplay', () => {
	it('hrefForSupportLinkTarget builds timeline hash, notes query, files query', () => {
		expect(hrefForSupportLinkTarget('c1', 'TIMELINE_ENTRY', 'te-1')).toBe(
			'/case/c1/timeline#ce-timeline-entry-te-1'
		);
		expect(hrefForSupportLinkTarget('c1', 'NOTEBOOK_NOTE', '42')).toBe('/case/c1/notes?note=42');
		expect(hrefForSupportLinkTarget('c1', 'CASE_FILE', 'fid')).toBe('/case/c1/files?file=fid');
	});

	it('primaryLabelForSupportLink uses index maps and sensible fallbacks', () => {
		const index: SupportLinkTargetIndex = {
			timeline: new Map([['t1', '2026-04-01 — Hello world']]),
			notes: new Map([['12', 'My title']]),
			files: new Map([['f1', 'report.pdf']])
		};
		const tl: WorkflowSupportLink = {
			id: 'L1',
			workflow_item_id: 'w',
			case_id: 'c',
			target_kind: 'TIMELINE_ENTRY',
			target_id: 't1',
			display_position: 0,
			created_by: 'u',
			created_at: 'x',
			target_availability: 'ACTIVE'
		};
		expect(primaryLabelForSupportLink(tl, index)).toBe('2026-04-01 — Hello world');
		expect(
			primaryLabelForSupportLink(
				{ ...tl, target_id: 'missing', target_kind: 'TIMELINE_ENTRY' },
				index
			)
		).toContain('Timeline entry');
		expect(
			primaryLabelForSupportLink(
				{ ...tl, target_kind: 'NOTEBOOK_NOTE', target_id: '12' },
				index
			)
		).toBe('My title');
		expect(
			primaryLabelForSupportLink(
				{ ...tl, target_kind: 'CASE_FILE', target_id: 'f1' },
				index
			)
		).toBe('report.pdf');
	});

	it('secondaryIdLineForSupportLink adds ID line when primary is a truncated-style label', () => {
		const index: SupportLinkTargetIndex = {
			timeline: new Map(),
			notes: new Map(),
			files: new Map()
		};
		const link: WorkflowSupportLink = {
			id: 'L1',
			workflow_item_id: 'w',
			case_id: 'c',
			target_kind: 'TIMELINE_ENTRY',
			target_id: 'very-long-timeline-id',
			display_position: 0,
			created_by: 'u',
			created_at: 'x',
			target_availability: 'STALE'
		};
		const primary = primaryLabelForSupportLink(link, index);
		const sec = secondaryIdLineForSupportLink(link, index);
		expect(primary).not.toContain('very-long-timeline-id');
		expect(sec).toBe('ID very-long-timeline-id');
	});

	it('secondaryIdLineForSupportLink returns null when primary already includes target id', () => {
		const index: SupportLinkTargetIndex = {
			timeline: new Map([['abc', 'abc summary only']]),
			notes: new Map(),
			files: new Map()
		};
		const link: WorkflowSupportLink = {
			id: 'L1',
			workflow_item_id: 'w',
			case_id: 'c',
			target_kind: 'TIMELINE_ENTRY',
			target_id: 'abc',
			display_position: 0,
			created_by: 'u',
			created_at: 'x',
			target_availability: 'ACTIVE'
		};
		expect(secondaryIdLineForSupportLink(link, index)).toBeNull();
	});

	it('supportLinkKindShortLabel covers MVP kinds', () => {
		expect(supportLinkKindShortLabel.TIMELINE_ENTRY).toBe('Timeline');
		expect(supportLinkKindShortLabel.NOTEBOOK_NOTE).toBe('Note');
		expect(supportLinkKindShortLabel.CASE_FILE).toBe('File');
	});

	it('savedSupportLinkDisplay returns P60-11 lines when index has savedDisplay and link is active', () => {
		const index: SupportLinkTargetIndex = {
			timeline: new Map([['t1', 'primary t1']]),
			notes: new Map(),
			files: new Map(),
			savedDisplay: {
				timeline: new Map([
					[
						't1',
						sdLine({
							primaryLine: 'When · type',
							secondaryLine: 'Loc A · Entry t1',
							teaser: 'Body snippet here',
							previewBody: 'Longer body for expanded preview.'
						})
					]
				]),
				notes: new Map(),
				files: new Map()
			}
		};
		const link: WorkflowSupportLink = {
			id: 'L1',
			workflow_item_id: 'w',
			case_id: 'c',
			target_kind: 'TIMELINE_ENTRY',
			target_id: 't1',
			display_position: 0,
			created_by: 'u',
			created_at: 'x',
			target_availability: 'ACTIVE'
		};
		const d = savedSupportLinkDisplay(link, index);
		expect(d?.primaryLine).toBe('When · type');
		expect(d?.secondaryLine).toContain('Loc A');
		expect(d?.teaser).toContain('snippet');
		expect(d?.previewBody).toContain('Longer body');
	});

	it('savedSupportLinkDisplay is null for STALE or missing target', () => {
		const index: SupportLinkTargetIndex = {
			timeline: new Map(),
			notes: new Map(),
			files: new Map(),
			savedDisplay: {
				timeline: new Map([['gone', sdLine({ primaryLine: 'a', secondaryLine: 'b', teaser: 'c' })]]),
				notes: new Map(),
				files: new Map()
			}
		};
		const stale: WorkflowSupportLink = {
			id: 'L1',
			workflow_item_id: 'w',
			case_id: 'c',
			target_kind: 'TIMELINE_ENTRY',
			target_id: 'gone',
			display_position: 0,
			created_by: 'u',
			created_at: 'x',
			target_availability: 'STALE'
		};
		expect(savedSupportLinkDisplay(stale, index)).toBeNull();
		const missing: WorkflowSupportLink = { ...stale, target_availability: 'ACTIVE', target_id: 'nope' };
		expect(savedSupportLinkDisplay(missing, index)).toBeNull();
	});

	it('secondaryIdLineForSupportLink skips duplicate ID line when savedSupportLinkDisplay is present', () => {
		const index: SupportLinkTargetIndex = {
			timeline: new Map([['t1', 'prim']]),
			notes: new Map(),
			files: new Map(),
			savedDisplay: {
				timeline: new Map([['t1', sdLine({ primaryLine: 'p', secondaryLine: 'has id already', teaser: 'x' })]]),
				notes: new Map(),
				files: new Map()
			}
		};
		const link: WorkflowSupportLink = {
			id: 'L1',
			workflow_item_id: 'w',
			case_id: 'c',
			target_kind: 'TIMELINE_ENTRY',
			target_id: 't1',
			display_position: 0,
			created_by: 'u',
			created_at: 'x',
			target_availability: 'ACTIVE'
		};
		expect(secondaryIdLineForSupportLink(link, index)).toBeNull();
	});
});

describe('workflowSupportLinkDisplay P60-12 rich wiring', () => {
	const richIndex = (): SupportLinkTargetIndex => ({
		timeline: new Map([['te-1', 'lbl t']]),
		notes: new Map([['7', 'lbl n']]),
		files: new Map([['f-1', 'lbl f']]),
		savedDisplay: {
			timeline: new Map([
				[
					'te-1',
					sdLine({
						primaryLine: 'T primary',
						secondaryLine: 'T meta',
						teaser: 'T snip',
						previewTitle: 'T preview title',
						previewMeta: 'T\nmeta',
						previewBody: 'T long excerpt'
					})
				]
			]),
			notes: new Map([
				[
					'7',
					sdLine({
						primaryLine: 'N primary',
						secondaryLine: 'N meta',
						teaser: 'N snip',
						previewBody: 'Note full text line one.\nLine two.'
					})
				]
			]),
			files: new Map([
				[
					'f-1',
					sdLine({
						primaryLine: 'F primary',
						secondaryLine: 'F meta',
						teaser: 'F snip',
						previewBody: 'File list does not include extracted text.'
					})
				]
			])
		}
	});

	it('savedSupportLinkDisplay resolves active timeline, note, and file rows from savedDisplay', () => {
		const idx = richIndex();
		const tl: WorkflowSupportLink = {
			id: 'L1',
			workflow_item_id: 'w',
			case_id: 'c',
			target_kind: 'TIMELINE_ENTRY',
			target_id: 'te-1',
			display_position: 0,
			created_by: 'u',
			created_at: 'x',
			target_availability: 'ACTIVE'
		};
		expect(savedSupportLinkDisplay(tl, idx)?.primaryLine).toBe('T primary');
		const n: WorkflowSupportLink = { ...tl, target_kind: 'NOTEBOOK_NOTE', target_id: '7' };
		expect(savedSupportLinkDisplay(n, idx)?.teaser).toBe('N snip');
		const f: WorkflowSupportLink = { ...tl, target_kind: 'CASE_FILE', target_id: 'f-1' };
		expect(savedSupportLinkDisplay(f, idx)?.secondaryLine).toBe('F meta');
		expect(savedSupportLinkDisplay(tl, idx)?.previewMeta).toContain('meta');
		expect(savedSupportLinkDisplay(n, idx)?.previewBody).toContain('Line two');
	});

	it('normalizes notebook target_id from numeric JSON and leading zeros', () => {
		const idx = richIndex();
		const base: WorkflowSupportLink = {
			id: 'L1',
			workflow_item_id: 'w',
			case_id: 'c',
			target_kind: 'NOTEBOOK_NOTE',
			target_id: '7',
			display_position: 0,
			created_by: 'u',
			created_at: 'x',
			target_availability: 'ACTIVE'
		};
		expect(normalizeSupportLinkTargetIdForLookup('NOTEBOOK_NOTE', 7)).toBe('7');
		expect(normalizeSupportLinkTargetIdForLookup('NOTEBOOK_NOTE', '007')).toBe('7');
		expect(savedSupportLinkDisplay({ ...base, target_id: '007' as unknown as string }, idx)?.primaryLine).toBe(
			'N primary'
		);
		const numLink = { ...base, target_id: 7 as unknown as string };
		expect(savedSupportLinkDisplay(numLink, idx)?.primaryLine).toBe('N primary');
	});

	it('treats case-insensitive stale and returns null for rich display', () => {
		const idx = richIndex();
		const link: WorkflowSupportLink = {
			id: 'L1',
			workflow_item_id: 'w',
			case_id: 'c',
			target_kind: 'TIMELINE_ENTRY',
			target_id: 'te-1',
			display_position: 0,
			created_by: 'u',
			created_at: 'x',
			target_availability: 'stale'
		};
		expect(isWorkflowSupportLinkStale(link)).toBe(true);
		expect(savedSupportLinkDisplay(link, idx)).toBeNull();
	});

	it('falls back to null rich display when target is missing from maps', () => {
		const idx = richIndex();
		const link: WorkflowSupportLink = {
			id: 'L1',
			workflow_item_id: 'w',
			case_id: 'c',
			target_kind: 'TIMELINE_ENTRY',
			target_id: 'absent',
			display_position: 0,
			created_by: 'u',
			created_at: 'x',
			target_availability: 'ACTIVE'
		};
		expect(savedSupportLinkDisplay(link, idx)).toBeNull();
	});

	it('hrefForSupportLinkTarget normalizes notebook ids in the query string', () => {
		expect(hrefForSupportLinkTarget('c1', 'NOTEBOOK_NOTE', '007')).toBe('/case/c1/notes?note=7');
	});
});
