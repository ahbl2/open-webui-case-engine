import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { CaseEntitySourceRecordInput } from '$lib/case/p100EntityExtractionContract';
import { extractCaseEntitiesFromSourceText } from '$lib/case/p100EntityExtraction';

const _dir = dirname(fileURLToPath(import.meta.url));

function baseInput(overrides: Partial<{ text: string; source_kind: 'timeline_entry' }> = {}) {
	return {
		case_id: 'case-alpha',
		source_kind: 'timeline_entry' as const,
		source_record_id: 'entry-1',
		text: '',
		...overrides
	};
}

describe('extractCaseEntitiesFromSourceText (P100-01)', () => {
	it('returns empty matches for empty / invalid ids or unknown source kind', () => {
		expect(extractCaseEntitiesFromSourceText(baseInput({ case_id: '  ', text: 'John Doe' })).matches).toEqual([]);
		expect(extractCaseEntitiesFromSourceText(baseInput({ source_record_id: '', text: 'x' })).matches).toEqual([]);
		expect(extractCaseEntitiesFromSourceText(baseInput({ text: '' })).matches).toEqual([]);
		expect(
			extractCaseEntitiesFromSourceText({
				...baseInput({ text: 'x' }),
				source_kind: 'not_a_valid_kind' as unknown as CaseEntitySourceRecordInput['source_kind']
			}).matches
		).toEqual([]);
	});

	it('extracts conservative two-token person names', () => {
		const r = extractCaseEntitiesFromSourceText(
			baseInput({ text: 'Interview with Jane Smith about the report.' })
		);
		const names = r.matches.filter((m) => m.entity_type === 'person_name');
		expect(names).toHaveLength(1);
		expect(names[0]!.raw_text).toBe('Jane Smith');
		expect(names[0]!.normalized_display).toBeNull();
	});

	it('does not treat blocked tokens as person names', () => {
		const r = extractCaseEntitiesFromSourceText(
			baseInput({ text: 'Monday Tuesday and Case File are not names here.' })
		);
		expect(r.matches.filter((m) => m.entity_type === 'person_name')).toHaveLength(0);
	});

	it('extracts NANP-style phone numbers and normalizes', () => {
		const r = extractCaseEntitiesFromSourceText(
			baseInput({ text: 'Call +1 (503) 555-0199 tomorrow.' })
		);
		const phones = r.matches.filter((m) => m.entity_type === 'phone_number');
		expect(phones).toHaveLength(1);
		expect(phones[0]!.raw_text).toContain('503');
		expect(phones[0]!.normalized_display).toBe('503-555-0199');
	});

	it('extracts street-style addresses', () => {
		const r = extractCaseEntitiesFromSourceText(
			baseInput({ text: 'Seen near 42 Oak Ave before departure.' })
		);
		const addrs = r.matches.filter((m) => m.entity_type === 'address');
		expect(addrs.length).toBeGreaterThanOrEqual(1);
		expect(addrs[0]!.raw_text).toMatch(/42 Oak Ave/i);
	});

	it('extracts labeled VIN and labeled plate (vehicle)', () => {
		const r = extractCaseEntitiesFromSourceText(
			baseInput({
				text: 'VIN: 1HGBH41JXMN109186 and Plate: ab-1234-cd for reference.'
			})
		);
		const v = r.matches.filter((m) => m.entity_type === 'vehicle');
		expect(v.some((m) => m.raw_text.toLowerCase().includes('vin'))).toBe(true);
		expect(v.some((m) => m.raw_text.toLowerCase().includes('plate'))).toBe(true);
	});

	it('extracts UUID and hyphenated / prefix simple identifiers', () => {
		const r = extractCaseEntitiesFromSourceText(
			baseInput({
				text: 'Refs 550e8400-e29b-41d4-a716-446655440000 and 2020-04-010000 and OR-443322.'
			})
		);
		const ids = r.matches.filter((m) => m.entity_type === 'simple_identifier');
		expect(ids.some((m) => m.raw_text.includes('550e8400'))).toBe(true);
		expect(ids.some((m) => m.raw_text === '2020-04-010000')).toBe(true);
		expect(ids.some((m) => m.raw_text === 'OR-443322')).toBe(true);
	});

	it('is deterministic on identical input', () => {
		const input = baseInput({
			text: 'Jane Doe (555) 444-3322 at 10 Main St. VIN: 1M8GDM9AXKP042788'
		});
		const a = extractCaseEntitiesFromSourceText(input);
		const b = extractCaseEntitiesFromSourceText(input);
		expect(JSON.stringify(a)).toBe(JSON.stringify(b));
	});

	it('preserves provenance on every match', () => {
		const body = 'John Doe 555-111-2222';
		const r = extractCaseEntitiesFromSourceText(
			baseInput({
				text: body,
				case_id: 'c-1',
				source_record_id: 'rec-9',
				source_kind: 'case_task'
			})
		);
		for (const m of r.matches) {
			expect(m.v).toBe(1);
			expect(m.case_id).toBe('c-1');
			expect(m.source_kind).toBe('case_task');
			expect(m.source_record_id).toBe('rec-9');
			expect(typeof m.raw_text).toBe('string');
			expect(m.span.start).toBeGreaterThanOrEqual(0);
			expect(m.span.end).toBeGreaterThan(m.span.start);
			expect(m.raw_text).toBe(inputSlice(body, m.span));
		}
	});

	it('does not merge text across separate extract calls (record boundaries)', () => {
		const a = extractCaseEntitiesFromSourceText(baseInput({ source_record_id: 'a', text: 'Jane Doe' }));
		const b = extractCaseEntitiesFromSourceText(baseInput({ source_record_id: 'b', text: 'Jane Doe' }));
		expect(a.matches[0]!.source_record_id).toBe('a');
		expect(b.matches[0]!.source_record_id).toBe('b');
	});

	it('sorts matches by span start, then end, then entity type order', () => {
		const r = extractCaseEntitiesFromSourceText(
			baseInput({ text: 'AA-12345 and 100 Main St and Jane Doe' })
		);
		const starts = r.matches.map((m) => m.span.start);
		const sorted = [...starts].sort((x, y) => x - y);
		expect(starts).toEqual(sorted);
	});

	it('keeps non-overlapping same-type matches in separate spans', () => {
		const r = extractCaseEntitiesFromSourceText(
			baseInput({ text: '(503) 555-1111 then (503) 555-2222' })
		);
		const phones = r.matches.filter((m) => m.entity_type === 'phone_number');
		expect(phones).toHaveLength(2);
		expect(phones[0]!.span.end).toBeLessThanOrEqual(phones[1]!.span.start);
	});
});

function inputSlice(text: string, span: { start: number; end: number }): string {
	return text.slice(span.start, span.end);
}

describe('P100-01 static guardrails', () => {
	const files = ['p100EntityExtractionContract.ts', 'p100EntityExtraction.ts'];

	it('P100 extraction modules do not reference browser persistence or cross-case APIs', () => {
		for (const f of files) {
			const src = readFileSync(join(_dir, f), 'utf8');
			expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB/);
			expect(src).not.toMatch(/\bcrossCase\b|cross_case|cross-case/i);
		}
	});

	it('P100 extraction modules do not reference LLM / AI client surfaces', () => {
		for (const f of files) {
			const src = readFileSync(join(_dir, f), 'utf8');
			expect(src).not.toMatch(/\bfetch\s*\(/);
			expect(src).not.toMatch(/openai|anthropic|huggingface/i);
			expect(src).not.toContain('@huggingface/transformers');
		}
	});

	it('P100 extraction modules avoid graph / workflow-implication wording in source', () => {
		const rel = /\b(relationship|relationships|graph|network|infer\b|rank\b)\b/i;
		for (const f of files) {
			const src = readFileSync(join(_dir, f), 'utf8');
			expect(src).not.toMatch(rel);
		}
	});
});
