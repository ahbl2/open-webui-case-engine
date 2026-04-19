/**
 * P129 — Client-side search + filters on rows already loaded in the Activity feed.
 */
import type { CaseActivityEvent } from '$lib/apis/caseEngine/caseP129ActivityEventsApi';
import { p129ActivityEventTypeLabel } from '$lib/case/p129ActivityDisplay';
import { p129ActivityDomainTheme } from '$lib/case/p129ActivityDomainTheme';
import { p129ActivityActorDisplay, p129ActivityShortId } from '$lib/case/p129ActivityHumanTarget';
import { p129ActivityEventSummary } from '$lib/case/p129ActivityEventSummary';

export type P129ActivityClientFilterState = {
	searchRaw: string;
	domainFilter: 'all' | string;
	/** Raw `actor_user_id`; `'all'` = any actor. */
	actorFilter: 'all' | string;
	/** `YYYY-MM-DD` from `<input type="date">`, or empty. */
	dateFrom: string;
	dateTo: string;
};

function startOfLocalDayMs(ymd: string): number | null {
	const s = ymd.trim();
	if (!s) return null;
	const t = new Date(`${s}T00:00:00`).getTime();
	return Number.isNaN(t) ? null : t;
}

function endOfLocalDayMs(ymd: string): number | null {
	const s = ymd.trim();
	if (!s) return null;
	const t = new Date(`${s}T23:59:59.999`).getTime();
	return Number.isNaN(t) ? null : t;
}

function occurredAtMs(iso: string): number {
	const t = Date.parse(iso);
	return Number.isNaN(t) ? NaN : t;
}

function matchesDateRange(occurredAtIso: string, dateFrom: string, dateTo: string): boolean {
	let df = dateFrom.trim();
	let dt = dateTo.trim();
	if (df && dt && df > dt) {
		const x = df;
		df = dt;
		dt = x;
	}

	const t = occurredAtMs(occurredAtIso);
	if (Number.isNaN(t)) return false;

	const lo = df ? startOfLocalDayMs(df) : null;
	const hi = dt ? endOfLocalDayMs(dt) : null;
	const minT = lo ?? -Infinity;
	const maxT = hi ?? Infinity;
	return t >= minT && t <= maxT;
}

export function p129ActivityDistinctActorOptions(
	events: CaseActivityEvent[]
): { userId: string; displayLabel: string }[] {
	const seen = new Set<string>();
	const out: { userId: string; displayLabel: string }[] = [];
	for (const ev of events) {
		const id = String(ev.actor_user_id ?? '').trim();
		if (!id || seen.has(id)) continue;
		seen.add(id);
		out.push({ userId: id, displayLabel: p129ActivityActorDisplay(ev.actor_user_id) });
	}
	out.sort((a, b) =>
		a.displayLabel.localeCompare(b.displayLabel, undefined, { sensitivity: 'base' })
	);
	return out;
}

export function p129ActivityEventMatchesClientFilter(
	ev: CaseActivityEvent,
	state: P129ActivityClientFilterState
): boolean {
	const theme = p129ActivityDomainTheme(ev);
	if (state.domainFilter !== 'all' && theme.domainLabel !== state.domainFilter) {
		return false;
	}

	if (state.actorFilter !== 'all') {
		const want = state.actorFilter.trim();
		const got = String(ev.actor_user_id ?? '').trim();
		if (!want || got !== want) return false;
	}

	if (!matchesDateRange(ev.occurred_at, state.dateFrom, state.dateTo)) {
		return false;
	}

	const q = state.searchRaw.trim().toLowerCase();
	if (!q) return true;

	const actor = p129ActivityActorDisplay(ev.actor_user_id);
	const tid = ev.target_id?.trim() ?? '';
	const hay = [
		p129ActivityEventTypeLabel(ev.event_type),
		p129ActivityEventSummary(ev),
		String(ev.actor_user_id ?? ''),
		actor,
		theme.domainLabel,
		tid,
		tid ? p129ActivityShortId(tid) : '',
		ev.event_id
	]
		.join(' ')
		.toLowerCase();

	return hay.includes(q);
}
