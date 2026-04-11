/**
 * P78-08 — Workflow tab vs case Proposals tab wording disambiguation (source contracts).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab P78-08 wording disambiguation', () => {
	it('labels the collapsed narrative with Workflow tab vs case Proposals tab vs workflow proposal queue', () => {
		expect(tabSource).toContain('This Workflow tab');
		expect(tabSource).toContain('case Proposals');
		expect(tabSource).toContain('workflow proposal queue');
		expect(tabSource).toContain('not case proposals');
	});

	it('uses workflow-queue language in confirm dialogs and toasts, not generic “proposal” alone', () => {
		expect(tabSource).toContain('Accept workflow suggestion?');
		expect(tabSource).toContain('Reject workflow suggestion?');
		expect(tabSource).toContain('Workflow suggestion accepted — planning item created.');
		expect(tabSource).toContain('workflow-queue suggestion');
	});

	it('keeps the queue panel explicit that this queue is not the case Proposals tab', () => {
		expect(tabSource).toContain('this queue is not the case Proposals tab');
	});
});
