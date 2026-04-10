/**
 * P67-09 — Case Intelligence workspace UX polish: workflow path, modal CTAs (source contract).
 * P69-07 — overview board shell; pilot strip replaced by intake subordinate inside shell.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const pageSource = readFileSync(join(__dirname, '+page.svelte'), 'utf8');
const modalSource = readFileSync(
	join(__dirname, '..', '..', '..', '..', '..', 'lib', 'components', 'case', 'CaseIntelligenceEntityDetailModal.svelte'),
	'utf8'
);

describe('intelligence/+page Entities polish (P67-09 / P69-07)', () => {
	it('exposes workflow path and board shell landmark', () => {
		expect(pageSource).toContain('data-testid="intelligence-entities-workflow-path"');
		expect(pageSource).toContain('Entities overview board');
		expect(pageSource).toContain('EntitiesOverviewBoardShell');
	});

	it('keeps tab mode landmarks for automation', () => {
		expect(pageSource).toContain('data-testid="intelligence-workspace-mode-entities"');
		expect(pageSource).toContain('Case Intelligence workspace: Entities or Intelligence mode');
	});
});

describe('CaseIntelligenceEntityDetailModal polish (P67-09)', () => {
	it('uses proposal-first association CTAs and Stage 2 queue handoff label', () => {
		expect(modalSource).toContain('Propose association');
		expect(modalSource).toContain('Go to Stage 2 queue');
		expect(modalSource).toContain('Close proposal form');
	});
});
