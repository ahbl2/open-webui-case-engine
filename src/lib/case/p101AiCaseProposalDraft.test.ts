import { describe, it, expect } from 'vitest';
import {
	buildAiTraceV1,
	extractJsonObjectFromAiText,
	isP101ProposalType,
	mergePayloadWithAiTrace,
	parseAndValidateSourceRefsJson,
	parseSourceRefsJson,
	validateSourceRefsStructure,
	whitelistTaskPayload,
	whitelistTimelinePayload
} from './p101AiCaseProposalDraft';

describe('P101-04 / P101-05 p101AiCaseProposalDraft', () => {
	it('extractJsonObjectFromAiText: parses bare JSON', () => {
		const r = extractJsonObjectFromAiText('{"title":"Hello"}');
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.value).toEqual({ title: 'Hello' });
	});

	it('extractJsonObjectFromAiText: parses fenced JSON', () => {
		const r = extractJsonObjectFromAiText('```json\n{"a":1}\n```');
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.value).toEqual({ a: 1 });
	});

	it('extractJsonObjectFromAiText: rejects non-JSON', () => {
		const r = extractJsonObjectFromAiText('here is prose');
		expect(r.ok).toBe(false);
	});

	it('whitelistTimelinePayload: strips unknown keys and requires core fields', () => {
		const r = whitelistTimelinePayload({
			occurred_at: '2024-01-02T12:00:00.000Z',
			type: 'OBS',
			text_original: 'x',
			extra: 'nope'
		});
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.data.extra).toBeUndefined();
			expect(r.data.occurred_at).toBe('2024-01-02T12:00:00.000Z');
		}
	});

	it('whitelistTimelinePayload: rejects missing occurred_at', () => {
		const r = whitelistTimelinePayload({ type: 'OBS', text_original: 'x' });
		expect(r.ok).toBe(false);
	});

	it('whitelistTaskPayload: strips unknown keys', () => {
		const r = whitelistTaskPayload({ title: 'T', foo: 1 });
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.data.foo).toBeUndefined();
	});

	it('parseSourceRefsJson: empty string → empty array', () => {
		const r = parseSourceRefsJson('  ');
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.value).toEqual([]);
	});

	it('mergePayloadWithAiTrace: adds ai_trace', () => {
		const p = mergePayloadWithAiTrace(
			{ title: 'x' },
			buildAiTraceV1({
				userInstructions: 'u',
				rawAiResponse: '{"title":"x"}'
			})
		);
		expect((p.ai_trace as { schema_version: number }).schema_version).toBe(1);
		expect(p.title).toBe('x');
	});

	it('validateSourceRefsStructure: accepts valid kinds', () => {
		const r = validateSourceRefsStructure([{ kind: 'case_file', id: 'abc' }]);
		expect(r.ok).toBe(true);
	});

	it('validateSourceRefsStructure: rejects bad kind', () => {
		const r = validateSourceRefsStructure([{ kind: 'invalid', id: 'x' }]);
		expect(r.ok).toBe(false);
	});

	it('parseAndValidateSourceRefsJson: rejects invalid JSON', () => {
		const r = parseAndValidateSourceRefsJson('{');
		expect(r.ok).toBe(false);
	});

	it('isP101ProposalType: narrows', () => {
		expect(isP101ProposalType('task')).toBe(true);
		expect(isP101ProposalType('x')).toBe(false);
	});
});
