import { describe, expect, it, vi } from 'vitest';

import {
	navigateCaseUnderstandingTraceContributor,
	openTraceContributorAriaLabel,
	traceContributorSurfaceLabel
} from '$lib/case/p100CaseUnderstandingNavigation';

describe('p100CaseUnderstandingNavigation (P100-04)', () => {
	it('navigates timeline with synthesis state', async () => {
		const goto = vi.fn().mockResolvedValue(undefined);
		await navigateCaseUnderstandingTraceContributor('c1', 'timeline_entry', 'e9', goto);
		expect(goto).toHaveBeenCalledWith('/case/c1/timeline', {
			state: {
				synthesisSourceNavigationIntent: expect.objectContaining({
					case_id: 'c1',
					source_kind: 'timeline_entry',
					source_record_id: 'e9',
					destination_surface: 'timeline'
				})
			}
		});
	});

	it('navigates notebook with note query', async () => {
		const goto = vi.fn().mockResolvedValue(undefined);
		await navigateCaseUnderstandingTraceContributor('c1', 'notebook_note', '42', goto);
		expect(goto).toHaveBeenCalledWith('/case/c1/notes?note=42');
	});

	it('traceContributorSurfaceLabel is factual', () => {
		expect(traceContributorSurfaceLabel('timeline_entry')).toBe('Timeline');
		expect(traceContributorSurfaceLabel('case_task')).toBe('Tasks');
	});

	it('openTraceContributorAriaLabel includes surface and id', () => {
		expect(openTraceContributorAriaLabel('case_task', 't-1')).toBe('Open Tasks record t-1');
	});
});
