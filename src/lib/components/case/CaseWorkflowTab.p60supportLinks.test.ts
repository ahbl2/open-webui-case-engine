/**
 * P60-04 — support links dock wired from Workflow tab (source contract).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tabSource = readFileSync(join(__dirname, 'CaseWorkflowTab.svelte'), 'utf8');
const panelSource = readFileSync(join(__dirname, 'WorkflowItemSupportLinksPanel.svelte'), 'utf8');

describe('CaseWorkflowTab P60-04 support links', () => {
	it('exposes Support refs control and dock outside list section, inside main work area', () => {
		expect(tabSource).toContain('data-testid="workflow-item-support-refs"');
		expect(tabSource).toContain('data-testid="workflow-support-links-dock"');
		expect(tabSource).toContain('WorkflowItemSupportLinksPanel');
		const main = tabSource.indexOf('data-testid="workflow-main-work-area"');
		const list = tabSource.indexOf('data-testid="workflow-items-list-section"');
		const dock = tabSource.indexOf('data-testid="workflow-support-links-dock"');
		const proposals = tabSource.indexOf('data-testid="workflow-proposals-panel"');
		expect(main).toBeGreaterThanOrEqual(0);
		expect(list).toBeGreaterThan(main);
		expect(dock).toBeGreaterThan(list);
		expect(proposals).toBeGreaterThan(dock);
	});

	it('clears support panel on case switch', () => {
		expect(tabSource).toContain('supportPanelItem = null');
	});
});

describe('CaseWorkflowTab P60-05 row support rendering', () => {
	it('adds Support refs column and chip anchors with navigation helpers', () => {
		expect(tabSource).toContain('Support refs');
		expect(tabSource).toContain('workflow-item-support-link-chips-');
		expect(tabSource).toContain('workflow-support-link-row-chip-');
		expect(tabSource).toContain('hrefForSupportLinkTarget');
		expect(tabSource).toContain('supportLinkKindBadgeClass');
		expect(tabSource).toContain('workflow-support-link-chip-kind-');
		expect(tabSource).toContain('workflow-support-link-row-stale');
		expect(tabSource).toContain('workflow-item-support-links-none');
		expect(tabSource).toContain('on:updated={refreshSupportLinkSummaries}');
	});

	it('loads parallel support link summaries after workflow items', () => {
		expect(tabSource).toContain('refreshSupportLinkSummaries');
		expect(tabSource).toContain('loadSupportLinkTargetIndex');
	});
});

describe('WorkflowItemSupportLinksPanel P60-04', () => {
	it('uses support-links API helpers and not citations', () => {
		expect(panelSource).toContain('listWorkflowSupportLinks');
		expect(panelSource).toContain('createWorkflowSupportLink');
		expect(panelSource).toContain('deleteWorkflowSupportLink');
		expect(panelSource).not.toMatch(/citations/i);
	});

	it('documents planning-only copy and MVP target kind pickers', () => {
		expect(panelSource).toContain('not an official record');
		expect(panelSource).toContain("data-testid={`workflow-support-link-pick-kind-${k}`}");
		expect(panelSource).toContain(
			"const kinds: WorkflowSupportTargetKind[] = ['TIMELINE_ENTRY', 'NOTEBOOK_NOTE', 'CASE_FILE']"
		);
	});

	it('guards remove with mutationBusy', () => {
		expect(panelSource).toMatch(/disabled=\{mutationBusy\}/);
	});

	it('uses fetchSeq for stale in-flight handling', () => {
		expect(panelSource).toContain('fetchSeq');
		expect(panelSource).toContain('seq !== fetchSeq');
	});
});

describe('WorkflowItemSupportLinksPanel P60-05', () => {
	it('renders kind badges, stale badge, primary label, and open-target link', () => {
		expect(panelSource).toContain('workflow-support-link-kind-');
		expect(panelSource).toContain('workflow-support-link-stale');
		expect(panelSource).toContain('workflow-support-link-primary-label');
		expect(panelSource).toContain('workflow-support-link-open-target');
		expect(panelSource).toContain('hrefForSupportLinkTarget');
		expect(panelSource).toContain("dispatch('updated')");
	});
});

describe('WorkflowItemSupportLinksPanel P60-06 guardrails', () => {
	it('mirrors server max link cap and surfaces at-limit UI + disabled add', () => {
		expect(panelSource).toContain('MAX_ACTIVE_SUPPORT_LINKS_PER_WORKFLOW_ITEM = 100');
		expect(panelSource).toContain('workflow-support-links-at-limit');
		expect(panelSource).toContain('atActiveLinkLimit');
		expect(panelSource).toContain('err.httpStatus === 400');
		expect(panelSource).toContain('err.httpStatus === 404');
	});
});

describe('WorkflowItemSupportLinksPanel P60-08 picker context preview', () => {
	it('uses shared picker row builders and hover/focus preview shell', () => {
		expect(panelSource).toContain("from '$lib/utils/workflowSupportLinkPicker'");
		expect(panelSource).toContain('buildTimelineSupportPickerRows');
		expect(panelSource).toContain('workflow-support-link-picker-shell');
		expect(panelSource).toContain('workflow-support-picker-preview');
		expect(panelSource).toContain('aria-describedby="workflow-support-picker-preview"');
		expect(panelSource).toContain('pickerHoverId');
		expect(panelSource).toContain('pickerFocusId');
		expect(panelSource).toContain('on:mouseenter');
		expect(panelSource).toContain('on:focusin');
		expect(panelSource).toContain('on:focusout');
	});

	it('keeps pick-target contract and createWorkflowSupportLink submit path', () => {
		expect(panelSource).toContain('data-testid="workflow-support-link-pick-target"');
		expect(panelSource).toContain('data-target-id={row.id}');
		expect(panelSource).toContain('submitLink(row.id)');
		expect(panelSource).toContain('createWorkflowSupportLink');
	});
});

describe('WorkflowItemSupportLinksPanel P60-09 picker search', () => {
	it('filters loaded rows client-side and resets query with picker lifecycle', () => {
		expect(panelSource).toContain('filterSupportLinkPickerRows');
		expect(panelSource).toContain('pickerFilteredRows');
		expect(panelSource).toContain('pickerSearchQuery');
		expect(panelSource).toContain('data-testid="workflow-support-link-picker-search"');
		expect(panelSource).toContain('data-testid="workflow-support-link-picker-no-matches"');
		expect(panelSource).toContain('bind:value={pickerSearchQuery}');
		expect(panelSource).toContain('pickerSearchQuery = \'\'');
	});

	it('clears hover/focus when the highlighted row is not in the filtered set', () => {
		expect(panelSource).toContain('pickerFilteredRows.map');
		expect(panelSource).toContain('ids.has(pickerHoverId)');
		expect(panelSource).toContain('ids.has(pickerFocusId)');
	});
});

describe('WorkflowItemSupportLinksPanel P60-10 picker polish', () => {
	it('distinguishes preview detail region and active row affordances without altering picker logic imports', () => {
		expect(panelSource).toContain('workflow-support-picker-preview-body');
		expect(panelSource).toContain('pickerPreviewId === row.id');
		expect(panelSource).toContain('Preview');
		expect(panelSource).toContain('Excerpt');
		expect(panelSource).toContain('filterSupportLinkPickerRows');
	});
});

describe('WorkflowItemSupportLinksPanel P60-11 saved reference display', () => {
	it('uses savedSupportLinkDisplay with secondary meta, bounded teaser, and stale fallback path', () => {
		expect(panelSource).toContain('savedSupportLinkDisplay');
		expect(panelSource).toContain('workflow-support-link-secondary-meta');
		expect(panelSource).toContain('workflow-support-link-teaser');
		expect(panelSource).toContain('savedRefDisplay');
		expect(panelSource).toContain('workflow-support-link-open-target');
		expect(panelSource).toContain('workflow-support-link-remove');
		expect(panelSource).toContain('workflow-support-link-stale');
	});
});

describe('WorkflowItemSupportLinksPanel P60-12 rich wiring', () => {
	it('uses shared stale helper so badge matches savedSupportLinkDisplay suppression', () => {
		expect(panelSource).toContain('isWorkflowSupportLinkStale');
	});
});

describe('WorkflowItemSupportLinksPanel P60-13 saved expanded preview', () => {
	it('click-to-expand single row with bounded preview region and preserve open/remove', () => {
		expect(panelSource).toContain('expandedSavedSupportLinkRowId');
		expect(panelSource).toContain('toggleSavedSupportLinkExpand');
		expect(panelSource).toContain('data-testid="workflow-support-link-expand-toggle"');
		expect(panelSource).toContain('data-testid="workflow-support-link-expanded-preview"');
		expect(panelSource).toContain('workflow-support-link-expanded-body');
		expect(panelSource).toContain('previewBody');
		expect(panelSource).toContain('workflow-support-link-open-target');
		expect(panelSource).toContain('workflow-support-link-remove');
		expect(panelSource).toContain('Hide details');
		expect(panelSource).toContain('expandedSavedSupportLinkRowId = null');
	});
});
