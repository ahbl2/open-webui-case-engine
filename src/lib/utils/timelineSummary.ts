import type { TimelineEntry, TimelineIntelligenceSummaryResult } from '$lib/apis/caseEngine';

export interface TimelineSummaryEventView {
	entry_id: string;
	reason: string;
	occurred_at: string | null;
	type: string;
	excerpt: string;
}

export interface TimelineSummaryContextView {
	entryCountLine: string;
	filterLine: string | null;
}

function truncate(text: string, maxLen = 180): string {
	const v = String(text ?? '').trim();
	if (v.length <= maxLen) return v;
	return `${v.slice(0, maxLen - 1)}…`;
}

export function mapTimelineSummaryKeyEvents(
	summary: TimelineIntelligenceSummaryResult,
	entries: TimelineEntry[]
): TimelineSummaryEventView[] {
	const byId = new Map(entries.map((entry) => [entry.id, entry]));
	return summary.key_events.map((event) => {
		const match = byId.get(event.entry_id);
		const text = match ? (match.text_cleaned?.trim() ? match.text_cleaned : match.text_original) : '';
		return {
			entry_id: event.entry_id,
			reason: event.reason,
			occurred_at: match?.occurred_at ?? null,
			type: match?.type ?? 'Unknown',
			excerpt: text ? truncate(text) : 'Entry details unavailable.'
		};
	});
}

export function buildTimelineSummaryContext(summary: TimelineIntelligenceSummaryResult): TimelineSummaryContextView {
	const hasEntryCount =
		summary.meta != null &&
		typeof summary.meta.entry_count === 'number' &&
		Number.isFinite(summary.meta.entry_count);
	const count = hasEntryCount ? summary.meta.entry_count : null;
	const entryCountLine =
		count == null
			? 'unavailable'
			: `${count} timeline entr${count === 1 ? 'y' : 'ies'}`;
	const dateFrom = summary.meta?.date_from ?? null;
	const dateTo = summary.meta?.date_to ?? null;
	const metaTypes = summary.meta?.types;
	const types = Array.isArray(metaTypes)
		? metaTypes.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
		: [];
	const parts: string[] = [];
	if (dateFrom && dateTo) {
		parts.push(`Date range: ${dateFrom} to ${dateTo}`);
	} else if (dateFrom) {
		parts.push(`Date range: from ${dateFrom}`);
	} else if (dateTo) {
		parts.push(`Date range: up to ${dateTo}`);
	}
	if (types.length > 0) {
		parts.push(`Types: ${types.join(', ')}`);
	}
	return {
		entryCountLine,
		filterLine: parts.length > 0 ? parts.join(', ') : null
	};
}

