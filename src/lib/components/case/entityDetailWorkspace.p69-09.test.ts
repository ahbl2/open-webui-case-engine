/**
 * P69-09 — Entity detail workspace in focus mode (P69-06 source contracts).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'EntityDetailWorkspace.svelte'), 'utf8');

describe('EntityDetailWorkspace (P69-09)', () => {
	it('implements shell regions: header, primary tabs, overview grid, deep tabs', () => {
		expect(source).toContain('data-testid="entity-detail-workspace"');
		expect(source).toContain('data-testid="entity-detail-header"');
		expect(source).toContain('data-testid="entity-detail-primary-tabstrip"');
		expect(source).toContain('data-testid="entity-detail-overview-grid"');
		expect(source).toContain('data-testid="entity-detail-tab-{tab.id}"');
		expect(source).toContain("{ id: 'overview', label: 'Overview' }");
		expect(source).toContain("{ id: 'associations', label: 'Associations' }");
	});

	it('implements Overview cards per P69-06 §3 (Tags hidden MVP)', () => {
		expect(source).toContain('data-testid="entity-detail-card-details"');
		expect(source).toContain('data-testid="entity-detail-card-status"');
		expect(source).toContain('data-testid="entity-detail-card-associations-summary"');
		expect(source).toContain('data-testid="entity-detail-card-timeline"');
		expect(source).toContain('data-testid="entity-detail-card-files"');
		expect(source).toContain('data-testid="entity-detail-card-notes"');
		expect(source).toContain('data-testid="entity-detail-card-ai-assist"');
		expect(source).not.toContain('entity-detail-card-tags');
	});

	it('implements quick-link pills and deferred deep-tab shells', () => {
		expect(source).toContain('data-testid="entity-detail-quick-pills"');
		expect(source).toContain('data-testid="entity-detail-pill-proposals"');
		expect(source).toContain('data-testid="entity-detail-deep-timeline"');
		expect(source).toContain('data-testid="entity-detail-deep-history"');
		expect(source).toContain('data-testid="entity-detail-deep-files"');
	});

	it('exposes dirty hook and discard API for focus shell gates', () => {
		expect(source).toContain('onDetailDirtyChange');
		expect(source).toContain('discardUnsavedWorkspaceDraft');
		expect(source).toContain('data-testid="entity-detail-notes-draft"');
	});

	it('gates edit action and uses listCaseIntelligenceAssociationsForEntity for summary', () => {
		expect(source).toContain('data-testid="entity-detail-action-edit-disabled"');
		expect(source).toContain('listCaseIntelligenceAssociationsForEntity');
	});
});
