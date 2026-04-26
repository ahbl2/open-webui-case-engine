/**
 * P131-01 / P131-02 / P131-03 / P131.5-02 / P131.5-03 / P131.5-04 — UI contract: Command Center surfaces (source-level).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const panelPath = join(dirname(fileURLToPath(import.meta.url)), 'CommandCenterPanel.svelte');
const caseListPath = join(dirname(fileURLToPath(import.meta.url)), 'CommandCenterCaseList.svelte');
const activityFeedPath = join(dirname(fileURLToPath(import.meta.url)), 'CommandCenterActivityFeed.svelte');
const workflowSnapshotPath = join(dirname(fileURLToPath(import.meta.url)), 'CommandCenterWorkflowSnapshot.svelte');
const pagePath = join(dirname(fileURLToPath(import.meta.url)), '../../../routes/(app)/command-center/+page.ts');

describe('Command Center P131-01 UI contract', () => {
	it('panel exposes framing and mounts case list, activity feed, workflow snapshot', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('data-testid="command-center-framing"');
		expect(src).toContain('CommandCenterDashboardCard');
		expect(src).toMatch(/lg:grid-cols-12/);
		expect(src).toContain('data-p131-5-dashboard-grid="true"');
		expect(src).toContain('data-p131-5-dashboard-canvas="true"');
		expect(src).toContain('CommandCenterSummaryMetricCard');
		expect(src).toContain('command-center-summary-cases-in-scope');
		expect(src).toContain('command-center-summary-activity-rows');
		expect(src).toContain('command-center-summary-workflow-items');
		expect(src).toContain('command-center-summary-open-cases');
		expect(src).toContain('P131_5_COMMAND_CENTER_CASES_CARD_TITLE');
		expect(src).toContain('P131_5_COMMAND_CENTER_CASES_CARD_SUB');
		expect(src).toContain('P131_5_COMMAND_CENTER_ACTIVITY_CARD_TITLE');
		expect(src).toContain('P131_5_COMMAND_CENTER_WORKFLOW_CARD_TITLE');
		expect(src).toContain('CommandCenterCaseList');
		expect(src).toContain('CommandCenterActivityFeed');
		expect(src).toContain('CommandCenterWorkflowSnapshot');
		expect(src).not.toContain('command-center-placeholder-activity');
		expect(src).not.toContain('command-center-placeholder-workflow');
		expect(src).toContain('data-p131-command-center-readonly="true"');
		expect(src).toContain('P131_COMMAND_CENTER_CORE_PRINCIPLE');
		const listSrc = readFileSync(caseListPath, 'utf8');
		expect(listSrc).toContain('data-testid="command-center-case-list"');
		expect(listSrc).toContain('data-testid="command-center-case-row"');
		expect(listSrc).toContain('data-case-id');
		expect(listSrc).toContain('navigateCommandCenterToCaseWorkspace');
		expect(listSrc).toContain('fetchCommandCenterCaseRows');
		const actSrc = readFileSync(activityFeedPath, 'utf8');
		expect(actSrc).toContain('data-testid="command-center-activity-feed"');
		expect(actSrc).toContain('data-testid="command-center-activity-row"');
		expect(actSrc).toContain('data-testid="command-center-activity-case-link"');
		expect(actSrc).toContain('fetchCommandCenterActivityRows');
		expect(actSrc).toContain('navigateCommandCenterToCaseWorkspace');
		const wfSrc = readFileSync(workflowSnapshotPath, 'utf8');
		expect(wfSrc).toContain('data-testid="command-center-workflow-snapshot"');
		expect(wfSrc).toContain('data-testid="command-center-workflow-row"');
		expect(wfSrc).toContain('data-testid="command-center-workflow-case-link"');
		expect(wfSrc).toContain('fetchCommandCenterWorkflowRows');
		expect(wfSrc).toContain('navigateCommandCenterToCaseWorkspace');
	});

	it('legacy command-center route redirects to Home', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toContain("redirect(308, '/home')");
		expect(src).not.toContain('CommandCenterPanel');
	});
});
