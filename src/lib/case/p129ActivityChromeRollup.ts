/**
 * P129 — Activity chrome domain chips: fixed workspace-aligned domains with counts from the
 * filtered event list. Notes / Intelligence show 0 until Case Engine emits matching activity
 * event types and `p129ActivityDomainTheme` maps them (see DetectiveCaseEngine P129 collectors).
 */
import type { CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';
import { p129ActivityDomainTheme, type P129ActivityDomainTheme } from './p129ActivityDomainTheme';

/** Order matches case nav emphasis (Timeline → Notes → Files → Subjects & Assets → …). */
export const P129_ACTIVITY_CHROME_ROLLUP_LABELS = [
	'Timeline',
	'Notes',
	'Files',
	'Subjects & Assets',
	'Proposals',
	'Workflow',
	'Entities'
] as const;

export type P129ActivityChromeRollupRow = {
	label: string;
	count: number;
	theme: P129ActivityDomainTheme;
};

function chromeThemeForLabel(label: string): P129ActivityDomainTheme {
	switch (label) {
		case 'Timeline':
			return { variant: 'blue', kpiModifierClass: 'ds-occ-kpi-card--blue', domainLabel: 'Timeline' };
		case 'Notes':
			return { variant: 'orange', kpiModifierClass: 'ds-occ-kpi-card--orange', domainLabel: 'Notes' };
		case 'Files':
			return { variant: 'green', kpiModifierClass: 'ds-occ-kpi-card--green', domainLabel: 'Files' };
		case 'Subjects & Assets':
			return { variant: 'cyan', kpiModifierClass: 'ds-occ-kpi-card--cyan', domainLabel: 'Subjects & Assets' };
		case 'Proposals':
			return { variant: 'rose', kpiModifierClass: 'ds-occ-kpi-card--rose', domainLabel: 'Proposals' };
		case 'Workflow':
			return { variant: 'yellow', kpiModifierClass: 'ds-occ-kpi-card--yellow', domainLabel: 'Workflow' };
		case 'Entities':
			return { variant: 'violet', kpiModifierClass: 'ds-occ-kpi-card--violet', domainLabel: 'Entities' };
		case 'Other':
			return { variant: 'cyan', kpiModifierClass: 'ds-occ-kpi-card--cyan', domainLabel: 'Other' };
		default:
			return { variant: 'cyan', kpiModifierClass: 'ds-occ-kpi-card--cyan', domainLabel: label };
	}
}

/**
 * Builds one chip per canonical workspace domain; counts come from `p129ActivityDomainTheme(ev)`.
 * Domains not in the fixed list (e.g. legacy `Other`) roll into an extra **Other** chip when non-zero.
 */
export function buildP129ActivityChromeRollup(filteredEvents: CaseActivityEvent[]): P129ActivityChromeRollupRow[] {
	const counts = new Map<string, number>();
	for (const label of P129_ACTIVITY_CHROME_ROLLUP_LABELS) {
		counts.set(label, 0);
	}

	let otherBucket = 0;

	for (const ev of filteredEvents) {
		const d = p129ActivityDomainTheme(ev).domainLabel;
		if (counts.has(d)) {
			counts.set(d, (counts.get(d) ?? 0) + 1);
		} else {
			otherBucket += 1;
		}
	}

	const rows: P129ActivityChromeRollupRow[] = P129_ACTIVITY_CHROME_ROLLUP_LABELS.map((label) => ({
		label,
		count: counts.get(label) ?? 0,
		theme: chromeThemeForLabel(label)
	}));

	if (otherBucket > 0) {
		rows.push({
			label: 'Other',
			count: otherBucket,
			theme: chromeThemeForLabel('Other')
		});
	}

	return rows;
}
