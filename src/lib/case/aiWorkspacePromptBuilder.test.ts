import { describe, it, expect } from 'vitest';
import {
	AI_WORKSPACE_GUARDRAIL_PHRASES,
	buildAiWorkspacePromptPayload,
	buildAiWorkspaceSystemPrompt,
	serializeBundleForPrompt
} from '$lib/case/aiWorkspacePromptBuilder';
import type { CaseRetrievalBundle } from '$lib/case/caseRetrievalBundleTypes';

const minimalBundle = (): CaseRetrievalBundle => ({
	case_id: 'case-x',
	retrieved_at: '2026-04-14T12:00:00.000Z',
	sources: {
		timeline: [],
		notes: [],
		files: [],
		entities: [],
		workflow: []
	}
});

describe('aiWorkspacePromptBuilder', () => {
	it('includes guardrail phrases in system prompt', () => {
		const sys = buildAiWorkspaceSystemPrompt();
		for (const phrase of AI_WORKSPACE_GUARDRAIL_PHRASES) {
			expect(sys).toContain(phrase);
		}
		expect(sys.toLowerCase()).not.toMatch(/\brank\b.*\bimportance\b/);
	});

	it('serializes bundle deterministically as JSON', () => {
		const a = serializeBundleForPrompt(minimalBundle());
		const b = serializeBundleForPrompt(minimalBundle());
		expect(a).toBe(b);
		expect(a).toContain('"case_id":"case-x"');
	});

	it('buildAiWorkspacePromptPayload includes case id, user text, and bundle JSON', () => {
		const { system, user } = buildAiWorkspacePromptPayload({
			caseId: 'case-x',
			userPrompt: 'List open workflow items.',
			bundle: minimalBundle()
		});
		expect(system.length).toBeGreaterThan(100);
		expect(user).toContain('case_id: case-x');
		expect(user).toContain('List open workflow items.');
		expect(user).toContain('Retrieval bundle JSON');
	});
});
