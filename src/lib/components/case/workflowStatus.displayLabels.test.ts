/**
 * P57-04 — Human-readable workflow display labels (transport enums unchanged).
 */
import { describe, it, expect } from 'vitest';
import {
	formatWorkflowItemTypeForDisplay,
	formatWorkflowStatusForDisplay,
	formatWorkflowOriginForDisplay,
	formatWorkflowProposalTypeForDisplay,
	humanizeWorkflowScreamingSnake
} from './workflowStatus';

describe('workflowStatus display labels (P57-04)', () => {
	it('formats item types without changing canonical values', () => {
		expect(formatWorkflowItemTypeForDisplay('HYPOTHESIS')).toBe('Hypothesis');
		expect(formatWorkflowItemTypeForDisplay('GAP')).toBe('Gap');
		expect(formatWorkflowItemTypeForDisplay('hypothesis')).toBe('Hypothesis');
	});

	it('humanizes status tokens for presentation', () => {
		expect(formatWorkflowStatusForDisplay('OPEN')).toBe('Open');
		expect(formatWorkflowStatusForDisplay('IN_PROGRESS')).toBe('In Progress');
		expect(formatWorkflowStatusForDisplay('PENDING')).toBe('Pending');
	});

	it('formats origin for Investigator / Proposal', () => {
		expect(formatWorkflowOriginForDisplay('INVESTIGATOR')).toBe('Investigator');
		expect(formatWorkflowOriginForDisplay('PROPOSAL')).toBe('Proposal');
	});

	it('formats workflow proposal_type for display', () => {
		expect(formatWorkflowProposalTypeForDisplay('CREATE_HYPOTHESIS')).toBe('Hypothesis');
		expect(formatWorkflowProposalTypeForDisplay('CREATE_GAP')).toBe('Gap');
	});

	it('humanizeWorkflowScreamingSnake handles unknown multi-segment enums', () => {
		expect(humanizeWorkflowScreamingSnake('FOO_BAR')).toBe('Foo Bar');
	});
});
