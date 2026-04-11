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

	it('keeps Edit Case as a global identity action (P70-04 §2.3)', () => {
		expect(headerSource).toContain('Edit Case');
		expect(headerSource).toContain('ce-l-identity-edit');
	});

	it('declares CaseWorkspaceHeader before CaseWorkspaceNav in layout template', () => {
		const afterScript = layoutSource.indexOf('</script>');
		const tmpl = layoutSource.slice(afterScript + 1);
		expect(tmpl.indexOf('<CaseWorkspaceHeader')).toBeLessThan(tmpl.indexOf('<CaseWorkspaceNav'));
	});

	it('identity secondary row uses DS chip + incident meta (P76-04; Tier L identity bar)', () => {
		expect(headerSource).toContain('DS_CHIP_CLASSES.base');
		expect(headerSource).toContain('data-testid="case-identity-secondary"');
		expect(headerSource).toContain('{#if meta.incident_date}');
	});

	it('exposes case title tooltip for truncated titles', () => {
		expect(headerSource).toContain('displayCaseTitle(meta.title)');
	});
});
