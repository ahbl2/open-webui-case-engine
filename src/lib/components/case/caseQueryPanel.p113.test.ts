/**
 * P113-03 — Case query panel retrieval transparency (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseQueryPanel.svelte');
const transparencyPath = join(here, '../../case/p113CaseQueryRetrievalTransparency.ts');

describe('CaseQueryPanel.svelte (P113-03)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('imports retrieval transparency helpers', () => {
		expect(src).toContain('p113CaseQueryRetrievalTransparency');
		expect(src).toContain('showRetrievalTransparency');
		expect(src).toContain('referentialFactsCitationsAligned');
	});

	it('exposes transparency test ids and pairwise rows', () => {
		expect(src).toContain('data-testid="case-query-retrieval-transparency"');
		expect(src).toContain('data-testid="case-query-transparency-row"');
		expect(src).toContain('data-testid="case-query-transparency-support"');
		expect(src).toContain('data-testid="case-query-answer-debug"');
		expect(src).toContain('data-testid="case-query-transparency-mismatch"');
	});

	it('hides duplicate citations list when transparency is active', () => {
		expect(src).toContain('!showRetrievalTransparency(envelope)');
	});

	it('does not add forbidden analytic labels in prose (static scan; allows HTML <summary> for details)', () => {
		const banned = /\b(report|analysis|narrative)\b/i;
		expect(src).not.toMatch(banned);
	});
});

describe('p113CaseQueryRetrievalTransparency.ts', () => {
	const src = readFileSync(transparencyPath, 'utf8');

	it('avoids forbidden analytic labels in exported copy', () => {
		const banned = /\b(summary|report|analysis|narrative)\b/i;
		expect(src).not.toMatch(banned);
	});
});
