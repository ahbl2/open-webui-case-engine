/**
 * P34-20 — Session-scoped structured-notes observability (OWUI only).
 * No note body, render text, or proposal payloads — metadata for P34-06 / P34-07 metrics only.
 */

import { writable } from 'svelte/store';

export const structuredNotesObservabilityTick = writable(0);

export const STRUCTURED_NOTES_OBS_LOG_PREFIX = '[structured_notes:observability]';

export const STRUCTURED_NOTES_OBS_MAX_EVENTS = 120;

export type StructuredNotesObsEventType =
	| 'structured_notes_preview_requested'
	| 'structured_notes_preview_loaded'
	| 'structured_notes_preview_failed'
	| 'structured_notes_traceability_used'
	| 'structured_notes_accept_clicked'
	| 'structured_notes_accept_failed'
	| 'structured_notes_edit_started'
	| 'structured_notes_edit_saved'
	| 'structured_notes_edit_save_failed'
	| 'structured_notes_reject_clicked'
	| 'structured_notes_reject_failed';

export type StructuredNotesObsEvent = {
	timestamp: number;
	correlationId: string;
	caseId: string;
	eventType: StructuredNotesObsEventType;
	noteId?: string | null;
	success?: boolean;
	validationStatus?: string;
	renderStatus?: string;
	blockedRender?: boolean;
	statementCount?: number;
	warningCount?: number;
	errorCount?: number;
	traceabilityInteractionType?: 'statement_row' | 'render_block';
	requestId?: string | null;
	errorHint?: string;
};

const buffer: StructuredNotesObsEvent[] = [];

function trimBuffer(): void {
	while (buffer.length > STRUCTURED_NOTES_OBS_MAX_EVENTS) buffer.shift();
}

function logToConsole(ev: StructuredNotesObsEvent): void {
	if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') {
		return;
	}
	if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
		// eslint-disable-next-line no-console
		console.debug(STRUCTURED_NOTES_OBS_LOG_PREFIX, {
			t: ev.eventType,
			correlationId: ev.correlationId,
			caseId: ev.caseId,
			noteId: ev.noteId,
			success: ev.success,
			validationStatus: ev.validationStatus,
			renderStatus: ev.renderStatus,
			trace: ev.traceabilityInteractionType,
			requestId: ev.requestId,
			errorHint: ev.errorHint
		});
	}
}

export function recordStructuredNotesObservabilityEvent(
	partial: Omit<StructuredNotesObsEvent, 'timestamp'> & { timestamp?: number }
): void {
	const ev: StructuredNotesObsEvent = {
		...partial,
		timestamp: partial.timestamp ?? Date.now()
	};
	buffer.push(ev);
	trimBuffer();
	structuredNotesObservabilityTick.update((n) => n + 1);
	logToConsole(ev);
}

export function getStructuredNotesObservabilityEvents(): readonly StructuredNotesObsEvent[] {
	return buffer;
}

export function clearStructuredNotesObservabilityEvents(): void {
	buffer.length = 0;
	structuredNotesObservabilityTick.update((n) => n + 1);
}

export function newStructuredNotesCorrelationId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `sn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
