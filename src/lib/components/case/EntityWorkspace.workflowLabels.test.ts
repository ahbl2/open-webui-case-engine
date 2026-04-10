/**
 * P57-04 — Entity workspace workflow table uses same display labels as Workflow tab.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, 'EntityWorkspace.svelte'), 'utf8');

describe('EntityWorkspace workflow label presentation (P57-04)', () => {
	it('uses workflow display formatters in item table cells', () => {
		expect(src).toContain('{formatWorkflowItemTypeForDisplay(item.type)}');
		expect(src).toContain('{formatWorkflowStatusForDisplay(item.status)}');
		expect(src).toContain('{formatWorkflowOriginForDisplay(item.origin)}');
	});
});
