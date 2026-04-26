/**
 * P57-04 — CaseWorkflowTab uses display formatters for operator-facing copy; binding values stay internal.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');
const createFormSource = readFileSync(join(__dirname, 'CaseWorkflowCreateForm.svelte'), 'utf8');

describe('CaseWorkflowTab label presentation (P57-04)', () => {
	it('renders table type/status/origin through display formatters', () => {
		expect(tabSource).toContain('{formatWorkflowItemTypeForDisplay(item.type)}');
		expect(tabSource).toContain('{formatWorkflowStatusForDisplay(item.status)}');
		expect(tabSource).toContain('{formatWorkflowOriginForDisplay(item.origin)}');
		expect(tabSource).not.toContain('<span class="font-medium">{item.type}</span>');
	});

	it('keeps P127 create-form values internal (Phase 117 operational types)', () => {
		expect(createFormSource).toContain('<option value="TASK">');
		expect(createFormSource).toContain('<option value="LEAD">');
		expect(createFormSource).toMatch(/bind:value=\{workflowType\}/);
	});

	it('keeps list-tab type select values aligned with P13 list filters (lowercase tab keys → API type)', () => {
		expect(tabSource).toContain('<option value="all">All Items</option>');
		expect(tabSource).toContain('<option value="hypothesis">Hypotheses</option>');
		expect(tabSource).toContain('<option value="gap">Gaps</option>');
		expect(tabSource).toContain('<option value="completed">Completed</option>');
	});

	it('formats edit status dropdown labels while preserving value binding (P13 edit modal)', () => {
		expect(tabSource).toContain('<option value={s}>{formatWorkflowStatusForDisplay(s)}</option>');
		expect(tabSource).toContain('bind:value={editStatus}');
	});

	it('formats proposal panel status and type lines for display', () => {
		expect(tabSource).toContain('{formatWorkflowStatusForDisplay(p.status)}');
		expect(tabSource).toContain('proposedItemTypeDisplay(p)');
		expect(tabSource).toContain('formatWorkflowStatusForDisplay(p.suggested_payload.status)');
	});

	it('does not change list tab value assignments (replaces prior filter=)', () => {
		expect(tabSource).toContain("listTab = 'hypothesis'");
		expect(tabSource).toContain("listTab = 'gap'");
		expect(tabSource).toContain("listTab = 'all'");
	});
});
