/**
 * P97-01 — Read-only navigation contract: synthesis → exact Case Engine source record (single-case).
 *
 * - No mutation, no persistence to storage, no URL/query/hash for target ids (P97-01).
 * - One-shot handoff via SvelteKit `goto(..., { state })` only — consumed by later P97 tickets.
 * - Timeline references are authoritative; tasks/files/extracted text are supporting.
 */
import type {
	CaseSynthesisSupportingContextItem,
	CaseSynthesisTimelineFact
} from '$lib/case/caseSynthesisReadModel';

/** App.PageState key — keep in sync with `src/app.d.ts`. */
export const SYNTHESIS_SOURCE_NAVIGATION_STATE_KEY = 'synthesisSourceNavigationIntent' as const;

export type SynthesisDestinationSurface = 'timeline' | 'tasks' | 'files';

/** Authoritative = Timeline chronology; supporting = operational / file evidence. */
export type SynthesisSourceAuthority = 'authoritative' | 'supporting';

export type SynthesisSourceNavKind = 'timeline_entry' | 'task' | 'case_file' | 'extracted_text';

/**
 * Normalized read-only navigation intent from a synthesis row to a concrete source record.
 * Not persisted; not a workflow action — routing metadata only.
 */
export interface SynthesisSourceNavigationIntent {
	readonly v: 1;
	readonly case_id: string;
	readonly authority: SynthesisSourceAuthority;
	readonly source_kind: SynthesisSourceNavKind;
	/** Case Engine id: timeline entry id, task id, or file id. */
	readonly source_record_id: string;
	readonly destination_surface: SynthesisDestinationSurface;
}

export function synthesisDestinationPath(caseId: string, surface: SynthesisDestinationSurface): string {
	const id = caseId.trim();
	return `/case/${id}/${surface}`;
}

export function intentFromTimelineFact(
	caseId: string,
	fact: Pick<CaseSynthesisTimelineFact, 'entry_id'>
): SynthesisSourceNavigationIntent | null {
	const cid = caseId.trim();
	const eid = fact.entry_id?.trim() ?? '';
	if (!cid || !eid) return null;
	return {
		v: 1,
		case_id: cid,
		authority: 'authoritative',
		source_kind: 'timeline_entry',
		source_record_id: eid,
		destination_surface: 'timeline'
	};
}

export function intentFromSupportingContextItem(
	caseId: string,
	item: CaseSynthesisSupportingContextItem
): SynthesisSourceNavigationIntent | null {
	const cid = caseId.trim();
	const sid = item.source_id?.trim() ?? '';
	if (!cid || !sid) return null;

	switch (item.source_type) {
		case 'task':
			return {
				v: 1,
				case_id: cid,
				authority: 'supporting',
				source_kind: 'task',
				source_record_id: sid,
				destination_surface: 'tasks'
			};
		case 'file':
			return {
				v: 1,
				case_id: cid,
				authority: 'supporting',
				source_kind: 'case_file',
				source_record_id: sid,
				destination_surface: 'files'
			};
		case 'extracted_text':
			return {
				v: 1,
				case_id: cid,
				authority: 'supporting',
				source_kind: 'extracted_text',
				source_record_id: sid,
				destination_surface: 'files'
			};
		default:
			return null;
	}
}

export type GotoFn = (
	url: string | URL,
	opts?: {
		replaceState?: boolean;
		noScroll?: boolean;
		state?: App.PageState;
	}
) => Promise<void>;

/**
 * Navigates to the destination surface for this intent. Passes intent via history state (no URL params);
 * does not scroll to anchors — P97-02+.
 */
export async function navigateToSynthesisSource(intent: SynthesisSourceNavigationIntent, gotoFn: GotoFn): Promise<void> {
	const path = synthesisDestinationPath(intent.case_id, intent.destination_surface);
	await gotoFn(path, {
		state: { synthesisSourceNavigationIntent: intent }
	});
}

/** Visible button text (short). */
export function synthesisSourceNavigateButtonText(intent: SynthesisSourceNavigationIntent): string {
	switch (intent.source_kind) {
		case 'timeline_entry':
			return 'Go to Timeline';
		case 'task':
			return 'Go to Tasks';
		case 'case_file':
			return 'Go to Files';
		case 'extracted_text':
			return 'Go to Files (source)';
	}
}

/** Accessible name (full). */
export function synthesisSourceNavigateControlLabel(intent: SynthesisSourceNavigationIntent): string {
	switch (intent.source_kind) {
		case 'timeline_entry':
			return 'Navigate to this Timeline entry';
		case 'task':
			return 'Navigate to this task record';
		case 'case_file':
			return 'Navigate to this file record';
		case 'extracted_text':
			return 'Navigate to this file record (extracted text source)';
	}
}
