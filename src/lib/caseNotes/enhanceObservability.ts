/**
 * P31-17 — Session-scoped Enhance workflow observability (OWUI only).
 * No note body text, no persistence, no Case Engine writes.
 */

import { writable } from 'svelte/store';
import { parseIntegrityFailureDetails } from './noteIntegrityExplain';

/** Bumped on each record/clear so Svelte subscribers can refresh dev UI. */
export const enhanceObservabilityTick = writable(0);

export const ENHANCE_OBSERVABILITY_LOG_PREFIX = '[enhance:observability]';

/** Max events retained in memory per browser tab (ring buffer). */
export const ENHANCE_OBSERVABILITY_MAX_EVENTS = 120;

export type EnhanceObservabilityValidationMode = 'strict' | 'safe' | 'safe_cleanup' | null;

export type EnhanceObservabilityOutcome =
	| 'pipeline_started'
	| 'accepted'
	| 'rejected'
	| 'fatal'
	| 'error'
	| 'skipped_precondition'
	| 'applied'
	| 'dismissed'
	| 'save_integrity_blocked';

export type EnhanceObservabilityEventType =
	| 'enhance_requested'
	| 'enhance_validation_outcome'
	| 'enhance_fallback_attempted'
	| 'enhance_applied'
	| 'enhance_dismissed'
	| 'enhance_precondition_failed'
	| 'save_integrity_blocked'
	| 'enhance_safe_cleanup_offered'
	| 'enhance_safe_cleanup_applied';

export type EnhanceObservabilityNoteContext =
	| { kind: 'create' }
	| { kind: 'edit'; noteId: string };

export type EnhanceObservabilityMetadata = {
	draftCharCount?: number;
	paragraphBlockCount?: number;
	integrityBaselinePresent?: boolean;
	enhanceFallbackUsed?: boolean;
	/** Model stopped early (finish_reason length) when fatal path applies. */
	modelTruncated?: boolean;
	modelId?: string;
};

export type EnhanceObservabilityEvent = {
	timestamp: number;
	caseId: string;
	noteContext: EnhanceObservabilityNoteContext;
	correlationId: string;
	eventType: EnhanceObservabilityEventType;
	validationMode: EnhanceObservabilityValidationMode;
	outcome: EnhanceObservabilityOutcome;
	reasonCodes: string[];
	/** Case Engine `X-Request-Id` when a save fails with integrity (optional). */
	requestId?: string;
	metadata?: EnhanceObservabilityMetadata;
};

const buffer: EnhanceObservabilityEvent[] = [];

function trimBuffer(): void {
	while (buffer.length > ENHANCE_OBSERVABILITY_MAX_EVENTS) buffer.shift();
}

function logToConsole(ev: EnhanceObservabilityEvent): void {
	if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') {
		return;
	}
	if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
		// eslint-disable-next-line no-console
		console.debug(ENHANCE_OBSERVABILITY_LOG_PREFIX, {
			t: ev.eventType,
			outcome: ev.outcome,
			mode: ev.validationMode,
			codes: ev.reasonCodes,
			correlationId: ev.correlationId,
			caseId: ev.caseId,
			note: ev.noteContext.kind,
			noteId: ev.noteContext.kind === 'edit' ? ev.noteContext.noteId : undefined,
			requestId: ev.requestId,
			meta: ev.metadata
		});
	}
}

export function recordEnhanceObservabilityEvent(
	partial: Omit<EnhanceObservabilityEvent, 'timestamp'> & { timestamp?: number }
): void {
	const ev: EnhanceObservabilityEvent = {
		...partial,
		reasonCodes: [...partial.reasonCodes],
		timestamp: partial.timestamp ?? Date.now()
	};
	buffer.push(ev);
	trimBuffer();
	enhanceObservabilityTick.update((n) => n + 1);
	logToConsole(ev);
}

export function getEnhanceObservabilityEvents(): readonly EnhanceObservabilityEvent[] {
	return buffer;
}

export function clearEnhanceObservabilityEvents(): void {
	buffer.length = 0;
	enhanceObservabilityTick.update((n) => n + 1);
}

export function newEnhanceCorrelationId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `enh-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function reasonCodesFromIntegrityFailureDetails(details: unknown): string[] {
	return parseIntegrityFailureDetails(details).map((r) => r.code);
}

export function reasonCodesFromEnhanceReasons(
	reasons: ReadonlyArray<{ code: string }> | undefined
): string[] {
	if (!reasons?.length) return [];
	const out: string[] = [];
	const seen = new Set<string>();
	for (const r of reasons) {
		if (seen.has(r.code)) continue;
		seen.add(r.code);
		out.push(r.code);
	}
	return out;
}
