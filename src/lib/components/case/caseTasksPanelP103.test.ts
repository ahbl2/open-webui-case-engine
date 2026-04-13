/**
 * P103-02 — CaseTasksPanel wires P103 task citation navigation.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseTasksPanel.svelte');

describe('CaseTasksPanel.svelte (P103-02 task citation navigation)', () => {
	const src = readFileSync(panelPath, 'utf8');

	it('consumes p103CitationNavigationIntent on tasks route with synthesis guard', () => {
		expect(src).toContain('p103CitationNavigationIntent');
		expect(src).toContain('isP103TaskNavigationIntent');
		expect(src).toContain('isStaleP103NavigationIntentShape');
		expect(src).toContain('isP103TaskNavigationIntent(p103Raw, caseId)');
	});
});
