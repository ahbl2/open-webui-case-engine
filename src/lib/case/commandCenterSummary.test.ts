/**
 * P131.5-02 — Explicit summary counts only (auditable derivation).
 */
import { describe, expect, it } from 'vitest';
import {
	countActivityRows,
	countCasesInScope,
	countOpenCases,
	sumWorkflowItemCounts
} from '$lib/case/commandCenterSummary';
import type { CommandCenterActivityRow } from '$lib/case/commandCenterActivity';
import type { CommandCenterCaseRow } from '$lib/case/commandCenterCases';
import type { CommandCenterWorkflowRow } from '$lib/case/commandCenterWorkflow';

function caseRow(status: string): CommandCenterCaseRow {
	return {
		case_id: 'a',
		case_number: '1',
		title: 't',
		unit: 'CID',
		status,
		last_timeline_entry_occurred_at: null
	};
}

describe('commandCenterSummary P131.5-02', () => {
	it('countCasesInScope is row length', () => {
		expect(countCasesInScope([])).toBe(0);
		expect(countCasesInScope([caseRow('OPEN'), caseRow('CLOSED')])).toBe(2);
	});

	it('countOpenCases matches explicit OPEN only', () => {
		expect(countOpenCases([])).toBe(0);
		expect(countOpenCases([caseRow('OPEN')])).toBe(1);
		expect(countOpenCases([caseRow('open')])).toBe(0);
		expect(countOpenCases([caseRow('OPEN '), caseRow('OPEN')])).toBe(2);
	});

	it('countActivityRows is activity row length', () => {
		const r: CommandCenterActivityRow = {
			event_id: 'e',
			case_id: 'c',
			case_identifier: 'x',
			actor_user_id: 'u',
			event_type: 't',
			occurred_at: '2020-01-01T00:00:00Z'
		};
		expect(countActivityRows([])).toBe(0);
		expect(countActivityRows([r, r])).toBe(2);
	});

	it('sumWorkflowItemCounts sums total_count', () => {
		const a: CommandCenterWorkflowRow = {
			case_id: '1',
			case_identifier: 'x',
			total_count: 2,
			status_tallies: { OPEN: 2 }
		};
		const b: CommandCenterWorkflowRow = {
			case_id: '2',
			case_identifier: 'y',
			total_count: 3,
			status_tallies: {}
		};
		expect(sumWorkflowItemCounts([])).toBe(0);
		expect(sumWorkflowItemCounts([a, b])).toBe(5);
	});
});
