/**
 * P33-07 — Read-time Ask integrity: presentation metadata for honest UI (no backend authority).
 * P74-09 — Variant surfaces use DS classes (`ds-ask-integrity-*`) via `detectivePrimitiveFoundation`.
 */

import { DS_ASK_INTEGRITY_CLASSES } from '../case/detectivePrimitiveFoundation';

export type AskIntegrityPresentation = 'SUPPORTED' | 'DEGRADED' | 'NOT_APPLICABLE';

export type AskFactItem = {
	text: string;
	supporting_citation_ids: string[];
};

export type AskInferenceItem = {
	text: string;
	anchored_citation_ids: string[];
};

export type AskIntegrityPresentationMeta = {
	badgeLabel: string;
	hint: string;
	panelClass: string;
};

const SUPPORTED_META: AskIntegrityPresentationMeta = {
	badgeLabel: 'Evidence-backed answer',
	hint: 'Read-time checks passed; citations and structured facts align with retrieval.',
	panelClass: `${DS_ASK_INTEGRITY_CLASSES.root} ${DS_ASK_INTEGRITY_CLASSES.supported}`
};

const DEGRADED_META: AskIntegrityPresentationMeta = {
	badgeLabel: 'Support limited',
	hint: 'The answer is shown, but evidentiary support did not meet the full strength threshold. Treat claims cautiously.',
	panelClass: `${DS_ASK_INTEGRITY_CLASSES.root} ${DS_ASK_INTEGRITY_CLASSES.degraded}`
};

const NOT_APPLICABLE_META: AskIntegrityPresentationMeta = {
	badgeLabel: 'Not assessed for evidence',
	hint: 'This path skipped full read-time evidentiary checks. The text is not labeled as citation-backed support.',
	panelClass: `${DS_ASK_INTEGRITY_CLASSES.root} ${DS_ASK_INTEGRITY_CLASSES.notApplicable}`
};

export function askIntegrityPresentationMeta(
	presentation: AskIntegrityPresentation | undefined | null
): AskIntegrityPresentationMeta | null {
	if (presentation == null) return null;
	switch (presentation) {
		case 'SUPPORTED':
			return SUPPORTED_META;
		case 'DEGRADED':
			return DEGRADED_META;
		case 'NOT_APPLICABLE':
			return NOT_APPLICABLE_META;
		default:
			return null;
	}
}

/** Normalize optional API arrays without inventing content. */
export function normalizeAskFactInferenceArrays(
	facts: unknown,
	inferences: unknown
): { facts: AskFactItem[]; inferences: AskInferenceItem[] } {
	const outFacts: AskFactItem[] = [];
	const outInf: AskInferenceItem[] = [];
	if (Array.isArray(facts)) {
		for (const row of facts) {
			if (row == null || typeof row !== 'object') continue;
			const t = (row as { text?: unknown }).text;
			const ids = (row as { supporting_citation_ids?: unknown }).supporting_citation_ids;
			if (typeof t !== 'string' || !Array.isArray(ids)) continue;
			const supporting = ids.filter((x): x is string => typeof x === 'string');
			outFacts.push({ text: t, supporting_citation_ids: supporting });
		}
	}
	if (Array.isArray(inferences)) {
		for (const row of inferences) {
			if (row == null || typeof row !== 'object') continue;
			const t = (row as { text?: unknown }).text;
			const ids = (row as { anchored_citation_ids?: unknown }).anchored_citation_ids;
			if (typeof t !== 'string' || !Array.isArray(ids)) continue;
			const anchored = ids.filter((x): x is string => typeof x === 'string');
			outInf.push({ text: t, anchored_citation_ids: anchored });
		}
	}
	return { facts: outFacts, inferences: outInf };
}
