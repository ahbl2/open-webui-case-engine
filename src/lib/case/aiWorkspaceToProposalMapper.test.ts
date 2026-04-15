/**
 * P130-04 — Mapper: structured AI output → proposal create body (no network).
 */
import { describe, expect, it } from 'vitest';
import {
	assembleProposalTextOriginal,
	buildCaseProposalCreateBody,
	buildSourceRefsFromSelectedFacts,
	refsFromFact
} from './aiWorkspaceToProposalMapper';
import type { AiWorkspaceLlmJsonV1 } from './aiWorkspaceResponseTypes';

const sampleParsed = (): AiWorkspaceLlmJsonV1 => ({
	source_backed_facts: [
		{
			statement: 'Alpha fact.',
			refs: {
				timeline_entry_ids: ['t1'],
				note_ids: [42],
				file_ids: ['f1'],
				entity_ids: ['e1'],
				workflow_item_ids: ['w1']
			}
		},
		{
			statement: 'Beta fact.',
			refs: { timeline_entry_ids: ['t1', 't2'] }
		}
	],
	ai_generated_content: 'Generated paragraph.',
	sources_used: {
		timeline_entry_ids: ['t1'],
		note_ids: [],
		file_ids: [],
		entity_ids: [],
		workflow_item_ids: []
	}
});

describe('aiWorkspaceToProposalMapper', () => {
	it('assembleProposalTextOriginal preserves fact statements verbatim and order by index', () => {
		const p = sampleParsed();
		const text = assembleProposalTextOriginal({
			parsed: p,
			selectedFactIndices: [1, 0],
			includeGenerated: false
		});
		expect(text).toBe('Alpha fact.\n\nBeta fact.');
	});

	it('assembleProposalTextOriginal appends generated block verbatim when requested', () => {
		const p = sampleParsed();
		const text = assembleProposalTextOriginal({
			parsed: p,
			selectedFactIndices: [],
			includeGenerated: true
		});
		expect(text).toContain('Generated paragraph.');
		expect(text).toContain('AI-Generated Content (Non-Authoritative)');
	});

	it('refsFromFact maps only P101 kinds; skips entity and workflow', () => {
		const r = refsFromFact({
			timeline_entry_ids: ['t1'],
			note_ids: [7],
			file_ids: ['f9'],
			entity_ids: ['e1'],
			workflow_item_ids: ['w1']
		});
		expect(r).toEqual(
			expect.arrayContaining([
				{ kind: 'timeline_entry', id: 't1' },
				{ kind: 'notebook_note', id: '7' },
				{ kind: 'case_file', id: 'f9' }
			])
		);
		expect(r.some((x) => x.kind === 'entity')).toBe(false);
	});

	it('buildSourceRefsFromSelectedFacts unions and dedupes deterministically', () => {
		const p = sampleParsed();
		const refs = buildSourceRefsFromSelectedFacts(p, [0, 1]);
		const str = JSON.stringify(refs);
		expect(str).toContain('timeline_entry');
		expect(str).toContain('t1');
		const again = JSON.stringify(buildSourceRefsFromSelectedFacts(p, [0, 1]));
		expect(again).toBe(str);
	});

	it('buildCaseProposalCreateBody preserves review text and embeds ai_trace', () => {
		const p = sampleParsed();
		const { payload, source_refs } = buildCaseProposalCreateBody({
			reviewOccurredAt: '2026-04-14T12:00:00.000Z',
			reviewType: 'note',
			reviewTextOriginal: 'Hello draft.',
			traceContext: {
				userPrompt: 'user prompt text',
				modelId: 'm1',
				rawModelResponse: '{"x":1}',
				parsed: p,
				selectedFactIndices: [0],
				includeGenerated: false
			}
		});
		expect(payload.text_original).toBe('Hello draft.');
		expect(payload.type).toBe('note');
		expect(payload.occurred_at).toBe('2026-04-14T12:00:00.000Z');
		const trace = payload.ai_trace as { optional_context_text?: string; user_instructions?: string };
		expect(trace.user_instructions).toBe('user prompt text');
		expect(trace.optional_context_text).toContain('ai_workspace');
		expect(trace.optional_context_text).toContain('source_backed_facts');
		expect(source_refs).toBeDefined();
	});
});
