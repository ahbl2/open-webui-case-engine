/**
 * P99-03 — Deterministic return navigation (no history.back, no storage).
 */
import { describe, it, expect, vi } from 'vitest';
import {
	arrivalReturnAriaLabel,
	navigateArrivalReturnToSource,
	P99_RETURN_ACTION_LABEL
} from './p99ArrivalReturnNavigation';
import type { ArrivalContext } from './p99ArrivalContextReadModel';
import { ARRIVAL_UI_COPY } from './p99ArrivalContextReadModel';

function mockCtx(partial: Partial<ArrivalContext> & Pick<ArrivalContext, 'source_kind' | 'source_id'>): ArrivalContext {
	return {
		v: 1,
		case_id: 'c1',
		is_valid: true,
		is_returnable: true,
		target_kind: 'case_task',
		target_id: 't2',
		arrived_via: 'declared_relationship',
		source_echo: null,
		heading: 'h',
		subline: 's',
		...partial
	} as ArrivalContext;
}

describe('p99ArrivalReturnNavigation', () => {
	it('does not call goto when not returnable or invalid', async () => {
		const goto = vi.fn();
		await navigateArrivalReturnToSource(mockCtx({ is_valid: true, is_returnable: false, source_kind: 'timeline_entry', source_id: 'e1' }), goto);
		await navigateArrivalReturnToSource(mockCtx({ is_valid: false, is_returnable: true, source_kind: 'timeline_entry', source_id: 'e1' }), goto);
		expect(goto).not.toHaveBeenCalled();
	});

	it('routes timeline_entry origin via Phase 97 goto + intent state (no history)', async () => {
		const goto = vi.fn(async () => {});
		await navigateArrivalReturnToSource(
			mockCtx({
				is_valid: true,
				is_returnable: true,
				source_kind: 'timeline_entry',
				source_id: 'e9'
			}),
			goto
		);
		expect(goto).toHaveBeenCalledTimes(1);
		const tuple = goto.mock.calls[0] as unknown as [string, { state?: unknown }];
		const path = tuple[0];
		const opts = tuple[1];
		expect(path).toBe('/case/c1/timeline');
		expect(opts?.state).toMatchObject({
			synthesisSourceNavigationIntent: expect.objectContaining({
				source_kind: 'timeline_entry',
				source_record_id: 'e9',
				destination_surface: 'timeline'
			})
		});
	});

	it('routes notebook_note origin via narrow ?note= URL (not synthesis intent)', async () => {
		const goto = vi.fn(async () => {});
		await navigateArrivalReturnToSource(
			mockCtx({
				is_valid: true,
				is_returnable: true,
				source_kind: 'notebook_note',
				source_id: 'n1',
				target_kind: 'case_file',
				target_id: 'f1'
			}),
			goto
		);
		expect(goto).toHaveBeenCalledWith('/case/c1/notes?note=n1', { noScroll: false });
	});

	it('arrivalReturnAriaLabel uses contract labels only', () => {
		const a = mockCtx({
			is_valid: true,
			is_returnable: true,
			source_kind: 'case_task',
			source_id: 't9'
		});
		expect(arrivalReturnAriaLabel(a)).toBe(`${P99_RETURN_ACTION_LABEL} · ${ARRIVAL_UI_COPY.targetTask} · t9`);
	});
});
