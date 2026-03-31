/**
 * Phase 32 — Enhance pipeline audit (read-only diagnostics).
 * No validation / guard / prompt / cleanup behavior changes — session-scoped stats only.
 * Does not persist note text; diff uses lengths and coarse token counts only.
 */

import { writable } from 'svelte/store';

export const enhancePipelineAuditTick = writable(0);

export type EnhancePipelineStrictSafeResult = 'accepted' | 'rejected' | 'error' | 'skipped' | 'pending';

/** Server-validated cleanup preview outcome (not user apply). */
export type EnhancePipelineCleanupResult = 'applied' | 'no_op' | 'invalid' | 'skipped' | 'pending';

export type EnhancePipelineAuditDiffStats = {
	wordDelta: number;
	sentenceDelta: number;
	addedTokens: number;
	removedTokens: number;
	inputLen: number;
	outputLen: number;
	/** Percent change in character length (output vs input). */
	pctChange: number;
};

export type EnhancePipelineAuditRecord = {
	correlationId: string;
	caseId: string;
	timestamp: number;
	inputLength: number;
	outputLength: number | null;
	strictResult: EnhancePipelineStrictSafeResult;
	safeResult: EnhancePipelineStrictSafeResult;
	cleanupResult: EnhancePipelineCleanupResult;
	failedChecks: string[];
	reasonCodes: string[];
	diffStats: EnhancePipelineAuditDiffStats | null;
};

const MAX_HISTORY = 40;
let activeCorrelationId: string | null = null;
let draft: Partial<EnhancePipelineAuditRecord> | null = null;

const history: EnhancePipelineAuditRecord[] = [];

export const enhancePipelineAuditLast = writable<EnhancePipelineAuditRecord | null>(null);
export const enhancePipelineAuditHistory = writable<readonly EnhancePipelineAuditRecord[]>([]);

function bump(): void {
	enhancePipelineAuditTick.update((n) => n + 1);
}

function syncHistoryStore(): void {
	enhancePipelineAuditHistory.set([...history]);
}

/** Map integrity / enhance reason codes to coarse guard buckets for audit charts. */
export function mapReasonCodesToAuditGuards(codes: readonly string[]): string[] {
	const buckets = new Set<string>();
	for (const raw of codes) {
		const c = raw.toLowerCase();
		if (
			c.includes('fabrication') ||
			c.includes('placeholder') ||
			c.includes('assistant') ||
			c.includes('speculative')
		) {
			buckets.add('output-guardrails');
			continue;
		}
		if (c.includes('directive')) {
			buckets.add('directive-preservation');
			continue;
		}
		if (c.includes('certainty') || c.includes('qualifier') || c.includes('hedging')) {
			buckets.add('certainty-qualifier');
			continue;
		}
		if (c.includes('entity') || c.includes('role') || c.includes('swap') || c.includes('sold') || c.includes('hand')) {
			buckets.add('entity-role');
			continue;
		}
		if (c.includes('token-count') || c === 'token-count') {
			buckets.add('token-count');
			continue;
		}
		if (c.includes('coverage') || c.includes('alignment') || c.includes('block-drift') || c.includes('expansion')) {
			buckets.add('coverage-alignment');
			continue;
		}
		if (c.length > 0) buckets.add(`other:${raw}`);
	}
	return [...buckets].sort();
}

function tokenizeWords(s: string): string[] {
	return s
		.trim()
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean);
}

function sentenceCount(s: string): number {
	const t = s.trim();
	if (!t) return 0;
	return t.split(/[.!?]+/).filter((x) => x.trim().length > 0).length;
}

export function computeEnhanceAuditDiffStats(input: string, output: string | null | undefined): EnhancePipelineAuditDiffStats | null {
	if (output == null || output === undefined) return null;
	const inputLen = input.length;
	const outputLen = output.length;
	const pctChange = inputLen > 0 ? Math.round(((outputLen - inputLen) / inputLen) * 1000) / 10 : 0;
	const wi = tokenizeWords(input);
	const wo = tokenizeWords(output);
	const si = new Set(wi);
	const so = new Set(wo);
	let added = 0;
	for (const w of so) if (!si.has(w)) added++;
	let removed = 0;
	for (const w of si) if (!so.has(w)) removed++;
	return {
		wordDelta: wo.length - wi.length,
		sentenceDelta: sentenceCount(output) - sentenceCount(input),
		addedTokens: added,
		removedTokens: removed,
		inputLen,
		outputLen,
		pctChange
	};
}

