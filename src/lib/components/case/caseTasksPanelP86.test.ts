/**
 * P86 / P87 / P89-07 — CaseTasksPanel + tasks route (source contract; mount-free).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseTasksPanel.svelte');
const taskOperationalRowMetaPath = join(here, 'TaskOperationalRowMeta.svelte');
const caseTaskRowContextSignalsPath = join(here, 'CaseTaskRowContextSignals.svelte');
const caseTaskPinTogglePath = join(here, 'CaseTaskPinToggle.svelte');
const crossRefsSectionPath = join(here, 'CaseTaskCrossRefsSection.svelte');
const pagePath = join(here, '../../../routes/(app)/case/[id]/tasks/+page.svelte');
const modelPath = join(here, '../../case/caseTaskModel.ts');
const caseTasksApiPath = join(here, '../../apis/caseEngine/caseTasksApi.ts');

describe('P86-01 CaseTasksPanel (operational shell)', () => {
	it('labels operational tasks and non-authoritative semantics', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/Tasks \(Operational\)/);
		expect(src).toMatch(/Non-authoritative/);
		expect(src).toMatch(/No tasks in this case yet/);
		expect(src).toMatch(/not part of the official Timeline/i);
	});

	it('does not use Timeline DS classes or entry components', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/ds-timeline-/);
		expect(src).not.toMatch(/TimelineEntryCard/);
		expect(src).not.toMatch(/DS_TIMELINE_CLASSES/);
	});

	it('exposes stable test ids for workspace integration tests', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/data-testid="case-tasks-panel"/);
		expect(src).toMatch(/data-testid="case-tasks-empty-state"/);
	});
});

describe('P87-01 CaseTasksPanel (orientation)', () => {
	it('exposes always-visible orientation and section hierarchy', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/data-testid="case-tasks-orientation"/);
		expect(src).toMatch(/data-testid="case-tasks-hero-eyebrow"/);
		expect(src).toMatch(/data-testid="case-tasks-workspace-section-heading"/);
		expect(src).toMatch(/committed official case record/);
		expect(src).toMatch(/DS_WORKFLOW_CLASSES/);
		expect(src).toMatch(/DS_WORKFLOW_TEXT_CLASSES/);
		expect(src).toMatch(/DS_PANEL_CLASSES/);
	});

	it('does not use misleading persistence wording (saved/recorded/logged/stored)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\b(saved|recorded|logged|stored)\b/i);
	});
});

describe('P89-07 CaseTasksPanel (Case Engine persistence)', () => {
	it('imports Case Engine task API and token store; no parallel in-memory authoritative model', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain("$lib/apis/caseEngine/caseTasksApi");
		expect(src).toContain('caseEngineToken');
		expect(src).toContain('listCaseTasks');
		expect(src).not.toMatch(/crypto\.randomUUID/);
		expect(src).not.toMatch(/tasks = \[task, \.\.\.tasks\]/);
	});

	it('does not imply Timeline authority or occurred_at', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\boccurred_at\b/);
		expect(src).toMatch(/data-testid="case-tasks-section-open-hint"/);
		expect(src).toMatch(/data-testid="case-tasks-section-completed-hint"/);
	});

	it('surfaces load error and action error test ids', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/data-testid="case-tasks-load-error"/);
		expect(src).toMatch(/data-testid="case-tasks-action-error"/);
		expect(src).toMatch(/data-testid="case-tasks-loading"/);
	});

	it('wires lifecycle and delete/restore actions', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('postCaseTaskComplete');
		expect(src).toContain('postCaseTaskArchive');
		expect(src).toContain('postCaseTaskReopen');
		expect(src).toContain('postCaseTaskSoftDelete');
		expect(src).toContain('postCaseTaskRestore');
		expect(src).toMatch(/data-testid="case-tasks-restore-undo"/);
		expect(src).toMatch(/data-testid="case-tasks-section-archived"/);
	});
});

describe('P90-01 CaseTasksPanel (client-side filters)', () => {
	it('uses applyCaseTaskFilters and exposes filter test ids', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('applyCaseTaskFilters');
		expect(src).toContain('CaseTaskStatusFilter');
		expect(src).toMatch(/data-testid="case-tasks-filters"/);
		expect(src).toMatch(/data-testid="case-tasks-filter-status"/);
		expect(src).not.toMatch(/data-testid="case-tasks-filter-text"/);
		expect(src).toMatch(/data-testid="case-tasks-filter-empty"/);
		expect(src).toMatch(/data-testid="case-tasks-filter-empty-hint"/);
		expect(src).toMatch(/No tasks match your search or filters/);
		expect(src).toMatch(/showOpenSection/);
		expect(src).toMatch(/showCompletedSection/);
		expect(src).toMatch(/showArchivedSection/);
	});
});

describe('P90-02 CaseTasksPanel (created-order sort)', () => {
	it('uses sortCaseTasksForList and exposes sort controls', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('sortCaseTasksForList');
		expect(src).toContain('CaseTaskListSortMode');
		expect(src).toContain('sortedFilteredTasks');
		expect(src).toMatch(/data-testid="case-tasks-sort-controls"/);
		expect(src).toMatch(/data-testid="case-tasks-sort-field"/);
		expect(src).toMatch(/data-testid="case-tasks-sort-direction"/);
		expect(src).toMatch(/data-testid="case-tasks-sort-active-summary"/);
		expect(src).toMatch(/data-testid="case-tasks-sort-hint"/);
		expect(src).toMatch(/Sort orders this list for scanning only/);
	});

	it('does not imply Timeline occurred_at ordering', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\boccurred_at\b/);
	});
});

describe('P92-01 CaseTasksPanel (multi-criteria)', () => {
	it('wires multi-criteria model helpers and filter controls', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('applyCaseTaskMultiCriteriaFilters');
		expect(src).toContain('caseTaskMultiCriteriaFilterFromUiState');
		expect(src).toContain('collectDistinctCaseTaskGroupLabels');
		expect(src).toContain('CASE_TASK_FILTER_UNASSIGNED');
		expect(src).toMatch(/data-testid="case-tasks-filter-assignee"/);
		expect(src).toMatch(/data-testid="case-tasks-filter-due"/);
		expect(src).toMatch(/data-testid="case-tasks-filter-group"/);
		expect(src).toMatch(/data-testid="case-tasks-filter-priority-low"/);
		expect(src).toMatch(/data-testid="case-tasks-clear-filters"/);
	});
});

describe('P92-02 CaseTasksPanel (debounced search)', () => {
	it('wires dedicated search row and applyCaseTaskTextSearch', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('applyCaseTaskTextSearch');
		expect(src).toContain('TASK_SEARCH_DEBOUNCE_MS');
		expect(src).toContain('taskSearchInputRaw');
		expect(src).toContain('taskSearchQuery');
		expect(src).toContain('clearTaskSearchImmediate');
		expect(src).toContain('onDestroy');
		expect(src).toMatch(/data-testid="case-tasks-search-input"/);
		expect(src).toMatch(/data-testid="case-tasks-search-clear"/);
		expect(src).toMatch(/data-testid="case-tasks-search-active"/);
		expect(src).toMatch(/data-testid="case-tasks-search-row"/);
	});
});

describe('P91-05 CaseTasksPanel (operational field coherence)', () => {
	it('groups Phase 91 fields in create/edit and shared row meta', () => {
		const src = readFileSync(panelPath, 'utf8');
		const metaSrc = readFileSync(taskOperationalRowMetaPath, 'utf8');
		expect(src).toMatch(/data-testid="case-tasks-operational-fields"/);
		expect(src).toMatch(/data-testid="case-tasks-edit-operational-fields"/);
		expect(metaSrc).toMatch(/data-testid="case-tasks-row-operational-meta"/);
		expect(src).toMatch(/Operational tracking \(optional\)/);
		expect(src).toContain('TaskOperationalRowMeta');
	});
});

describe('P90-03 CaseTasksPanel (row expand / scannable layout)', () => {
	it('uses caseTaskShouldOfferDetailToggle and per-row expanded state', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('caseTaskShouldOfferDetailToggle');
		expect(src).toContain('expandedTaskIds');
		expect(src).toContain('toggleTaskExpanded');
		expect(src).toMatch(/data-testid="case-tasks-row-toggle"/);
		expect(src).toMatch(/data-testid="case-tasks-row-detail"/);
		expect(src).toMatch(/data-task-expanded=/);
		expect(src).toMatch(/aria-expanded=\{expandedTaskIds\.has/);
	});

	it('resets expanded state when clearing case/token key', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/expandedTaskIds = new Set\(\)/);
	});

	it('does not add occurred_at or official chronology wording to row detail', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\boccurred_at\b/);
		expect(src).not.toMatch(/official chronology/i);
	});
});

describe('P90-04 CaseTasksPanel (lifecycle attribution)', () => {
	it('imports attribution formatters and exposes attribution test ids', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('formatCaseTaskCompletionAttribution');
		expect(src).toContain('formatCaseTaskArchiveAttribution');
		expect(src).toMatch(/data-testid="case-tasks-completion-attribution"/);
		expect(src).toMatch(/data-testid="case-tasks-archive-attribution"/);
	});
});

describe('P90-05 CaseTasksPanel (soft-deleted read-only visibility)', () => {
	it('exposes show-deleted control and deleted section', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('showDeleted');
		expect(src).toContain('includeDeleted');
		expect(src).toContain('activeTasks');
		expect(src).toContain('sortCaseTasksByDeletedAtDesc');
		expect(src).toContain('formatCaseTaskSoftDeleteAttribution');
		expect(src).toMatch(/data-testid="case-tasks-show-deleted"/);
		expect(src).toMatch(/data-testid="case-tasks-section-deleted"/);
		expect(src).toMatch(/data-testid="case-tasks-item-deleted"/);
		expect(src).toMatch(/Soft-deleted \(awareness only\)/);
	});

	it('does not add occurred_at', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\boccurred_at\b/);
	});
});

describe('P90-06 CaseTasksPanel (Tasks vs Timeline copy)', () => {
	it('frames Tasks as operational and reinforces Timeline as the committed record in orientation', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/Follow-up and work tracking only/);
		expect(src).toMatch(/committed official case record/);
		expect(src).toMatch(/P90-06/);
	});

	it('does not use occurred_at or Task-surface Timeline chronology phrasing', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\boccurred_at\b/);
		expect(src).not.toMatch(/Timeline chronology/);
	});

	it('keeps reference-only wording for optional Timeline entry link', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/Optional link to a Timeline entry \(reference only\)/);
		expect(src).toMatch(/Linked Timeline Entry \(reference\)/);
	});
});

describe('P86-04 CaseTasksPanel (reference-only Timeline link)', () => {
	it('renders linked id and View in Timeline when linkedTimelineEntryId is set', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/#if task\.linkedTimelineEntryId/);
		expect(src).toMatch(/data-testid="case-tasks-linked-id"/);
		expect(src).toMatch(/data-testid="case-tasks-view-timeline"/);
		expect(src).toMatch(/data-testid="case-tasks-create-link-entry-id"/);
	});

	it('navigates to case Timeline with highlight query', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('/timeline?highlight=');
		expect(src).toContain('encodeURIComponent(entryId)');
	});
});

describe('P91-06 CaseTasksPanel (Tasks vs Timeline guardrails)', () => {
	const CANONICAL_BADGE_TITLE = 'Operational tasks — not part of the official Timeline';
	const SECTION_HINT = 'Operational · Not part of Timeline';

	it('uses canonical badge title and section hints across the panel', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain(`title="${CANONICAL_BADGE_TITLE}"`);
		expect(src).toContain(`const CASE_TASK_SECTION_HINT = '${SECTION_HINT}'`);
		const braceUses = src.match(/\{CASE_TASK_SECTION_HINT\}/g);
		expect(braceUses?.length).toBe(3);
	});

	it('keeps sort hint and aria-label explicitly non-Timeline and non-workflow', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/Sort orders this list for scanning only/);
		expect(src).toMatch(/not scheduling, SLA, workflow, or Timeline/);
		expect(src).toMatch(
			/aria-label="Sort by field \(operational list; not Timeline ordering\)"/
		);
	});

	it('does not introduce Timeline logging, promotion, or conversion affordances', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\boccurred_at\b/);
		expect(src).not.toMatch(/official chronology/i);
		expect(src).not.toMatch(/log (this )?task to (the )?timeline/i);
		expect(src).not.toMatch(/promote (this )?task to (the )?timeline/i);
		expect(src).not.toMatch(/convert (this )?task to (a )?timeline entry/i);
	});

	it('clarifies View in Timeline as navigation-only (not logging or promotion)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('VIEW_LINKED_TIMELINE_ENTRY_TITLE');
		expect(src).toMatch(/title=\{VIEW_LINKED_TIMELINE_ENTRY_TITLE\}/);
		expect(src).toMatch(/Does not log or promote this task/);
	});

	it('TaskOperationalRowMeta keeps operational-only tooltips (no Timeline authority)', () => {
		const src = readFileSync(taskOperationalRowMetaPath, 'utf8');
		expect(src).not.toMatch(/\boccurred_at\b/);
		expect(src).toMatch(/not workflow routing/);
		expect(src).toMatch(/scanning only/);
		expect(src).toMatch(/committed Timeline authority/);
	});
});

describe('P92-03 CaseTasksPanel (density / view modes)', () => {
	it('exposes density toggle test ids and row/list presentation hooks', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/data-testid="case-tasks-density-toggle"/);
		expect(src).toMatch(/data-testid="case-tasks-density-expanded"/);
		expect(src).toMatch(/data-testid="case-tasks-density-compact"/);
		expect(src).toMatch(/task-row--expanded/);
		expect(src).toMatch(/task-row--compact/);
		expect(src).toMatch(/data-task-density=\{taskDensityMode\}/);
		expect(src).toMatch(/taskDensityMode = 'expanded'/);
	});

	it('defaults and resets density on case/token change; no persistence', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/let taskDensityMode: TaskDensityMode = 'expanded'/);
		const resetMatches = src.match(/taskDensityMode = 'expanded'/g);
		expect(resetMatches?.length).toBeGreaterThanOrEqual(2);
		expect(src).not.toMatch(/localStorage/);
	});

	it('passes density to TaskOperationalRowMeta (presentation only)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/density=\{taskDensityMode\}/);
		const metaSrc = readFileSync(taskOperationalRowMetaPath, 'utf8');
		expect(metaSrc).toMatch(/task-operational-meta--compact/);
		expect(metaSrc).toMatch(/task-operational-meta--expanded/);
	});

	it('does not add occurred_at, workflow automation, or data mutation', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\boccurred_at\b/);
		expect(src).not.toMatch(/notification/i);
		expect(src).not.toMatch(/cron|schedule\(/i);
	});

	it('keeps filter/sort pipeline independent of density mode', () => {
		const src = readFileSync(panelPath, 'utf8');
		const filteredLine = src.match(/\$: filteredTasks = applyCaseTaskMultiCriteriaFilters\([^;]+;/);
		expect(filteredLine?.[0]).toBeDefined();
		expect(filteredLine?.[0]).not.toContain('taskDensityMode');
		const multiLine = src.match(
			/\$: multiCriteriaFilter = caseTaskMultiCriteriaFilterFromUiState\([^;]+;/
		);
		expect(multiLine?.[0]).toBeDefined();
		expect(multiLine?.[0]).not.toContain('taskDensityMode');
		const sortedBlock = src.match(/\$: sortedFilteredTasks = sortCaseTasksForList\([^;]+;/);
		expect(sortedBlock?.[0]).toBeDefined();
		expect(sortedBlock?.[0]).not.toContain('taskDensityMode');
	});

	it('keeps filter/sort pipeline independent of P93 grouping mode', () => {
		const src = readFileSync(panelPath, 'utf8');
		const filteredLine = src.match(/\$: filteredTasks = applyCaseTaskMultiCriteriaFilters\([^;]+;/);
		expect(filteredLine?.[0]).not.toContain('taskGroupByMode');
		const sortedBlock = src.match(/\$: sortedFilteredTasks = sortCaseTasksForList\([^;]+;/);
		expect(sortedBlock?.[0]).not.toContain('taskGroupByMode');
	});
});

describe('P92-03 re-verification (reconciled P92-01 / P92-02 stack)', () => {
	it('pipeline order is status → text search → multi-criteria → sort', () => {
		const src = readFileSync(panelPath, 'utf8');
		const iStatus = src.indexOf('$: statusFilteredActive = applyCaseTaskFilters');
		const iSearch = src.indexOf('$: searchFilteredActive = applyCaseTaskTextSearch');
		const iMulti = src.indexOf('$: filteredTasks = applyCaseTaskMultiCriteriaFilters');
		const iSort = src.indexOf('$: sortedFilteredTasks = sortCaseTasksForList');
		expect(iStatus).toBeGreaterThan(-1);
		expect(iSearch).toBeGreaterThan(iStatus);
		expect(iMulti).toBeGreaterThan(iSearch);
		expect(iSort).toBeGreaterThan(iMulti);
	});

	it('deleted-task pipeline mirrors active: status → text → multi-criteria → sort', () => {
		const src = readFileSync(panelPath, 'utf8');
		const dStatus = src.indexOf('$: deletedStatusFiltered = applyCaseTaskFilters');
		const dSearch = src.indexOf('$: deletedSearchFiltered = applyCaseTaskTextSearch');
		const dMulti = src.indexOf('$: deletedTasksFiltered = applyCaseTaskMultiCriteriaFilters');
		const dSort = src.indexOf('$: deletedTasksSorted =');
		expect(dStatus).toBeGreaterThan(-1);
		expect(dSearch).toBeGreaterThan(dStatus);
		expect(dMulti).toBeGreaterThan(dSearch);
		expect(dSort).toBeGreaterThan(dMulti);
	});

	it('density presentation reactives do not reference search or multi-criteria state', () => {
		const src = readFileSync(panelPath, 'utf8');
		const start = src.indexOf('$: taskRowPad = taskDensityMode');
		const end = src.indexOf('$: caseId = typeof $page.params.id');
		expect(start).toBeGreaterThan(-1);
		expect(end).toBeGreaterThan(start);
		const block = src.slice(start, end);
		expect(block).not.toContain('taskSearchQuery');
		expect(block).not.toContain('filterAssigneeUserId');
		expect(block).not.toContain('multiCriteriaFilter');
	});

	it('soft-deleted rows still carry density class and data-task-density on the same li', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(
			/\{taskRowDensityClass\}[\s\S]{0,220}data-testid="case-tasks-item-deleted"[\s\S]{0,120}data-task-density=\{taskDensityMode\}/
		);
	});
});

describe('P92-04 CaseTasksPanel (bulk selection / controlled actions)', () => {
	it('exposes bulk toolbar test ids, row checkboxes, and sequential API wiring (no bulk delete)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/data-testid="case-tasks-bulk-bar"/);
		expect(src).toMatch(/data-testid="case-tasks-bulk-count"/);
		expect(src).toMatch(/data-testid="case-tasks-bulk-active-toolbar"/);
		expect(src).toMatch(/data-testid="case-tasks-bulk-select-visible-active"/);
		expect(src).toMatch(/data-testid="case-tasks-bulk-deleted-toolbar"/);
		expect(src).toMatch(/data-testid="case-tasks-bulk-select-visible-deleted"/);
		expect(src).toMatch(/data-testid="case-tasks-row-select"/);
		expect(src).toMatch(/data-testid="case-tasks-row-select-deleted"/);
		expect(src).toMatch(/data-testid="case-tasks-bulk-complete"/);
		expect(src).toMatch(/data-testid="case-tasks-bulk-archive"/);
		expect(src).toMatch(/data-testid="case-tasks-bulk-restore"/);
		expect(src).toMatch(/data-testid="case-tasks-bulk-clear"/);
		expect(src).toMatch(/data-testid="case-tasks-bulk-mixed-hint"/);
		expect(src).toContain('postCaseTaskComplete');
		expect(src).toContain('postCaseTaskArchive');
		expect(src).toContain('postCaseTaskRestore');
		expect(src).not.toMatch(/\b(bulkDelete|bulkSoftDelete|postCaseTaskBulkDelete)\b/i);
	});

	it('keeps selection in memory only; resets on case/token change; no localStorage', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/let selectedTaskIds: Set<string>/);
		expect(src).toMatch(/selectedTaskIds = new Set\(\)/);
		expect(src).not.toMatch(/localStorage/);
	});

	it('prunes selection to currently visible active and soft-deleted rows', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/\$: \{[\s\S]*activeVisible[\s\S]*delVisible[\s\S]*pruned/s);
		expect(src).toContain('openTasks.map');
		expect(src).toContain('deletedTasksSorted.map');
	});

	it('gates bulk actions with caseTaskBulk* eligibility helpers', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('caseTaskBulkCompleteEligible');
		expect(src).toContain('caseTaskBulkArchiveEligible');
		expect(src).toContain('caseTaskBulkRestoreEligible');
		expect(src).toContain('canBulkCompleteAll');
		expect(src).toContain('canBulkArchiveAll');
		expect(src).toContain('canBulkRestoreAll');
		expect(src).toContain("bulkKind === 'mixed'");
	});

	it('does not add occurred_at, workflow routing verbs, or automation to bulk UI', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\boccurred_at\b/);
		expect(src).not.toMatch(/\b(route|escalate|advance)\b/i);
		expect(src).not.toMatch(/\bnotification\b|cron|schedule\(/i);
	});

	it('keeps bulk selection logic independent of density mode', () => {
		const src = readFileSync(panelPath, 'utf8');
		const start = src.indexOf('function toggleTaskSelection');
		const end = src.indexOf('async function bulkRestoreSelected');
		expect(start).toBeGreaterThan(-1);
		expect(end).toBeGreaterThan(start);
		const block = src.slice(start, end);
		expect(block).not.toContain('taskDensityMode');
	});
});

describe('P92-05 CaseTasksPanel (read-only note/file cross-references)', () => {
	it('embeds CaseTaskCrossRefsSection in expanded detail and soft-deleted rows', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('CaseTaskCrossRefsSection');
		const sec = readFileSync(crossRefsSectionPath, 'utf8');
		expect(sec).toContain('case-tasks-cross-refs');
		expect(src).toMatch(/linksReadOnly=\{Boolean\(task\.deletedAt\)\}/);
	});

	it('uses existing Notes and Files routes for navigation only', () => {
		const sec = readFileSync(crossRefsSectionPath, 'utf8');
		expect(sec).toMatch(/\/notes\?note=/);
		expect(sec).toMatch(/\/files\?file=/);
		expect(sec).not.toMatch(/\boccurred_at\b/);
		expect(sec).not.toMatch(/View in Timeline|timeline\/|Timeline tab/i);
	});

	it('cross-ref section exposes test ids for open/add/remove', () => {
		const sec = readFileSync(crossRefsSectionPath, 'utf8');
		expect(sec).toMatch(/data-testid="case-tasks-cross-ref-open"/);
		expect(sec).toMatch(/data-testid="case-tasks-cross-ref-remove"/);
		expect(sec).toMatch(/data-testid="case-tasks-cross-ref-add-type"/);
	});
});

describe('P92-06 Phase 92 guardrail reinforcement', () => {
	it('preserves canonical operational-only hero and section copy', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('Operational tasks — not part of the official Timeline');
		expect(src).toContain('Operational · Not part of Timeline');
	});

	it('keeps Phase 92 session state out of localStorage (panel, model, cross-refs)', () => {
		const panel = readFileSync(panelPath, 'utf8');
		const model = readFileSync(modelPath, 'utf8');
		const sec = readFileSync(crossRefsSectionPath, 'utf8');
		expect(panel).not.toMatch(/localStorage/);
		expect(model).not.toMatch(/localStorage/);
		expect(sec).not.toMatch(/localStorage/);
	});

	it('limits cross-ref add UI to note and file only', () => {
		const sec = readFileSync(crossRefsSectionPath, 'utf8');
		expect(sec).toMatch(/value="note"/);
		expect(sec).toMatch(/value="file"/);
		expect(sec).not.toMatch(/value="timeline"/i);
	});

	it('types postCaseTaskCrossRef to note | file only', () => {
		const api = readFileSync(caseTasksApiPath, 'utf8');
		expect(api).toMatch(/linked_entity_type:\s*'note'\s*\|\s*'file'/);
	});

	it('does not introduce occurred_at into Phase 92 panel logic', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\boccurred_at\b/);
	});

	it('keeps P92-01→P92-02→multi-criteria→sort pipeline ordering', () => {
		const src = readFileSync(panelPath, 'utf8');
		const iStatus = src.indexOf('$: statusFilteredActive = applyCaseTaskFilters');
		const iSearch = src.indexOf('$: searchFilteredActive = applyCaseTaskTextSearch');
		const iMulti = src.indexOf('$: filteredTasks = applyCaseTaskMultiCriteriaFilters');
		const iSort = src.indexOf('$: sortedFilteredTasks = sortCaseTasksForList');
		expect(iStatus).toBeGreaterThan(-1);
		expect(iSearch).toBeGreaterThan(iStatus);
		expect(iMulti).toBeGreaterThan(iSearch);
		expect(iSort).toBeGreaterThan(iMulti);
	});
});

describe('P93-01 CaseTasksPanel (visual grouping, non-persistent)', () => {
	it('wires grouping helper, mode state, and group reactives after sorted status buckets', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('groupCaseTasksForVisualList');
		expect(src).toContain('CaseTaskGroupByMode');
		expect(src).toContain('taskGroupByMode');
		expect(src).toContain('openTaskDisplayGroups');
		expect(src).toContain('completedTaskDisplayGroups');
		expect(src).toContain('archivedTaskDisplayGroups');
		expect(src).toContain('deletedTaskDisplayGroups');
		const iSort = src.indexOf('$: sortedFilteredTasks = sortCaseTasksForList');
		const iOpen = src.indexOf('$: openTasks = sortedFilteredTasks.filter');
		const iGroups = src.indexOf('$: openTaskDisplayGroups =');
		expect(iSort).toBeGreaterThan(-1);
		expect(iOpen).toBeGreaterThan(iSort);
		expect(iGroups).toBeGreaterThan(iOpen);
	});

	it('exposes group-by control and collapsible group chrome (no Timeline ordering)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/data-testid="case-tasks-group-by"/);
		expect(src).toMatch(/data-testid="case-tasks-group-by-hint"/);
		expect(src).toContain('case-tasks-visual-group');
		expect(src).toMatch(/data-testid="case-tasks-visual-group-toggle"/);
		expect(src).toMatch(/case-tasks-open-groups-wrap/);
		expect(src).toContain('aria-expanded=');
		expect(src).toContain('aria-label={taskGroupCollapseAriaLabel');
		expect(src).toContain('onTaskGroupToggleKeydown');
		expect(src).toContain('data-visual-tier="soft-deleted"');
		expect(src).not.toMatch(/\boccurred_at\b/);
	});

	it('does not persist grouping in localStorage or sessionStorage', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/localStorage/);
		expect(src).not.toMatch(/sessionStorage/);
	});

	it('does not introduce new Case Engine API calls for grouping', () => {
		const src = readFileSync(panelPath, 'utf8');
		const apiMatches = src.match(/caseTasksApi\.\w+/g) ?? [];
		const allowed = new Set([
			'listCaseTasks',
			'listCaseAssignableUsers',
			'createCaseTask',
			'patchCaseTaskContent',
			'postCaseTaskComplete',
			'postCaseTaskArchive',
			'postCaseTaskReopen',
			'postCaseTaskSoftDelete',
			'postCaseTaskRestore'
		]);
		for (const m of apiMatches) {
			const name = m.replace('caseTasksApi.', '');
			expect(allowed.has(name), `unexpected API call: ${m}`).toBe(true);
		}
	});
});

describe('P93-02 CaseTasksPanel (sort clarity + quick presets)', () => {
	it('wires P93-02 model helpers and listSortMode-only state', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('CASE_TASK_SORT_QUICK_PRESET');
		expect(src).toContain('caseTaskSortFieldFromListSortMode');
		expect(src).toContain('caseTaskSortActiveSummary');
		expect(src).toContain('applySortPreset');
		expect(src).toContain('onTaskSortFieldChange');
		expect(src).toMatch(/data-testid="case-tasks-sort-preset-due-soon"/);
		expect(src).toMatch(/data-testid="case-tasks-sort-preset-high-priority"/);
		expect(src).toMatch(/data-testid="case-tasks-sort-preset-recent-created"/);
	});

	it('keeps sort before grouping in the reactive pipeline', () => {
		const src = readFileSync(panelPath, 'utf8');
		const iSort = src.indexOf('$: sortedFilteredTasks = sortCaseTasksForList');
		const iGroups = src.indexOf('$: openTaskDisplayGroups =');
		expect(iSort).toBeGreaterThan(-1);
		expect(iGroups).toBeGreaterThan(iSort);
	});

	it('does not persist sort in storage', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/localStorage/);
		expect(src).not.toMatch(/sessionStorage/);
	});

	it('does not reference occurred_at for sorting', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\boccurred_at\b/);
	});
});

describe('P93-03 CaseTasksPanel (scan cues: overdue + priority)', () => {
	it('passes scanSection to TaskOperationalRowMeta; open active vs other sections inactive', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/scanSection="active"/);
		expect(src).toMatch(/scanSection="inactive"/);
	});

	it('TaskOperationalRowMeta exposes scan cue data attributes and P93-03 markup', () => {
		const src = readFileSync(taskOperationalRowMetaPath, 'utf8');
		expect(src).toContain('caseTaskScanOverdueCue');
		expect(src).toContain('caseTaskScanPriorityCueLevel');
		expect(src).toMatch(/data-case-task-scan-overdue=/);
		expect(src).toMatch(/data-case-task-priority-cue=/);
		expect(src).toMatch(/data-scan-section=/);
		expect(src).toContain('CASE_TASK_SCAN_SR_OVERDUE');
		expect(src).toContain('CASE_TASK_SCAN_VISIBLE_PAST_DUE');
		expect(src).toMatch(/class="sr-only">\{CASE_TASK_SCAN_SR_OVERDUE\}/);
		expect(src).not.toMatch(/aria-label=\{overdueCue/);
		expect(src).not.toMatch(/localStorage/);
		expect(src).not.toMatch(/sessionStorage/);
	});

	it('does not add persistence or new Case Engine calls for scan cues', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/localStorage/);
		expect(src).not.toMatch(/sessionStorage/);
		const apiMatches = src.match(/caseTasksApi\.\w+/g) ?? [];
		const allowed = new Set([
			'listCaseTasks',
			'listCaseAssignableUsers',
			'createCaseTask',
			'patchCaseTaskContent',
			'postCaseTaskComplete',
			'postCaseTaskArchive',
			'postCaseTaskReopen',
			'postCaseTaskSoftDelete',
			'postCaseTaskRestore'
		]);
		for (const m of apiMatches) {
			const name = m.replace('caseTasksApi.', '');
			expect(allowed.has(name), `unexpected API call: ${m}`).toBe(true);
		}
	});
});

describe('P93-04 CaseTasksPanel (task pin — server-backed)', () => {
	it('wires pin toggle via patchCaseTaskContent and lists pinned in model mapping', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('toggleTaskPin');
		expect(src).toContain('CaseTaskPinToggle');
		expect(src).toContain('CaseTaskPinnedGlyph');
		expect(src).toMatch(/patchCaseTaskContent\([\s\S]*pinned:/);
		expect(src).not.toMatch(/localStorage/);
		expect(src).not.toMatch(/sessionStorage/);
	});

	it('CaseTaskPinToggle uses aria-pressed and pin test id', () => {
		const src = readFileSync(caseTaskPinTogglePath, 'utf8');
		expect(src).toMatch(/data-testid="case-tasks-row-pin"/);
		expect(src).toMatch(/aria-pressed/);
		expect(src).toMatch(/Pin task|Unpin task/);
	});
});

describe('tasks route (+page)', () => {
	it('uses CaseWorkspaceContentRegion and CaseTasksPanel', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toContain('CaseWorkspaceContentRegion');
		expect(src).toContain('testId="case-tasks-page"');
		expect(src).toContain('CaseTasksPanel');
		expect(src).toContain('P89-07');
	});
});

describe('caseTaskModel (P89-07 mapping)', () => {
	it('defines CaseTask and maps from engine types', () => {
		const src = readFileSync(modelPath, 'utf8');
		expect(src).toMatch(/export interface CaseTask/);
		expect(src).toContain('caseEngineTaskToCaseTask');
		expect(src).toContain('CaseEngineCaseTask');
		expect(src).toContain('Must NOT directly or indirectly cause any mutation of timeline_entries');
	});

	it('exports TaskDensityMode for P92-03', () => {
		const src = readFileSync(modelPath, 'utf8');
		expect(src).toMatch(/export type TaskDensityMode = 'expanded' \| 'compact'/);
	});

	it('exports P92-01 / P92-02 task filter helpers', () => {
		const src = readFileSync(modelPath, 'utf8');
		expect(src).toContain('applyCaseTaskTextSearch');
		expect(src).toContain('applyCaseTaskMultiCriteriaFilters');
		expect(src).toContain('CASE_TASK_FILTER_UNASSIGNED');
		expect(src).toContain('CaseTaskMultiCriteriaFilter');
	});

	it('exports P92-04 bulk eligibility helpers', () => {
		const src = readFileSync(modelPath, 'utf8');
		expect(src).toContain('caseTaskBulkCompleteEligible');
		expect(src).toContain('caseTaskBulkArchiveEligible');
		expect(src).toContain('caseTaskBulkRestoreEligible');
	});

	it('exports P93-01 visual grouping helpers', () => {
		const src = readFileSync(modelPath, 'utf8');
		expect(src).toContain('groupCaseTasksForVisualList');
		expect(src).toContain('CaseTaskGroupByMode');
		expect(src).toContain('CaseTaskVisualGroup');
		expect(src).toContain('caseTaskGroupLabelStableKey');
		expect(src).toContain('caseTaskPriorityStableKey');
	});

	it('exports P93-02 sort field + preset helpers', () => {
		const src = readFileSync(modelPath, 'utf8');
		expect(src).toContain('CaseTaskSortField');
		expect(src).toContain('CASE_TASK_SORT_FIELD_PAIR');
		expect(src).toContain('CASE_TASK_LIST_SORT_MODES_ALL');
		expect(src).toContain('CASE_TASK_SORT_QUICK_PRESET');
		expect(src).toContain('caseTaskSortFieldFromListSortMode');
		expect(src).toContain('caseTaskSortActiveSummary');
	});

	it('exports P93-03 scan cue helpers (no CaseTask shape change)', () => {
		const src = readFileSync(modelPath, 'utf8');
		expect(src).toContain('CaseTaskScanSection');
		expect(src).toContain('caseTaskScanOverdueCue');
		expect(src).toContain('caseTaskScanPriorityCueLevel');
		expect(src).toContain('CASE_TASK_SCAN_SR_OVERDUE');
		expect(src).toContain('CASE_TASK_SCAN_VISIBLE_PAST_DUE');
		expect(src).toMatch(/export interface CaseTask\s*\{/);
		expect(src).not.toMatch(/\bscanCue\b|\boverdueEmphasis\b/);
	});

	it('maps P93-04 pinned from Case Engine task payload', () => {
		const src = readFileSync(modelPath, 'utf8');
		expect(src).toMatch(/\bpinned\b/);
		expect(src).toContain('caseEngineTaskToCaseTask');
	});
});

describe('P93-05 CaseTasksPanel (UX polish + empty-state clarity)', () => {
	it('declares narrowing-filter flag for empty-state copy only (no model/API change)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('P93-05');
		expect(src).toContain('taskPanelHasNarrowingFilters');
		expect(src).toMatch(/data-testid="case-tasks-no-open-narrowing-note"/);
		expect(src).toMatch(/data-testid="case-tasks-no-completed"/);
		expect(src).toMatch(/data-testid="case-tasks-no-archived"/);
		expect(src).toMatch(/data-testid="case-tasks-section-archived-hint"/);
		expect(src).toMatch(/Filtering this list/);
		expect(src).toMatch(/Tasks for this case/);
	});

	it('keeps panel free of persistence and unchanged API surface', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/localStorage/);
		expect(src).not.toMatch(/sessionStorage/);
		expect(src).toContain("$lib/apis/caseEngine/caseTasksApi");
	});

	it('does not use reminder wording on the hero (no scheduling semantics)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\breminders\b/i);
	});
});

describe('P94-01 CaseTasksPanel (row title & description clarity)', () => {
	it('uses shared P94 typography reactives with existing line-clamp density strings', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('P94-01');
		expect(src).toContain('taskTitleLeadClass');
		expect(src).toContain('taskTitleSizeClass');
		expect(src).toContain('taskTitleOverflowClass');
		expect(src).toContain('taskDescPreviewBaseClass');
		expect(src).toContain('taskTitleClamp');
		expect(src).toContain('taskDescClampInline');
		expect(src).toContain('taskDescClampCollapsed');
		expect(src).toContain('taskDeletedDescClamp');
	});

	it('keeps title visually dominant (semibold + size) and description preview secondary (xs + clamps)', () => {
		const src = readFileSync(panelPath, 'utf8');
		const titles = src.match(/class="task-row-title/g);
		expect(titles?.length).toBe(4);
		expect(src).toMatch(/task-row-title[\s\S]{0,220}taskTitleLeadClass/);
		expect(src).toMatch(
			/\$: taskDescPreviewBaseClass = `\$\{DS_TYPE_CLASSES\.body\} m-0 text-xs/
		);
		expect(src).toMatch(/data-testid="case-tasks-row-desc-preview"/);
	});

	it('applies overflow-safe wrapping to titles and previews without changing expand/collapse wiring', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('[overflow-wrap:anywhere]');
		expect(src).toContain('caseTaskShouldOfferDetailToggle');
		expect(src).toContain('expandedTaskIds');
	});

	it('leaves expanded detail body text at text-sm with pre-wrap (preview path is separate)', () => {
		const src = readFileSync(panelPath, 'utf8');
		const detailBlocks = src.match(
			/whitespace-pre-wrap break-words \[overflow-wrap:anywhere\]/g
		);
		expect(detailBlocks?.length).toBeGreaterThanOrEqual(3);
	});

	it('does not add client persistence or ad-hoc network calls', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\b(fetch|axios)\s*\(/);
	});
});

describe('P94-02 CaseTasksPanel (metadata readability & labeling)', () => {
	it('stacks row content title → description previews/detail → created line → TaskOperationalRowMeta', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('P94-02');
		expect(src).toMatch(/data-testid="case-tasks-row-desc-preview"[\s\S]*?data-testid="case-tasks-row-created-line"/);
		expect(src).toMatch(/data-testid="case-tasks-row-created-line"[\s\S]*?<TaskOperationalRowMeta/);
	});

	it('TaskOperationalRowMeta uses deterministic meta order and labeled slot markers', () => {
		const src = readFileSync(taskOperationalRowMetaPath, 'utf8');
		expect(src).toContain('P94-02');
		expect(src).toMatch(/data-case-task-meta-order="assignee_due_group_priority"/);
		expect(src).toMatch(
			/data-case-task-meta-slot="assignee"[\s\S]*data-case-task-meta-slot="due"[\s\S]*data-case-task-meta-slot="group"[\s\S]*data-case-task-meta-slot="priority"/
		);
		expect(src).toContain('metaLineClass');
	});

	it('caseTaskModel operational line helpers keep explicit prefixes (no raw unlabeled values)', () => {
		const src = readFileSync(modelPath, 'utf8');
		expect(src).toMatch(/Assigned:/);
		expect(src).toMatch(/`Due \$\{/);
		expect(src).toMatch(/`Group:/);
		expect(src).toMatch(/`Priority:/);
	});

	it('does not add persistence or ad-hoc network calls', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\b(fetch|axios)\s*\(/);
	});
});

describe('P94-03 CaseTasksPanel (inline context signals — notes/files)', () => {
	it('imports CaseTaskRowContextSignals and renders after TaskOperationalRowMeta (before lifecycle)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('P94-03');
		expect(src).toContain('CaseTaskRowContextSignals');
		expect((src.match(/<CaseTaskRowContextSignals/g) ?? []).length).toBe(4);
		expect(src).toMatch(/<TaskOperationalRowMeta[\s\S]{0,1500}<CaseTaskRowContextSignals/);
		const iComp = src.indexOf('data-testid="case-tasks-completion-attribution"');
		expect(iComp).toBeGreaterThan(-1);
		expect(src.slice(Math.max(0, iComp - 900), iComp)).toContain('CaseTaskRowContextSignals');
		const iArch = src.indexOf('data-testid="case-tasks-archive-attribution"');
		expect(iArch).toBeGreaterThan(-1);
		expect(src.slice(Math.max(0, iArch - 900), iArch)).toContain('CaseTaskRowContextSignals');
	});

	it('CaseTaskRowContextSignals uses counts, explicit Notes/Files labels, and no icon-only affordances', () => {
		const src = readFileSync(caseTaskRowContextSignalsPath, 'utf8');
		expect(src).toContain('P94-03');
		expect(src).toContain('caseTaskCrossRefCounts');
		expect(src).toMatch(/data-testid="case-tasks-row-context-signals"/);
		expect(src).toMatch(/data-testid="case-tasks-context-notes-label"/);
		expect(src).toMatch(/data-testid="case-tasks-context-files-label"/);
		expect(src).toContain('Notes ({counts.notes})');
		expect(src).toContain('Files ({counts.files})');
		expect(src).not.toMatch(/<svg/);
	});

	it('caseTaskModel exports caseTaskCrossRefCounts for P94-03', () => {
		const src = readFileSync(modelPath, 'utf8');
		expect(src).toContain('P94-03');
		expect(src).toContain('export function caseTaskCrossRefCounts');
	});

	it('does not add persistence or ad-hoc network calls', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\b(fetch|axios)\s*\(/);
	});
});

describe('P94-04 CaseTasksPanel (row interaction polish)', () => {
	it('marks task row containers with ce-task-row for hover/focus styling', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('P94-04');
		expect((src.match(/class="ce-task-row /g) ?? []).length).toBeGreaterThanOrEqual(4);
		expect(src).toMatch(/ce-task-row[\s\S]*case-tasks-item-deleted/);
		expect(src).toMatch(/\.ce-task-row:hover/);
		expect(src).toMatch(/inset 0 0 0 1px var\(--ce-l-border-default\)/);
	});

	it('scopes focus-visible outlines to row checkboxes and form controls', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/\.ce-task-row input\[type='checkbox'\]:focus-visible/);
		expect(src).toMatch(/\.ce-task-row textarea:focus-visible/);
	});

	it('CaseTaskPinToggle keeps ghost ds-btn and improves minimum hit area (no handler changes)', () => {
		const src = readFileSync(caseTaskPinTogglePath, 'utf8');
		expect(src).toContain('P94-04');
		expect(src).toContain('DS_BTN_CLASSES.ghost');
		expect(src).toMatch(/min-h-9 min-w-9/);
		expect(src).toMatch(/on:click=\{onToggle\}/);
	});

	it('does not add persistence or ad-hoc network calls', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\b(fetch|axios)\s*\(/);
	});
});

describe('P94-05 CaseTasksPanel (cross-section consistency)', () => {
	it('uses a single taskRowPrimaryStackClass for all row variants (no deleted-only gap)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('P94-05');
		expect(src).toContain('taskRowPrimaryStackClass');
		expect(src).toContain('ce-task-row__primary');
		expect(src).not.toContain('taskDeletedInnerGap');
		expect((src.match(/class="\{taskRowPrimaryStackClass\}"/g) ?? []).length).toBe(4);
	});

	it('aligns soft-deleted created line format with other lifecycle rows', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/Created \{formatCreatedAt\(/);
	});

	it('does not add persistence or ad-hoc network calls', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/localStorage|sessionStorage/);
		expect(src).not.toMatch(/\b(fetch|axios)\s*\(/);
	});
});
