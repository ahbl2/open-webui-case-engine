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
const pagePath = join(here, '../../../routes/(app)/case/[id]/tasks/+page.svelte');
const modelPath = join(here, '../../case/caseTaskModel.ts');

describe('P86-01 CaseTasksPanel (operational shell)', () => {
	it('labels operational tasks and non-authoritative semantics', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/Tasks \(Operational\)/);
		expect(src).toMatch(/Non-authoritative/);
		expect(src).toMatch(/No tasks yet/);
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
		expect(src).toMatch(/data-testid="case-tasks-filter-text"/);
		expect(src).toMatch(/data-testid="case-tasks-filter-empty"/);
		expect(src).toMatch(/No tasks match your filters/);
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
		expect(src).toMatch(/data-testid="case-tasks-sort-created"/);
		expect(src).toMatch(/data-testid="case-tasks-sort-created-hint"/);
		expect(src).toMatch(/Sort orders this list for scanning only/);
		expect(src).toMatch(/<optgroup label="Created">/);
	});

	it('does not imply Timeline occurred_at ordering', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\boccurred_at\b/);
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
		const matches = src.match(new RegExp(SECTION_HINT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
		expect(matches?.length).toBeGreaterThanOrEqual(3);
	});

	it('keeps sort hint and aria-label explicitly non-Timeline and non-workflow', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/Sort orders this list for scanning only/);
		expect(src).toMatch(/not scheduling, SLA, workflow, or Timeline/);
		expect(src).toMatch(
			/aria-label="Sort tasks for scanning \(operational list; not Timeline ordering\)"/
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
});
