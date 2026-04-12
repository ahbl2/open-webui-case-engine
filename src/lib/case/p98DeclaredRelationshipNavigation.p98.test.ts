/**
 * P98-04 / P98-05 — Declared relationship navigation: Phase 97 reuse, same-case only, no inference.
 */
import { describe, it, expect, vi } from 'vitest';
import type { P98DeclaredRelationshipRow } from '$lib/case/p98DeclaredRelationshipPresentation';
import {
	buildSynthesisIntentForDeclaredTarget,
	navigateFromDeclaredRelationshipRow
} from './p98DeclaredRelationshipNavigation';
import { P98_DECLARED_NAVIGATE_ARIA_LABEL_BY_KIND } from './p98DeclaredRelationshipPresentation';
import { containsForbiddenRelationshipDisplayTerm } from './caseRecordRelationshipReadModel';

function row(partial: Partial<P98DeclaredRelationshipRow> & Pick<P98DeclaredRelationshipRow, 'target_kind' | 'target_id' | 'navigable'>): P98DeclaredRelationshipRow {
	return {
		relationship_key: 'k',
		primaryLine: 'line',
		availabilityNote: null,
		...partial
	} as P98DeclaredRelationshipRow;
}

describe('p98DeclaredRelationshipNavigation (P98-04 / P98-05)', () => {
	const origin = { kind: 'case_task' as const, id: 'task-origin' };

	it('buildSynthesisIntentForDeclaredTarget matches Phase 97 pickers (timeline / task / file)', () => {
		const t = buildSynthesisIntentForDeclaredTarget('c1', 'timeline_entry', 'e1');
		expect(t).toEqual({
			v: 1,
			case_id: 'c1',
			authority: 'authoritative',
			source_kind: 'timeline_entry',
			source_record_id: 'e1',
			destination_surface: 'timeline'
		});
		const task = buildSynthesisIntentForDeclaredTarget('c1', 'case_task', 't1');
		expect(task?.source_kind).toBe('task');
		expect(task?.destination_surface).toBe('tasks');
		const f = buildSynthesisIntentForDeclaredTarget('c1', 'case_file', 'f1');
		expect(f?.source_kind).toBe('case_file');
		expect(f?.destination_surface).toBe('files');
		expect(buildSynthesisIntentForDeclaredTarget('c1', 'notebook_note', 'n1')).toBeNull();
	});

	it('navigateFromDeclaredRelationshipRow is a no-op when not navigable', async () => {
		const goto = vi.fn();
		await navigateFromDeclaredRelationshipRow(goto, 'c1', row({ navigable: false, target_kind: 'case_file', target_id: 'f1' }), origin);
		expect(goto).not.toHaveBeenCalled();
	});

	it('navigates to Files with synthesis state for supporting file target', async () => {
		const goto = vi.fn(async () => {});
		await navigateFromDeclaredRelationshipRow(
			goto,
			'case-1',
			row({ navigable: true, target_kind: 'case_file', target_id: 'file-a' }),
			origin
		);
		expect(goto).toHaveBeenCalledTimes(1);
		const tuple = goto.mock.calls[0] as unknown as [string, { state?: unknown; noScroll?: boolean }];
		const path = tuple[0];
		const opts = tuple[1];
		expect(path).toBe('/case/case-1/files');
		expect(opts).toMatchObject({
			state: {
				synthesisSourceNavigationIntent: expect.objectContaining({ source_record_id: 'file-a' }),
				p98DeclaredRelationshipOrigin: origin
			}
		});
	});

	it('navigates to Notes with query for notebook_note (no synthesis state)', async () => {
		const goto = vi.fn(async () => {});
		await navigateFromDeclaredRelationshipRow(
			goto,
			'case-1',
			row({ navigable: true, target_kind: 'notebook_note', target_id: 'note-x' }),
			origin
		);
		expect(goto).toHaveBeenCalledWith('/case/case-1/notes?note=note-x', {
			noScroll: false,
			state: { p98DeclaredRelationshipOrigin: origin }
		});
	});

	it('all navigate aria labels pass P98-01 forbidden copy guard', () => {
		for (const s of Object.values(P98_DECLARED_NAVIGATE_ARIA_LABEL_BY_KIND)) {
			expect(containsForbiddenRelationshipDisplayTerm(s)).toBe(false);
		}
	});
});
