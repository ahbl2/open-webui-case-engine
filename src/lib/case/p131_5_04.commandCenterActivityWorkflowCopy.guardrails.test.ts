/**
 * P131.5-04 — Activity / Workflow card copy must not introduce urgency or operational semantics (ticket guardrail).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const copyPath = join(here, 'p131CommandCenterCopy.ts');

describe('P131.5-04 Command Center activity/workflow card copy guardrails (source)', () => {
	it('P131_5_COMMAND_CENTER_ACTIVITY_CARD_* and WORKFLOW_CARD_* exports avoid unsupported semantics', () => {
		const src = readFileSync(copyPath, 'utf8');
		const forbidden = [
			/\boverdue\b/i,
			/\bbehind\b/i,
			/\bactive\s+case\b/i,
			/\bneeds\s+attention\b/i,
			/\bpriority\b/i,
			/\burgent\b/i,
			/\bcritical\b/i,
			/\balerts?\b/i,
			/\bseverity\b/i,
			/\bimportant\b/i,
			/\bstale\b/i,
			/\bmatches?\b/i
		];
		for (const line of src.split('\n')) {
			if (!line.includes('P131_5_COMMAND_CENTER_ACTIVITY_CARD') && !line.includes('P131_5_COMMAND_CENTER_WORKFLOW_CARD'))
				continue;
			if (!line.includes('=')) continue;
			for (const re of forbidden) {
				expect(line, line.trim()).not.toMatch(re);
			}
		}
	});
});
