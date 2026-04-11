/**
 * P78-16 — Canonical visible labels for case workspace destinations (aligned with
 * `routes/(app)/case/[id]/+layout.svelte` primary tab strip: Overview, AI workspace,
 * Entity intelligence, Proposals). Use these for cross-surface links and matching hints.
 */

export const CASE_DESTINATION_LABELS = {
	overview: 'Overview',
	aiWorkspace: 'AI workspace',
	entityIntelligence: 'Entity intelligence',
	/** Sub-mode control on the Entity intelligence route (Entities vs Intelligence). */
	intelligenceMode: 'Intelligence',
	/** Case Proposals tab (P19) — short link label. */
	caseProposals: 'Proposals',
	/** Case Timeline tab — official chronology (matches shell). */
	timeline: 'Timeline',
	/** Case Notes tab — investigator drafts (matches shell). */
	notes: 'Notes',
	/**
	 * Evidence drill-down to `/case/.../intelligence/entity/...` (non-phone);
	 * matches `entityEvidenceFocusControlLabel` when type is not phone.
	 */
	entityIntelligenceFocusDrillDown: 'Entity intelligence focus',
	/** Entity focus sub-route eyebrow (matches case shell tab name). */
	entityIntelligenceFocusEyebrow: 'Entity intelligence · focus'
} as const;

export const CASE_DESTINATION_HINTS = {
	/** Cross-case case matches panel — two destinations, same wording as case shell tabs. */
	crossCaseMatches:
		'Per matched case: Overview → structured case overview & synopsis; AI workspace → case thread (chat). Row actions use the same order.',
	/**
	 * Entity focus → hub with Intelligence sub-mode (P78-15 / P78-17 / P78-18).
	 * Must not read like Entities/board entry.
	 */
	backToEntityIntelligence: 'Back to Entity intelligence · Intelligence mode'
} as const;

export const CASE_DESTINATION_TITLES = {
	overview: 'Overview tab — case identity and synopsis',
	aiWorkspace: 'AI workspace — case thread',
	caseProposals: 'Proposals tab — governed P19 review and commit',
	/** Same intent as Workflow guidance deep link to Timeline. */
	timeline: 'Official committed timeline — not the Workflow planning layer',
	/** Same intent as Workflow guidance deep link to Notes. */
	notes: 'Investigator notes — working drafts, not the official Timeline',
	entityIntelligenceFocusRegion: 'Entity intelligence focus',
	caseProposalsOpenPill: 'Open the case Proposals tab (P19 review and commit).',
	/**
	 * P78-18 — case shell Entity intelligence tab opens `?mode=entities` (P78-17).
	 * Clarifies default entry vs Intelligence sub-tab (search & Ask).
	 */
	entityIntelligenceShellTabEntry:
		'Entity intelligence — opens Entities mode (registries and board first). Intelligence sub-tab for search, Ask, and evidence.'
} as const;

/**
 * P78-18 — Copy aligned to hub landing mode (P78-17); URLs unchanged.
 * Chat handoff targets Intelligence mode; shell tab targets Entities mode.
 */
export const INTELLIGENCE_ENTRY_COPY = {
	chatHandoffLead:
		'Cross-case analysis: open Entity intelligence in Intelligence mode (search & Ask):',
	chatHandoffNoCaseId:
		'Cross-case analysis: open Entity intelligence in Intelligence mode (search & Ask): /case/<id>/intelligence?mode=intelligence'
} as const;

/** P78-15 / P78-17 — URL-stable sub-modes on `/case/:id/intelligence`. */
export type CaseIntelligenceHubMode = 'entities' | 'intelligence';

export function caseIntelligenceHubHref(caseId: string, mode: CaseIntelligenceHubMode): string {
	return `/case/${caseId}/intelligence?mode=${mode}`;
}
