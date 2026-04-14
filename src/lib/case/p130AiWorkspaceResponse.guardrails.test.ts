/**
 * P130-03 — Static guardrails: AI response modules do not touch Case Engine or Activity.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

const files = [
	'aiWorkspacePromptBuilder.ts',
	'aiWorkspaceResponseParser.ts',
	'aiWorkspaceResponseTypes.ts'
] as const;

describe('P130-03 AI workspace modules (guardrails)', () => {
	it.each(files)('%s does not import Case Engine APIs', (name) => {
		const src = readFileSync(join(here, name), 'utf8');
		expect(src).not.toMatch(/\$lib\/apis\/caseEngine/);
		expect(src).not.toMatch(/listCaseActivityEvents|getCaseAudit|\/activity-events/i);
	});

	it.each(files)('%s does not label output authoritative', (name) => {
		const lower = readFileSync(join(here, name), 'utf8').toLowerCase();
		expect(lower).not.toMatch(/\bauthoritative record\b.*\bai\b/);
	});
});