export function getEnhancePipelineAuditActiveCorrelation(): string | null {
	return activeCorrelationId;
}

export function beginEnhancePipelineAudit(params: {
	correlationId: string;
	caseId: string;
	inputLength: number;
}): void {
	if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') {
		return;
	}
	activeCorrelationId = params.correlationId;
	draft = {
		correlationId: params.correlationId,
		caseId: params.caseId,
		timestamp: Date.now(),
		inputLength: params.inputLength,
		outputLength: null,
		strictResult: 'pending',
		safeResult: 'skipped',
		cleanupResult: 'skipped',
		failedChecks: [],
		reasonCodes: [],
		diffStats: null
	};
	bump();
}

export function commitEnhancePipelineAuditPatch(patch: Partial<EnhancePipelineAuditRecord>): void {
	if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') return;
	if (!activeCorrelationId || !draft) return;
	if (patch.correlationId && patch.correlationId !== activeCorrelationId) return;

	const nextCodes = [...new Set([...(draft.reasonCodes ?? []), ...(patch.reasonCodes ?? [])])];
	const guardBuckets = mapReasonCodesToAuditGuards(nextCodes);
	const nextFailed = [
		...new Set([...(draft.failedChecks ?? []), ...(patch.failedChecks ?? []), ...guardBuckets])
	].sort();

	Object.assign(draft, patch, {
		reasonCodes: nextCodes,
		failedChecks: nextFailed
	});
	bump();
}

function buildConsolePayload(rec: EnhancePipelineAuditRecord): Record<string, unknown> {
	return {
		inputLength: rec.inputLength,
		outputLength: rec.outputLength,
		strictResult: rec.strictResult,
		safeResult: rec.safeResult,
		cleanupResult: rec.cleanupResult,
		failedChecks: rec.failedChecks,
		reasonCodes: rec.reasonCodes,
		diffStats: rec.diffStats
	};
}

export function finalizeEnhancePipelineAudit(): void {
	if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') return;
	if (!activeCorrelationId || !draft?.correlationId) {
		activeCorrelationId = null;
		draft = null;
		return;
	}

	const strictResult = (draft.strictResult === 'pending' ? 'error' : draft.strictResult) as EnhancePipelineStrictSafeResult;
	const safeResult = (draft.safeResult === 'pending' ? 'skipped' : draft.safeResult) as EnhancePipelineStrictSafeResult;
	const cleanupResult = (draft.cleanupResult === 'pending' ? 'skipped' : draft.cleanupResult) as EnhancePipelineCleanupResult;

	const reasonCodes = [...(draft.reasonCodes ?? [])].sort();
	const failedChecks = [
		...new Set([...(draft.failedChecks ?? []), ...mapReasonCodesToAuditGuards(reasonCodes)])
	].sort();

	const rec: EnhancePipelineAuditRecord = {
		correlationId: draft.correlationId,
		caseId: draft.caseId ?? '',
		timestamp: draft.timestamp ?? Date.now(),
		inputLength: draft.inputLength ?? 0,
		outputLength: draft.outputLength ?? null,
		strictResult,
		safeResult,
		cleanupResult,
		failedChecks,
		reasonCodes,
		diffStats: draft.diffStats ?? null
	};

	if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
		// eslint-disable-next-line no-console
		console.debug('[enhance:pipeline-audit]', buildConsolePayload(rec));
	}

	history.push(rec);
	while (history.length > MAX_HISTORY) history.shift();
	enhancePipelineAuditLast.set(rec);
	syncHistoryStore();

	activeCorrelationId = null;
	draft = null;
	bump();
}

export function clearEnhancePipelineAuditHistory(): void {
	history.length = 0;
	enhancePipelineAuditLast.set(null);
	syncHistoryStore();
	bump();
}
