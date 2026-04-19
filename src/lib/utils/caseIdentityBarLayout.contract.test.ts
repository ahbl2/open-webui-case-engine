/**
 * P71-03 — Case identity bar layout contract (P70-04 §2).
 * P82-02 — Identity markup lives in `CaseWorkspaceHeader.svelte`; layout mounts the header component.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const layoutPath = join(__dirname, '../../routes/(app)/case/[id]/+layout.svelte');
const headerPath = join(__dirname, '../components/case/CaseWorkspaceHeader.svelte');
const layoutSource = readFileSync(layoutPath, 'utf8');
const headerSource = readFileSync(headerPath, 'utf8');

describe('case identity bar layout (P71-03 / P70-04)', () => {
	it('mounts CaseWorkspaceHeader from the case layout', () => {
		expect(layoutSource).toContain('CaseWorkspaceHeader');
	});

	it('uses Tier L identity bar hooks and test ids for shell states (header component)', () => {
		expect(headerSource).toContain('ce-l-identity-bar');
		expect(headerSource).toContain('data-testid="case-identity-bar"');
		expect(headerSource).toContain('data-testid="case-shell-loaded"');
		expect(headerSource).toContain('data-testid="case-shell-loading"');
		expect(headerSource).toContain('data-testid="case-shell-load-error"');
	});

	it('keeps Edit case as a global identity action (P70-04 §2.3)', () => {
		expect(headerSource).toContain('Edit case');
		expect(headerSource).toContain('data-testid="case-shell-edit"');
		expect(headerSource).toContain('DS_BTN_CLASSES.secondary');
	});

	it('declares CaseWorkspaceHeader before CaseWorkspaceLayoutShell in layout template', () => {
		const afterScript = layoutSource.indexOf('</script>');
		const tmpl = layoutSource.slice(afterScript + 1);
		expect(tmpl.indexOf('<CaseWorkspaceHeader')).toBeLessThan(tmpl.indexOf('<CaseWorkspaceLayoutShell'));
	});

	it('identity primary row ends with status pill; secondary row has lead + incident + last updated', () => {
		expect(headerSource).toContain('caseStatusDsBadgeCompound');
		expect(headerSource).toContain('data-testid="case-identity-primary"');
		expect(headerSource).toContain('data-testid="case-identity-secondary"');
		expect(headerSource).toContain('Lead Detective');
		expect(headerSource).toContain('{#if meta.incident_date}');
		expect(headerSource).toContain('Last updated');
	});

	it('exposes case title tooltip for truncated titles', () => {
		expect(headerSource).toContain('displayCaseTitle(meta.title)');
	});
});
