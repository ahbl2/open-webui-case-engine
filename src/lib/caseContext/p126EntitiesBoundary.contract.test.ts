/**
 * P126-05 — Entity boundary enforcement: copy modules, framing, panels; no taboo inference vocabulary; no page id leakage.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const boundaryCopy = join(__dirname, 'p126EntitiesBoundaryCopy.ts');
const framingCopy = join(__dirname, 'p126EntityFramingCopy.ts');
const listDetailCopy = join(__dirname, 'p126EntityListDetailCopy.ts');
const explicitLinkCopy = join(__dirname, 'p126EntityExplicitLinkCopy.ts');
const p124Surface = join(__dirname, 'p124SurfaceSeparationCopy.ts');
const framingPath = join(__dirname, '../components/case/CaseEntitiesFraming.svelte');
const entitiesPanel = join(__dirname, '../components/case/CaseEntitiesPanel.svelte');
const detailPanel = join(__dirname, '../components/case/CaseEntityDetailPanel.svelte');
const evidenceForm = join(__dirname, '../components/case/CaseEntityEvidenceLinkForm.svelte');

describe('p126EntitiesBoundaryCopy (P126-05)', () => {
	it('is static exports only', () => {
		const src = readFileSync(boundaryCopy, 'utf8');
		expect(src).toMatch(/P126_ENTITIES_BOUNDARY_DISCIPLINE_LINE/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\$page/);
	});
});

describe('P126-05 taboo vocabulary (copy modules + P124 sidebar hint)', () => {
	const combined = [
		boundaryCopy,
		framingCopy,
		listDetailCopy,
		explicitLinkCopy,
		p124Surface
	]
		.map((p) => readFileSync(p, 'utf8').toLowerCase())
		.join('\n');

	const taboo = [
		/\bdetected\b/,
		/\bfound\b/,
		/\bmatched\b/,
		/\blikely\b/,
		/\bpossible\b/,
		/\brelated\b/,
		/\bbest\b/,
		/\btop\b/,
		/\bconfidence\b/,
		/\bpriority\b/
	];

	it('avoids inference / ranking product words in audited strings', () => {
		for (const re of taboo) {
			expect(combined).not.toMatch(re);
		}
	});
});

describe('P126-05 wiring and isolation', () => {
	it('CaseEntitiesFraming mounts boundary discipline (flat copy; no store)', () => {
		const src = readFileSync(framingPath, 'utf8');
		expect(src).toMatch(/data-testid="case-entities-boundary-discipline"/);
		expect(src).toMatch(/P126_ENTITIES_BOUNDARY_DISCIPLINE_LINE/);
		expect(src).not.toMatch(/\$page\.params\.id/);
		expect(src).not.toMatch(/localStorage|sessionStorage/);
	});

	it('entity list, detail, and link form avoid $page.params.id', () => {
		for (const p of [entitiesPanel, detailPanel, evidenceForm]) {
			expect(readFileSync(p, 'utf8')).not.toMatch(/\$page\.params\.id/);
		}
	});

	it('entity list remains a flat ul (no grouped intelligence layout)', () => {
		const src = readFileSync(entitiesPanel, 'utf8');
		expect(src).toMatch(/data-testid="case-entities-panel--list"/);
		expect(src).not.toMatch(/groupBy|cluster|network/i);
	});
});
