/**
 * P98-03 — CaseTasksPanel embeds TasksDeclaredRelationshipsBlock (source contract; mount-free).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const panelPath = join(dirname(fileURLToPath(import.meta.url)), 'CaseTasksPanel.svelte');

describe('CaseTasksPanel P98-03', () => {
	it('imports and places TasksDeclaredRelationshipsBlock before CaseTaskCrossRefsSection', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain("import TasksDeclaredRelationshipsBlock from './TasksDeclaredRelationshipsBlock.svelte'");
		expect(src).toContain('<TasksDeclaredRelationshipsBlock {caseId} {task} />');
		const p98 = (src.match(/<TasksDeclaredRelationshipsBlock/g) ?? []).length;
		const cross = (src.match(/<CaseTaskCrossRefsSection/g) ?? []).length;
		expect(p98).toBe(cross);
		expect(p98).toBeGreaterThanOrEqual(4);
	});

	it('P98-04 TasksDeclaredRelationshipsBlock uses goto for same-case navigation', () => {
		const blockPath = join(dirname(fileURLToPath(import.meta.url)), 'TasksDeclaredRelationshipsBlock.svelte');
		const block = readFileSync(blockPath, 'utf8');
		expect(block).toMatch(/from '\$app\/navigation'/);
		expect(block).toContain('navigateFromDeclaredRelationshipRow');
		expect(block).toContain('data-testid="case-tasks-p98-declared-navigate"');
		expect(block).toContain('P98_DECLARED_RELATIONSHIP_REGION_ARIA');
		expect(block).not.toMatch(/aria-label="Declared same-case connections"/);
	});
});
