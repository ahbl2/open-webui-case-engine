/**
 * P110-05 — Output surface constraint and wording guardrails (detail panel + P110 copy).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as p110copy from './p110EvidenceSetOutputPreviewCopy';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../..');
const panelPath = join(repoRoot, 'src/lib/components/case/CaseEvidenceSetDetailPanel.svelte');
const panelSrc = readFileSync(panelPath, 'utf8');
const afterScript = panelSrc.includes('</script>')
	? panelSrc.slice(panelSrc.indexOf('</script>') + '</script>'.length)
	: panelSrc;

const p110Strings = Object.values(p110copy).filter((v) => typeof v === 'string') as string[];

/** P110-05 — Stricter drift list for output surfaces (additive to P109-style checks). */
function assertP11005Safe(label: string, text: string): void {
	const p110Drift =
		/\b(official report|narrative summary|forensic analysis|export package|report generated|ai analysis|machine learning inference|validation workflow|peer review sign[- ]off|print layout)\b/i;
	expect(text, label).not.toMatch(p110Drift);
	const lifecycle =
		/\b(edit|rename|delete|restore|retire|add item|remove item|bulk output|format selector|report builder)\b/i;
	expect(text, label).not.toMatch(lifecycle);
}

describe('p110EvidenceSetOutputSurfaceConstraints (P110-05)', () => {
	it('P110 copy strings stay Phase-110-safe', () => {
		for (const s of p110Strings) {
			assertP11005Safe(`p110 copy: ${s.slice(0, 40)}…`, s);
		}
	});

	it('detail panel markup after script has four read-only output buttons (copy, plain download, DOCX, PDF) and no prohibited controls', () => {
		expect((afterScript.match(/<button\b/gi) || []).length).toBe(4);
		expect(afterScript).not.toMatch(/<input\b|<select\b/i);
		assertP11005Safe('detail panel markup', afterScript);
	});

	it('output preview exposes traceability test id and composition version wiring', () => {
		expect(panelSrc).toContain('case-evidence-set-detail--output-traceability');
		expect(panelSrc).toContain('P110_OUTPUT_VERSION_LINE');
		expect(panelSrc).toContain('P110_COMPOSITION_RULES_VERSION');
		expect(panelSrc).toContain('formatEvidenceSetSavedAt(row.created_at)');
		expect(panelSrc).toContain('formatEvidenceSetSavedAt(f.created_at)');
	});
});
