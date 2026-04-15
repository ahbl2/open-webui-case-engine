/**
 * P131.5-02 — Summary row copy must not introduce alert/priority/analytics semantics (ticket guardrail).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const copyPath = join(here, 'p131CommandCenterCopy.ts');

describe('P131.5-02 Command Center summary copy guardrails (source)', () => {
	it('P131_5_COMMAND_CENTER_SUMMARY_* string exports avoid unsupported investigative semantics', () => {
		const src = readFileSync(copyPath, 'utf8');
		const forbidden = [
			/\balerts?\b/i,
			/\bmatches?\b/i,
			/\bpriority\b/i,
			/\bdue\s+soon\b/i,
			/\brequires?\s+attention\b/i,
			/\bintelligence\b/i,
			/\bpending\s+reviews?\b/i
		];
		for (const line of src.split('\n')) {
			if (!line.includes('P131_5_COMMAND_CENTER_SUMMARY')) continue;
			if (!line.includes('=')) continue;
			for (const re of forbidden) {
				expect(line, line.trim()).not.toMatch(re);
			}
		}
	});
});
