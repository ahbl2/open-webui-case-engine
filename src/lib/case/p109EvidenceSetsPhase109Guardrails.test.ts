/**
 * P109-05 — Phase 109 evidence set surfaces: forbidden wording and prohibited controls (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as copy from './p109EvidenceSetsCopy';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../..');
const panelManagement = readFileSync(join(repoRoot, 'src/lib/components/case/CaseEvidenceSetsPanel.svelte'), 'utf8');
const panelDetail = readFileSync(join(repoRoot, 'src/lib/components/case/CaseEvidenceSetDetailPanel.svelte'), 'utf8');
const nav = readFileSync(join(repoRoot, 'src/lib/components/case/CaseWorkspaceNav.svelte'), 'utf8');

const copyStrings = Object.values(copy).filter((v) => typeof v === 'string') as string[];

function assertNoForbiddenWording(label: string, text: string): void {
	const forbidden =
		/\b(ai|artificial intelligence|machine learning|llm|gpt|inference engine|automated analysis|curated evidence|linked evidence|smart grouping|investigative conclusion|export ready|report generated|download package|pdf generated)\b/i;
	expect(text, label).not.toMatch(forbidden);
	// Workflow / authority drift (not negated “not a …” lines — use sparingly)
	const drift =
		/\b(approve[ds]?|approved workflow|validation workflow|peer review|evidence package|evidence report|forensic analysis)\b/i;
	expect(text, label).not.toMatch(drift);
}

describe('P109-05 copy guardrails', () => {
	it('string exports avoid disallowed framing', () => {
		for (const s of copyStrings) {
			assertNoForbiddenWording(`copy: ${s.slice(0, 40)}…`, s);
		}
	});

	it('audit attribution helper uses explicit saved-at / saved-by wording', () => {
		const line = copy.P109_EVIDENCE_SET_AUDIT_ATTRIBUTION_LINE('Jan 1, 2020, 12:00 PM', 'user-uuid');
		expect(line).toMatch(/Saved at:/i);
		expect(line).toMatch(/Saved by \(user id\):/i);
		expect(line).toContain('user-uuid');
	});
});

describe('P109-05 surface guardrails (Svelte sources)', () => {
	const combined = `${panelManagement}\n${panelDetail}\n${nav}`;

	it('management + detail + nav avoid forbidden wording in source', () => {
		assertNoForbiddenWording('combined surfaces', combined);
	});

	it('detail panel has no mutation / lifecycle controls; P110-04/P111 read-only output buttons only', () => {
		expect(panelDetail).toMatch(/data-ce-p110-output-action/);
		expect(panelDetail).toContain('case-evidence-set-detail--copy-output');
		expect(panelDetail).toContain('case-evidence-set-detail--download-output');
		const buttonCount = (panelDetail.match(/<button\b/gi) || []).length;
		expect(buttonCount).toBe(4);
		expect(panelDetail).not.toMatch(/<input\b/i);
		const afterScript = panelDetail.includes('</script>')
			? panelDetail.slice(panelDetail.indexOf('</script>') + '</script>'.length)
			: panelDetail;
		// Quoted attrs (e.g. ="export-…") and hyphenated ids (--export-docx) must not trip the export guard.
		expect(afterScript).not.toMatch(/\b(delete|retire|restore|rename|add item|remove item)\b|(?<!["-])\bexport\b/i);
	});

	it('detail panel marks read-only surface', () => {
		expect(panelDetail).toContain('data-ce-p109-surface="evidence-set-readonly"');
		expect(panelDetail).toContain('case-evidence-set-detail--readonly-badge');
	});

	it('management panel has no bulk select or lifecycle wording in controls', () => {
		expect(panelManagement).not.toMatch(/select all|bulk select/i);
		expect(panelManagement).not.toMatch(/\b(delete|retire|restore|rename)\b/i);
	});

	it('nav imports evidence set label from centralized copy', () => {
		expect(nav).toContain("from '$lib/case/p109EvidenceSetsCopy'");
		expect(nav).toContain('P109_EVIDENCE_SETS_NAV_LABEL');
	});
});
