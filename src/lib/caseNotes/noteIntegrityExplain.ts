/**
 * P31-03: Parse API integrity failures and build investigator-facing copy.
 * Internal-key → { code, message } table must stay aligned with
 * DetectiveCaseEngine `src/services/noteIntegrityReasonContract.ts`.
 */

export type IntegrityFailureReason = { code: string; message: string };

export type IntegrityExplainBlock = {
	heading: string;
	bullets: string[];
	guidance: string[];
};

const BY_INTERNAL_KEY: Record<string, IntegrityFailureReason> = {
	'block-drift': {
		code: 'block_content_replacement',
		message:
			'A paragraph may have been replaced with different content than your original note, or important terms were lost.'
	},
	'coverage:empty': {
		code: 'coverage_empty_output',
		message: 'The output was empty or unusable after enhancement.'
	},
	'coverage:structure-mismatch': {
		code: 'coverage_structure_mismatch',
		message: 'The structure of the note (paragraphs or list layout) did not match your original draft.'
	},
	'coverage:length': {
		code: 'coverage_incomplete_length',
		message: 'The enhanced text is much shorter than your original — content may have been dropped.'
	},
	'coverage:key-terms': {
		code: 'coverage_key_terms',
		message:
			'Important names, numbers, or quoted terms from your original note may be missing in the enhanced version.'
	},
	'certainty-inflation': {
		code: 'certainty_inflation',
		message:
			'The enhanced version may remove a stated limitation or replace uncertain wording with a firm statement. Compare carefully to your original note.'
	},
	'qualifier-loss': {
		code: 'qualifier_loss',
		message:
			'The enhanced version may drop hedging, attribution, or uncertainty wording that was present in your original note.'
	},
	'entity-role-swap': {
		code: 'entity_role_swap',
		message:
			'The enhanced version may reverse who acted on whom in an explicit sold-to, hand-to, or met-between-names phrase. Compare carefully to your original note.'
	},
	fabrication: {
		code: 'fabrication_possible',
		message:
			'The enhanced version may introduce specific information (for example names or times) that was not in your original note.'
	},
	'enhance:assistant_voice_detected': {
		code: 'enhance_output_assistant_voice',
		message:
			'The enhanced text reads like a chat assistant instead of a cleaned note. Remove meta-replies and try again, or edit manually.'
	},
	'enhance:placeholder_detected': {
		code: 'enhance_output_placeholder',
		message:
			'The enhanced text contains bracketed placeholders (for example a date or name you still need to fill in). Replace them with your actual note content or edit manually.'
	},
	'enhance:speculative_language_added': {
		code: 'enhance_output_speculative_language',
		message:
			'The enhanced text adds speculative wording that was not in your original note. Keep only what your draft supports, or edit manually.'
	},
	'enhance:new_entity_detected': {
		code: 'enhance_output_new_entity',
		message:
			'The enhanced text appears to introduce a new name or label that was not in your original note. Remove additions or edit manually.'
	},
	'alignment:expansion': {
		code: 'alignment_expansion',
		message:
			'In safe mode the enhancement exceeded safe expansion limits for your note size. This is a coarse length check only; other integrity rules may also apply.'
	},
	'alignment:sentence-count': {
		code: 'alignment_sentence_count',
		message: 'In safe mode the output must not add sentences beyond your original note.'
	},
	'alignment:alignment': {
		code: 'alignment_untracked_content',
		message: 'In safe mode some sentences could not be matched closely enough to your original text.'
	},
	'directive-preservation': {
		code: 'directive_preservation',
		message:
			'Action items, next steps, or investigative directives from your original note may have been removed or weakened.'
	}
};

const GENERIC_REASON: IntegrityFailureReason = {
	code: 'integrity_check_failed',
	message:
		'The AI-edited version did not pass an integrity check. Compare the draft carefully to your original note.'
};

function dedupeByCode(reasons: IntegrityFailureReason[]): IntegrityFailureReason[] {
	const seen = new Set<string>();
	const out: IntegrityFailureReason[] = [];
	for (const r of reasons) {
		if (seen.has(r.code)) continue;
		seen.add(r.code);
		out.push(r);
	}
	return out;
}

/** Map validator internal keys (same strings as CE noteCommitIntegrityService) to contract reasons. */
export function integrityReasonsFromInternalKeys(internalKeys: string[]): IntegrityFailureReason[] {
	const out: IntegrityFailureReason[] = [];
	for (const k of internalKeys) {
		out.push(BY_INTERNAL_KEY[k] ?? GENERIC_REASON);
	}
	return dedupeByCode(out);
}

/** Parse `error.details` from Case Engine notebook integrity responses (object or legacy string[]). */
export function parseIntegrityFailureDetails(details: unknown): IntegrityFailureReason[] {
	if (details == null || typeof details !== 'object') return [];
	const reasonsRaw = (details as { reasons?: unknown }).reasons;
	if (!Array.isArray(reasonsRaw)) return [];
	const out: IntegrityFailureReason[] = [];
	for (const item of reasonsRaw) {
		if (item != null && typeof item === 'object' && 'code' in item && 'message' in item) {
			const code = (item as { code: unknown }).code;
			const message = (item as { message: unknown }).message;
			if (typeof code === 'string' && typeof message === 'string') {
				out.push({ code, message });
			}
		} else if (typeof item === 'string') {
			out.push(BY_INTERNAL_KEY[item] ?? { ...GENERIC_REASON });
		}
	}
	return dedupeByCode(out);
}

const FALLBACK_SAVE =
	'This save was blocked because the AI-edited text did not pass integrity checks against your original draft.';

export const NOTE_INTEGRITY_GUIDANCE_SAVE: string[] = [
	'Review the draft against your original note (or the pre-enhance baseline you started from).',
	'Remove unsupported additions, or edit the text manually so it matches what you can support, then save again.',
	'If you need to commit without this AI pass, restore your original wording so it matches the baseline, or save a version without forwarding the integrity baseline.'
];

export const NOTE_INTEGRITY_GUIDANCE_ENHANCE: string[] = [
	'Review your draft against the original note text.',
	'Try a shorter section, edit manually, or save without applying enhancement if you need to proceed.'
];

export function buildSaveBlockedExplain(details: unknown, apiMessage: string): IntegrityExplainBlock {
	const parsed = parseIntegrityFailureDetails(details);
	const bullets =
		parsed.length > 0
			? parsed.map((r) => r.message)
			: [apiMessage.trim() || FALLBACK_SAVE];
	return {
		heading: 'Save blocked by integrity checks',
		bullets,
		guidance: NOTE_INTEGRITY_GUIDANCE_SAVE
	};
}

export function buildEnhanceRejectedExplain(reasons: IntegrityFailureReason[]): IntegrityExplainBlock {
	return {
		heading: 'Enhancement rejected',
		bullets: reasons.length > 0 ? reasons.map((r) => r.message) : [GENERIC_REASON.message],
		guidance: NOTE_INTEGRITY_GUIDANCE_ENHANCE
	};
}
