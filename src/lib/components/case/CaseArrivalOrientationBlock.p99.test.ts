/**
 * P99-02 / P99-03 — Arrival block: read-only markup; return control is P99-03 only.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const blockPath = join(dirname(fileURLToPath(import.meta.url)), 'CaseArrivalOrientationBlock.svelte');

describe('CaseArrivalOrientationBlock (P99-02 / P99-03)', () => {
	it('has no links or forms; return uses a single factual control (explicit goto only)', () => {
		const src = readFileSync(blockPath, 'utf8');
		expect(src).not.toMatch(/<a\s/i);
		expect(src).not.toMatch(/<form/i);
		expect(src).toMatch(/ds-p99-arrival-return/);
		expect(src).toMatch(/\{#if context\.is_returnable\}/);
		expect(src).toContain('navigateArrivalReturnToSource');
		expect(src).toContain('role="status"');
	});

	it('echo strip is bounded (no expansion / scroll chrome)', () => {
		const src = readFileSync(blockPath, 'utf8');
		expect(src).toMatch(/overflow-hidden/);
		expect(src).toMatch(/max-h-\[/);
		expect(src).not.toMatch(/sessionStorage|localStorage/);
	});

	it('renders contract fields only (heading, subline, optional echo)', () => {
		const src = readFileSync(blockPath, 'utf8');
		expect(src).toContain('{context.heading}');
		expect(src).toContain('{context.subline}');
		expect(src).toContain('context.source_echo');
	});
});
