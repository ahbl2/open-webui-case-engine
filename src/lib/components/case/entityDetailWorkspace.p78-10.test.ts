/**
 * P78-10 — Entity detail quick-pill honesty: workspace tab shortcuts vs governed case route.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'EntityDetailWorkspace.svelte'), 'utf8');

describe('EntityDetailWorkspace (P78-10 quick-pill honesty)', () => {
	it('groups workspace tab shortcuts separately from governed Proposals navigation', () => {
		expect(source).toContain('In this workspace');
		expect(source).toContain('Governed case route');
		expect(source).toContain('data-testid="entity-detail-quick-pills-workspace"');
		expect(source).toContain('data-testid="entity-detail-quick-pills-governed-route"');
	});

	it('uses distinct workspace pill styling and pressed state for local tabs only', () => {
		expect(source).toContain('quickPillWorkspace');
		expect(source).toContain('DS_ENTITY_DETAIL_CLASSES.quickPillWorkspace');
		expect(source).toContain("aria-pressed={primaryTab === 'timeline'");
		expect(source).toContain("aria-pressed={primaryTab === 'files'");
		expect(source).toContain("aria-pressed={primaryTab === 'notes'");
	});

	it('keeps Proposals as a real case href with governed-route affordance', () => {
		expect(source).toContain('data-testid="entity-detail-pill-proposals"');
		expect(source).toContain('href={proposalsHref()}');
		expect(source).toContain('quickPillProposals');
		expect(source).toContain('CASE_DESTINATION_LABELS.caseProposals');
		expect(source).toContain('(P19)');
	});

	it('documents non-equivalence via titles (no fake official-record navigation)', () => {
		expect(source).toContain('Opens the Timeline tab in this workspace');
		expect(source).toContain('CASE_DESTINATION_TITLES.caseProposalsOpenPill');
	});
});
