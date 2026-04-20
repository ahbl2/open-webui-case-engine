/**
 * Timeline left-rail emblem + connector colors — aligned with Quick add templates
 * (`CaseTimelineOccSidebar.svelte`) and type headings (`TimelineEntryCard.svelte`).
 */
export interface TimelineRailEmblemParts {
	/** 1–3 characters inside the circle */
	emblem: string;
	/** Tailwind classes for the circular badge background + text */
	circleClass: string;
	/** Tailwind text class for the → before the emblem */
	arrowClass: string;
}

export function timelineRailEmblemForType(type: string): TimelineRailEmblemParts {
	const t = String(type ?? '').trim().toLowerCase();
	switch (t) {
		case 'surveillance':
			return {
				emblem: 'S',
				circleClass:
					'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/55',
				arrowClass: 'text-emerald-500'
			};
		case 'interview':
			return {
				emblem: 'Int',
				circleClass: 'bg-sky-500/20 text-sky-800 dark:text-sky-200 border-sky-500/55',
				arrowClass: 'text-sky-500'
			};
		case 'evidence':
			return {
				emblem: 'E',
				circleClass:
					'bg-amber-500/25 text-amber-900 dark:text-amber-200 border-amber-500/50',
				arrowClass: 'text-amber-500'
			};
		case 'controlled_buy':
			return {
				emblem: 'C',
				circleClass:
					'bg-violet-500/20 text-violet-800 dark:text-violet-200 border-violet-500/55',
				arrowClass: 'text-violet-500'
			};
		case 'search_warrant':
			return {
				emblem: 'W',
				circleClass:
					'bg-slate-500/25 text-slate-800 dark:text-slate-200 border-slate-500/50',
				arrowClass: 'text-slate-500'
			};
		case 'incident':
			return {
				emblem: 'Inc',
				circleClass:
					'bg-sky-400/35 text-sky-950 dark:text-sky-100 border-sky-400/55',
				arrowClass: 'text-sky-400'
			};
		case 'note':
		default:
			return {
				emblem: 'N',
				circleClass:
					'bg-gray-500/20 text-gray-800 dark:text-gray-200 border-gray-500/45',
				arrowClass: 'text-gray-500'
			};
	}
}
