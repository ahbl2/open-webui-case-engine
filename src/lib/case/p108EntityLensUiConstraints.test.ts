/**
 * P108-05 — Static guardrails: entity-lens copy and labels stay doctrine-safe (no inference/relevance/relationship framing).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
	p108EntityLensFilesLoadedCountLabel,
	p108EntityLensTimelineLoadedCountLabel,
	P108_ENTITY_FILES_LENS_EMPTY,
	P108_ENTITY_FILES_LENS_EMPTY_TITLE,
	P108_ENTITY_FILES_LENS_VIEW_ACTION,
	P108_ENTITY_LENS_RETURN_TO_ENTITY,
	P108_ENTITY_TIMELINE_LENS_BANNER,
	P108_ENTITY_TIMELINE_LENS_CLEAR,
	P108_ENTITY_TIMELINE_LENS_EMPTY,
	P108_ENTITY_TIMELINE_LENS_VIEW_ACTION
} from './p108EntityTimelineLensCopy';

const here = dirname(fileURLToPath(import.meta.url));
const copyPath = join(here, 'p108EntityTimelineLensCopy.ts');

/** Substrings that must not appear in P108 entity-lens user-facing copy (lowercase scan). */
const P108_LENS_FORBIDDEN_SUBSTRINGS = [
	'relevance',
	'relevant',
	'ranking',
	'rank ',
	' relationship',
	'relationships',
	'intelligence',
	'inference',
	'infer ',
	'infer.',
	'semantic ',
	'cluster',
	'discover',
	'suggest',
	'recommend',
	'prioritize',
	'prioritise',
	'analysis',
	'analyse',
	'analyze',
	'graph ',
	' graph',
	'comprehensive',
	'insight'
] as const;

function assertDoctrineSafeUserStringsBlock(src: string, label: string): void {
	const lower = src.toLowerCase();
	for (const bad of P108_LENS_FORBIDDEN_SUBSTRINGS) {
		expect(lower, `${label} must not contain disallowed wording: ${bad}`).not.toContain(bad);
	}
	// Whole-word "related" (avoid unrelated / correlated false positives only if "related" appears alone)
	expect(lower, `${label} must not use standalone relatedness framing`).not.toMatch(/\brelated\b/);
}

describe('P108-05 entity lens UI constraints', () => {
	it('p108EntityTimelineLensCopy.ts user-facing strings exclude prohibited framing', () => {
		const src = readFileSync(copyPath, 'utf8');
		const block = [
			P108_ENTITY_LENS_RETURN_TO_ENTITY,
			P108_ENTITY_TIMELINE_LENS_BANNER,
			P108_ENTITY_TIMELINE_LENS_CLEAR,
			P108_ENTITY_TIMELINE_LENS_VIEW_ACTION,
			P108_ENTITY_TIMELINE_LENS_EMPTY,
			P108_ENTITY_FILES_LENS_VIEW_ACTION,
			P108_ENTITY_FILES_LENS_EMPTY,
			P108_ENTITY_FILES_LENS_EMPTY_TITLE,
			p108EntityLensTimelineLoadedCountLabel(0),
			p108EntityLensTimelineLoadedCountLabel(1),
			p108EntityLensTimelineLoadedCountLabel(2),
			p108EntityLensFilesLoadedCountLabel(0),
			p108EntityLensFilesLoadedCountLabel(1),
			p108EntityLensFilesLoadedCountLabel(2)
		].join('\n');
		assertDoctrineSafeUserStringsBlock(block, 'p108EntityTimelineLensCopy');
		// Comments in the source file must not reintroduce forbidden product wording
		assertDoctrineSafeUserStringsBlock(src, 'p108EntityTimelineLensCopy.ts source');
	});

	it('loaded-count helpers are deterministic and explicitly link-framed', () => {
		expect(p108EntityLensTimelineLoadedCountLabel(1)).toContain('explicit entity links');
		expect(p108EntityLensFilesLoadedCountLabel(2)).toContain('explicit entity links');
		expect(p108EntityLensTimelineLoadedCountLabel(3)).toContain('read-only filter');
		expect(p108EntityLensFilesLoadedCountLabel(1)).toContain('read-only filter');
	});

	it('empty and view-action strings emphasize explicit links and read-only operator filter', () => {
		expect(P108_ENTITY_TIMELINE_LENS_VIEW_ACTION.toLowerCase()).toContain('read-only');
		expect(P108_ENTITY_FILES_LENS_VIEW_ACTION.toLowerCase()).toContain('read-only');
		expect(P108_ENTITY_TIMELINE_LENS_EMPTY.toLowerCase()).toContain('explicit');
		expect(P108_ENTITY_FILES_LENS_EMPTY.toLowerCase()).toContain('explicit');
		expect(P108_ENTITY_TIMELINE_LENS_BANNER.toLowerCase()).toContain('explicit');
	});
});
