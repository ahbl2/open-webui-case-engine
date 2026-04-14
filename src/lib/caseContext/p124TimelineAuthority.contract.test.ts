/**
 * P124-01 — Timeline authority framing: presentational only; route id via getRouteCaseId.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const timelinePage = join(__dirname, '../../routes/(app)/case/[id]/timeline/+page.svelte');
const framingPath = join(__dirname, '../components/case/CaseTimelineAuthorityFraming.svelte');
const placeholderPath = join(__dirname, '../components/case/CaseWorkspaceRouteSurfacePlaceholder.svelte');

describe('P124-01 Timeline authority framing', () => {
	it('timeline page mounts framing and does not use $page.params.id', () => {
		const src = readFileSync(timelinePage, 'utf8');
		expect(src).toMatch(/CaseTimelineAuthorityFraming/);
		expect(src).not.toMatch(/\$page\.params\.id/);
		expect(src).toMatch(/getRouteCaseId/);
	});

	it('CaseTimelineAuthorityFraming is presentational only', () => {
		const src = readFileSync(framingPath, 'utf8');
		expect(src).toMatch(/data-testid="case-timeline-p124-authority-framing"/);
		expect(src).toMatch(/data-p124-timeline-authority/);
		expect(src).not.toMatch(/\$lib\/stores/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/onMount\b|onDestroy\b/);
	});

	it('route placeholder shows Timeline framing when surface is Timeline', () => {
		const src = readFileSync(placeholderPath, 'utf8');
		expect(src).toMatch(/surface === 'Timeline'/);
		expect(src).toMatch(/CaseTimelineAuthorityFraming/);
	});
});
