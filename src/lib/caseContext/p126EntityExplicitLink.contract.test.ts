/**
 * P126-04 — Explicit linking form: static copy; no inference vocabulary; no page id leakage.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const copyPath = join(__dirname, 'p126EntityExplicitLinkCopy.ts');
const formPath = join(__dirname, '../components/case/CaseEntityEvidenceLinkForm.svelte');

describe('p126EntityExplicitLinkCopy (P126-04)', () => {
	it('is static exports only', () => {
		const src = readFileSync(copyPath, 'utf8');
		expect(src).toMatch(/P126_EXPLICIT_LINK_INTRO/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$page/);
	});

	it('avoids inference / ranking product vocabulary', () => {
		const lower = readFileSync(copyPath, 'utf8').toLowerCase();
		expect(lower).not.toMatch(/\bsuggested\b/);
		expect(lower).not.toMatch(/\bmatched\b/);
		expect(lower).not.toMatch(/\brelated\b/);
		expect(lower).not.toMatch(/\blikely\b/);
		expect(lower).not.toMatch(/\bbest\b/);
		expect(lower).not.toMatch(/\btop\b/);
		expect(lower).not.toMatch(/\bconfidence\b/);
	});
});

describe('CaseEntityEvidenceLinkForm (P126-04)', () => {
	const src = readFileSync(formPath, 'utf8');

	it('creates one link per submit via API module; no inline fetch', () => {
		expect(src).toContain('createCaseEntityEvidenceLink');
		expect(src).toContain('timeline_entry');
		expect(src).toContain('case_file');
		expect(src).not.toContain('fetch(');
	});

	it('uses P126 explicit link copy module', () => {
		expect(src).toContain('p126EntityExplicitLinkCopy');
		expect(src).toContain('P126_EXPLICIT_LINK_LINK_TO_TIMELINE');
		expect(src).not.toMatch(/\$page\.params\.id/);
	});
});
