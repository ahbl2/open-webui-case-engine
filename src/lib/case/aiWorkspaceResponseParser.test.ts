import { describe, it, expect } from 'vitest';
import type { CaseRetrievalBundle } from '$lib/case/caseRetrievalBundleTypes';
import {
	AI_WORKSPACE_TRACEABILITY_EMPTY_SOURCES_WARNING,
	parseAiWorkspaceLlmJson,
	parseAiWorkspaceLlmJsonWithBundle
} from '$lib/case/aiWorkspaceResponseParser';

const bundleWithIds = (): CaseRetrievalBundle => ({
	case_id: 'c1',
	retrieved_at: '2026-01-01T00:00:00.000Z',
	sources: {
		timeline: [
			{
				id: 'te1',
				case_id: 'c1',
				occurred_at: '2021-01-01T12:00:00.000Z',
				created_at: '2021-01-01T12:00:00.000Z',
				created_by: 'u',
				type: 'note',
				location_text: null,
				tags: [],
				text_original: 'hello',
				text_cleaned: null,
				deleted_at: null
			}
		],
		notes: [],
		files: [],
		entities: [],
		workflow: []
	}
});

const validJson = JSON.stringify({
	source_backed_facts: [
		{
			statement: 'An entry exists.',
			refs: { timeline_entry_ids: ['te1'], note_ids: [], file_ids: [], entity_ids: [], workflow_item_ids: [] }
		}
	],
	ai_generated_content: 'Organized view only.',
	sources_used: {
		timeline_entry_ids: ['te1'],
		note_ids: [],
		file_ids: [],
		entity_ids: [],
		workflow_item_ids: []
	}
});

describe('parseAiWorkspaceLlmJson', () => {
	it('parses valid JSON object', () => {
		const r = parseAiWorkspaceLlmJson(validJson);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.data.source_backed_facts.length).toBe(1);
		expect(r.data.ai_generated_content).toContain('Organized');
	});

	it('parses JSON inside markdown fence', () => {
		const r = parseAiWorkspaceLlmJson(`Here:\n\`\`\`json\n${validJson}\n\`\`\``);
		expect(r.ok).toBe(true);
	});

	it('rejects malformed JSON', () => {
		const r = parseAiWorkspaceLlmJson('not json');
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.kind).toBe('parse');
	});

	it('rejects wrong schema', () => {
		const r = parseAiWorkspaceLlmJson('{"foo":1}');
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.kind).toBe('schema');
	});
});

describe('parseAiWorkspaceLlmJsonWithBundle', () => {
	it('warns when sources_used is empty', () => {
		const emptyUsed = JSON.stringify({
			source_backed_facts: [
				{ statement: 'x', refs: { timeline_entry_ids: ['te1'] } }
			],
			ai_generated_content: 'y',
			sources_used: {
				timeline_entry_ids: [],
				note_ids: [],
				file_ids: [],
				entity_ids: [],
				workflow_item_ids: []
			}
		});
		const r = parseAiWorkspaceLlmJsonWithBundle(emptyUsed, bundleWithIds());
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.warnings).toContain(AI_WORKSPACE_TRACEABILITY_EMPTY_SOURCES_WARNING);
	});

	it('warns on unknown timeline id in sources_used', () => {
		const bad = JSON.stringify({
			source_backed_facts: [{ statement: 'x', refs: { timeline_entry_ids: ['bad'] } }],
			ai_generated_content: 'y',
			sources_used: {
				timeline_entry_ids: ['bad'],
				note_ids: [],
				file_ids: [],
				entity_ids: [],
				workflow_item_ids: []
			}
		});
		const r = parseAiWorkspaceLlmJsonWithBundle(bad, bundleWithIds());
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.warnings.some((w) => w.includes('unknown id'))).toBe(true);
	});
});
