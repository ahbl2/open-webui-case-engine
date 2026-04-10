/**
 * P57-04 — CaseWorkflowTab uses display formatters for operator-facing copy; binding values stay internal.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');

describe('CaseWorkflowTab label presentation (P57-04)', () => {
	it('renders table type/status/origin through display formatters', () => {
		expect(tabSource).toContain('{formatWorkflowItemTypeForDisplay(item.type)}');
		expect(tabSource).toContain('{formatWorkflowStatusForDisplay(item.status)}');
		expect(tabSource).toContain('{formatWorkflowOriginForDisplay(item.origin)}');
		expect(tabSource).not.toContain('<span class="font-medium">{item.type}</span>');
	});

	it('keeps select option values as internal enums', () => {
		expect(tabSource).toContain('<option value="HYPOTHESIS">');
		expect(tabSource).toContain('<option value="GAP">');
		expect(tabSource).toMatch(/bind:value=\{createType\}/);
		expect(tabSource).toContain("{formatWorkflowItemTypeForDisplay('HYPOTHESIS')}");
	});

	it('formats create/edit status dropdown labels while preserving value binding', () => {
		expect(tabSource).toContain('<option value={s}>{formatWorkflowStatusForDisplay(s)}</option>');
		expect(tabSource).toContain('bind:value={createStatus}');
		expect(tabSource).toContain('bind:value={editStatus}');
	});

	it('formats proposal panel status and type lines for display', () => {
		expect(tabSource).toContain('{formatWorkflowStatusForDisplay(p.status)}');
		expect(tabSource).toContain('proposedItemTypeDisplay(p)');
		expect(tabSource).toContain('formatWorkflowStatusForDisplay(p.suggested_payload.status)');
	});

	it('does not change filter value assignments', () => {
		expect(tabSource).toContain("filter = 'HYPOTHESIS'");
		expect(tabSource).toContain("filter = 'GAP'");
		expect(tabSource).toContain("filter = 'all'");
	});
});
