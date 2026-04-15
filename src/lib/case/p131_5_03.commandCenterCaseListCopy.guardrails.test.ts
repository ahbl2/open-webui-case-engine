/**
 * P131.5-03 — Case List card copy must not introduce priority/staleness semantics (ticket guardrail).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const copyPath = join(here, 'p131CommandCenterCopy.ts');

describe('P131.5-03 Command Center case list card copy guardrails (source)', () => {
	it('P131_5_COMMAND_CENTER_CASES_CARD_* exports avoid unsupported investigative semantics', () => {
		const src = readFileSync(copyPath, 'utf8');
		const forbidden = [
			/\bactive\b/i,
			/\bstale\b/i,
			/\bpriority\b/i,
			/\burgent\b/i,
			/\balerts?\b/i,
			/\bmatches?\b/i,
			/\bdue\s+soon\b/i,
			/\brequires?\s+attention\b/i
		];
		for (const line of src.split('\n')) {
			if (!line.includes('P131_5_COMMAND_CENTER_CASES_CARD')) continue;
			if (!line.includes('=')) continue;
			for (const re of forbidden) {
				expect(line, line.trim()).not.toMatch(re);
			}
		}
	});
});
