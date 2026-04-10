/**
 * P71-04 — Primary case tab strip (P70-05): Tier L classes, scroll container, data-case-tab hooks.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutPath = join(__dirname, '../../routes/(app)/case/[id]/+layout.svelte');
const layoutSource = readFileSync(layoutPath, 'utf8');

describe('case primary tab strip (P71-04 / P70-05)', () => {
	it('uses Tier L tab strip classes and landmark nav', () => {
		expect(layoutSource).toContain('ce-l-tab-strip');
		expect(layoutSource).toContain('ce-l-tab-link');
		expect(layoutSource).toContain('ce-l-tab-link--active');
		expect(layoutSource).toContain('ce-l-tab-link--disabled');
		expect(layoutSource).toContain('data-testid="case-workspace-nav"');
		expect(layoutSource).toContain('aria-label="Case sections"');
	});

	it('does not use legacy gray/blue tab utility dialect on links', () => {
		const navIdx = layoutSource.indexOf('data-testid="case-workspace-nav"');
		const afterNav = layoutSource.slice(navIdx, navIdx + 3500);
		expect(afterNav).not.toMatch(/border-blue-500/);
		expect(afterNav).not.toMatch(/text-blue-600/);
	});

	it('binds scroll container and scrolls active tab into view (P70-05 §2.4)', () => {
		expect(layoutSource).toContain('bind:this={caseTabNavEl}');
		expect(layoutSource).toContain('scrollActiveCaseTabIntoView');
		expect(layoutSource).toContain('data-case-tab={item.id}');
	});

	it('preserves href routing to /case/[id]/[section]', () => {
		expect(layoutSource).toContain('href={`/case/${$page.params.id}/${item.id}`}');
	});

	it('keeps identity header separate from tab strip (nav follows header)', () => {
		expect(layoutSource.indexOf('</header>')).toBeLessThan(layoutSource.indexOf('data-testid="case-workspace-nav"'));
	});
});
