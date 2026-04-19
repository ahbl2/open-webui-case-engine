/**
 * P129 — Map activity events to the same accent family as case Summary KPI tiles
 * (docs/CASE_OVERVIEW_KPI_CANON.md) for visual consistency across the case workspace.
 */
import type { CaseActivityEvent, CaseActivityEventType } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';

/** Matches `ds-occ-kpi-card--{variant}` in detectiveSurfaces.css */
export type P129ActivityKpiVariant =
	| 'blue'
	| 'cyan'
	| 'green'
	| 'violet'
	| 'yellow'
	| 'rose'
	| 'orange';

export type P129ActivityDomainTheme = {
	variant: P129ActivityKpiVariant;
	/** e.g. `ds-occ-kpi-card--blue` */
	kpiModifierClass: string;
	/** Short label for chips / scan (Timeline, Files, …) */
	domainLabel: string;
};

function theme(
	variant: P129ActivityKpiVariant,
	domainLabel: string
): P129ActivityDomainTheme {
	return {
		variant,
		kpiModifierClass: `ds-occ-kpi-card--${variant}`,
		domainLabel
	};
}

function themeFromEventType(eventType: string): P129ActivityDomainTheme | null {
	const t = eventType as CaseActivityEventType;
	switch (t) {
		case 'timeline_entry_created':
			return theme('blue', 'Timeline');
		case 'proposal_created':
		case 'proposal_accepted':
		case 'proposal_rejected':
			return theme('rose', 'Proposals');
		case 'workflow_item_created':
		case 'workflow_status_changed':
			return theme('yellow', 'Workflow');
		case 'entity_created':
		case 'entity_link_created':
			return theme('violet', 'Entities');
		case 'file_uploaded':
			return theme('green', 'Files');
		default:
			return null;
	}
}

function themeFromTargetType(targetType: string): P129ActivityDomainTheme {
	switch (targetType) {
		case 'timeline_entry':
			return theme('blue', 'Timeline');
		case 'proposal':
			return theme('rose', 'Proposals');
		case 'case_workflow_item':
		case 'case_workflow_item_version':
			return theme('yellow', 'Workflow');
		case 'case_entity':
		case 'case_entity_evidence_link':
			return theme('violet', 'Entities');
		case 'case_file':
			return theme('green', 'Files');
		default:
			return theme('cyan', 'Other');
	}
}

/** Stable ordering for domain filter `<select>`. */
export const P129_ACTIVITY_DOMAIN_FILTER_LABELS = [
	'Timeline',
	'Proposals',
	'Files',
	'Entities',
	'Workflow',
	'Other'
] as const;

/** Canonical colors + domain label for list rows, chips, and icons. */
export function p129ActivityDomainTheme(ev: CaseActivityEvent): P129ActivityDomainTheme {
	const byType = themeFromEventType(ev.event_type);
	if (byType) return byType;
	return themeFromTargetType(ev.target_type);
}
