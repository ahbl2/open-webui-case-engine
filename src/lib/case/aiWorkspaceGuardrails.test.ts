/**
 * P130-05 — Runtime tests for AI Workspace guardrails (no network).
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
	AI_WORKSPACE_GUARDRAIL_VIOLATION_MESSAGE,
	AI_WORKSPACE_MUTATION_DENIED_MESSAGE,
	AI_WORKSPACE_PROPOSAL_TRACE_BLOCKED,
	assertNoMutationAllowed,
	assertProposalSubmissionContext,
	assertProposalSubmitRateAllowed,
	collectUnknownSourceIdWarnings,
	markProposalSubmitCompleted,
	resetProposalRateLimiterForTests,
	validateAiResponseStructure,
	validateAiWorkspaceOutputIntegrity,
	validateTraceabilityForProposalDraft
} from './aiWorkspaceGuardrails';
import type { AiWorkspaceLlmJsonV1 } from './aiWorkspaceResponseTypes';
import type { CaseRetrievalBundle } from './caseRetrievalBundleTypes';

function minimalParsed(over?: Partial<AiWorkspaceLlmJsonV1>): AiWorkspaceLlmJsonV1 {
	return {
		source_backed_facts: over?.source_backed_facts ?? [
			{ statement: 'A.', refs: { timeline_entry_ids: ['t1'] } }
		],
		ai_generated_content: over?.ai_generated_content ?? 'gen',
		sources_used: over?.sources_used ?? {
			timeline_entry_ids: ['t1'],
			note_ids: [],
			file_ids: [],
			entity_ids: [],
			workflow_item_ids: []
		}
	};
}

const minimalBundle = (): CaseRetrievalBundle => ({
	case_id: 'c1',
	retrieved_at: '2026-01-01T00:00:00.000Z',
	sources: {
		timeline: [{ id: 't1' } as never],
		notes: [{ id: 1 } as never],
		files: [{ id: 'f1' } as never],
		entities: [{ id: 'e1' } as never],
		workflow: [{ workflow_item_id: 'w1' } as never]
	}
});

describe('aiWorkspaceGuardrails', () => {
	beforeEach(() => {
		resetProposalRateLimiterForTests();
	});

	it('assertNoMutationAllowed allows read-only phases with no write intent', () => {
		expect(() =>
			assertNoMutationAllowed({ phase: 'ingestion_read', caseEngineWriteIntent: false })
		).not.toThrow();
		expect(() =>
			assertNoMutationAllowed({ phase: 'ai_execution', caseEngineWriteIntent: false })
		).not.toThrow();
	});

	it('assertNoMutationAllowed throws when read phase implies write', () => {
		expect(() =>
			assertNoMutationAllowed({
				phase: 'ingestion_read',
				caseEngineWriteIntent: 'proposal_only'
			})
		).toThrow(AI_WORKSPACE_MUTATION_DENIED_MESSAGE);
	});

	it('assertNoMutationAllowed allows proposal_create with proposal_only', () => {
		expect(() =>
			assertNoMutationAllowed({ phase: 'proposal_create', caseEngineWriteIntent: 'proposal_only' })
		).not.toThrow();
	});

	it('assertProposalSubmissionContext requires review panel open', () => {
		expect(() => assertProposalSubmissionContext(false)).toThrow(AI_WORKSPACE_MUTATION_DENIED_MESSAGE);
		expect(() => assertProposalSubmissionContext(true)).not.toThrow();
	});

	it('validateAiResponseStructure rejects missing sections', () => {
		expect(validateAiResponseStructure({}).ok).toBe(false);
		expect(validateAiResponseStructure(null).ok).toBe(false);
	});

	it('validateAiWorkspaceOutputIntegrity rejects authority language', () => {
		const p = minimalParsed({
			source_backed_facts: [{ statement: 'This proves nothing.', refs: {} }]
		});
		const r = validateAiWorkspaceOutputIntegrity(p, '{}');
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.code).toBe('authority');
	});

	it('validateAiWorkspaceOutputIntegrity uses fixed user message for any failure', () => {
		const p = minimalParsed();
		const bad = validateAiWorkspaceOutputIntegrity(p, 'This is verified by the system.');
		expect(bad.ok).toBe(false);
	});

	it('validateAiWorkspaceOutputIntegrity accepts clean content', () => {
		const p = minimalParsed({
			source_backed_facts: [{ statement: 'A neutral summary.', refs: {} }],
			ai_generated_content: 'Discussion only.'
		});
		expect(validateAiWorkspaceOutputIntegrity(p, '{"ok":true}').ok).toBe(true);
	});

	it('validateTraceabilityForProposalDraft blocks without prompt or raw response', () => {
		const p = minimalParsed();
		const a = validateTraceabilityForProposalDraft({
			parsed: p,
			rawModelResponse: '',
			userPrompt: 'x',
			selectedFactIndices: [0],
			includeGenerated: false,
			bundle: null
		});
		expect(a.ok).toBe(false);
		if (!a.ok) expect(a.message).toBe(AI_WORKSPACE_PROPOSAL_TRACE_BLOCKED);

		const b = validateTraceabilityForProposalDraft({
			parsed: p,
			rawModelResponse: '{}',
			userPrompt: '   ',
			selectedFactIndices: [0],
			includeGenerated: false,
			bundle: null
		});
		expect(b.ok).toBe(false);
	});

	it('validateTraceabilityForProposalDraft returns warnings for unknown ids (non-blocking)', () => {
		const p = minimalParsed({
			sources_used: {
				timeline_entry_ids: ['unknown-tl'],
				note_ids: [],
				file_ids: [],
				entity_ids: [],
				workflow_item_ids: []
			}
		});
		const r = validateTraceabilityForProposalDraft({
			parsed: p,
			rawModelResponse: 'x',
			userPrompt: 'y',
			selectedFactIndices: [0],
			includeGenerated: false,
			bundle: minimalBundle()
		});
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.warnings.some((w) => w.includes('unknown-tl'))).toBe(true);
	});

	it('collectUnknownSourceIdWarnings covers workflow_item_id', () => {
		const p = minimalParsed({
			sources_used: {
				timeline_entry_ids: [],
				note_ids: [],
				file_ids: [],
				entity_ids: [],
				workflow_item_ids: ['bad-wf']
			}
		});
		const w = collectUnknownSourceIdWarnings(p, minimalBundle());
		expect(w.some((x) => x.includes('bad-wf'))).toBe(true);
	});

	it('proposal rate limiter blocks rapid repeat', () => {
		assertProposalSubmitRateAllowed();
		markProposalSubmitCompleted();
		expect(() => assertProposalSubmitRateAllowed()).toThrow();
	});

	it('guardrail violation message is stable for UI', () => {
		expect(AI_WORKSPACE_GUARDRAIL_VIOLATION_MESSAGE).toBe('AI output violates system guardrails');
	});
});
