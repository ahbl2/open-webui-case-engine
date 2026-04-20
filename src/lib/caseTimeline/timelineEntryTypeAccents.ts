/**
 * Timeline entry type colors — single source of truth for Quick add templates (sidebar)
 * and TimelineEntryCard accents (border, heading, spine, removed-state badge).
 */
import { DS_BADGE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';

function norm(type: string): string {
	return (type ?? '').trim().toLowerCase();
}

/** Inner circle on Quick add template buttons (matches product palette). */
export const TIMELINE_TYPE_QUICK_ADD_CIRCLE: Record<string, string> = {
	surveillance: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
	interview: 'bg-sky-500/20 text-sky-800 dark:text-sky-200',
	evidence: 'bg-amber-500/25 text-amber-900 dark:text-amber-200',
	controlled_buy: 'bg-violet-500/20 text-violet-800 dark:text-violet-200',
	search_warrant: 'bg-slate-500/25 text-slate-800 dark:text-slate-200',
	/** Light blue (distinct from interview’s deeper sky-500 chip) */
	incident: 'bg-sky-400/35 text-sky-950 dark:text-sky-100'
};

export function timelineTypeQuickAddCircleClass(type: string): string {
	return TIMELINE_TYPE_QUICK_ADD_CIRCLE[norm(type)] ?? 'bg-gray-500/20 text-gray-800 dark:text-gray-200';
}

export function timelineTypeOccBorderClass(type: string): string {
	switch (norm(type)) {
		case 'surveillance':
			return 'border-l-[3px] border-l-emerald-500/85';
		case 'interview':
			return 'border-l-[3px] border-l-sky-500/85';
		case 'evidence':
			return 'border-l-[3px] border-l-amber-500/85';
		case 'controlled_buy':
			return 'border-l-[3px] border-l-violet-500/85';
		case 'search_warrant':
			return 'border-l-[3px] border-l-slate-500/80';
		case 'incident':
			return 'border-l-[3px] border-l-sky-400/90';
		case 'note':
			return 'border-l-[3px] border-l-gray-400/70 dark:border-l-gray-500/70';
		default:
			return 'border-l-[3px] border-l-gray-400/55 dark:border-l-gray-500/55';
	}
}

export function timelineTypeOccHeadingClass(type: string): string {
	switch (norm(type)) {
		case 'surveillance':
			return 'text-emerald-700 dark:text-emerald-300';
		case 'interview':
			return 'text-sky-800 dark:text-sky-200';
		case 'evidence':
			return 'text-amber-900 dark:text-amber-200';
		case 'controlled_buy':
			return 'text-violet-800 dark:text-violet-200';
		case 'search_warrant':
			return 'text-slate-800 dark:text-slate-200';
		case 'incident':
			return 'text-sky-900 dark:text-sky-100';
		case 'note':
			return 'text-gray-600 dark:text-gray-300';
		default:
			return 'text-gray-600 dark:text-gray-300';
	}
}

export function timelineTypeSpineMarkerClass(type: string): string {
	switch (norm(type)) {
		case 'surveillance':
			return '!bg-emerald-500';
		case 'interview':
			return '!bg-sky-500';
		case 'evidence':
			return '!bg-amber-500';
		case 'controlled_buy':
			return '!bg-violet-500';
		case 'search_warrant':
			return '!bg-slate-500';
		case 'incident':
			return '!bg-sky-400';
		case 'note':
			return '';
		default:
			return '';
	}
}

/** Soft-deleted row type pill — same hues as quick-add circles. */
export function timelineTypeBadgeClass(type: string): string {
	const lower = norm(type);
	const tinted = `${DS_BADGE_CLASSES.base} border-0`;
	switch (lower) {
		case 'note':
			return DS_BADGE_CLASSES.neutral;
		case 'surveillance':
			return `${tinted} bg-emerald-500/20 text-emerald-800 dark:text-emerald-200`;
		case 'interview':
			return `${tinted} bg-sky-500/20 text-sky-800 dark:text-sky-200`;
		case 'evidence':
			return `${tinted} bg-amber-500/25 text-amber-900 dark:text-amber-200`;
		case 'controlled_buy':
			return `${tinted} bg-violet-500/20 text-violet-800 dark:text-violet-200`;
		case 'search_warrant':
			return `${tinted} bg-slate-500/25 text-slate-800 dark:text-slate-200`;
		case 'incident':
			return `${tinted} bg-sky-400/30 text-sky-950 dark:text-sky-100`;
		default:
			return DS_BADGE_CLASSES.neutral;
	}
}
