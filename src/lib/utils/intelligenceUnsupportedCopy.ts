/**
 * P78-14 — Centralized empty / unsupported copy for Intelligence mode and entity focus.
 * Keeps phrasing consistent: “this search”, “switch scope above”, “run Intelligence first”.
 */

export const INTELLIGENCE_UNSUPPORTED_COPY = {
	runSearchFirst: 'Run Intelligence (search above) first.',
	/** Ribbon under search when scope is This Case */
	thisCaseScopeRibbon:
		'This Case scope is case-limited. Cross-case analysis is shown only in CID, SIU, or All scope.',
	/** Cross-case analysis panel when scope is This Case */
	crossCaseNotInThisScope:
		'Not available in This Case scope — switch to CID, SIU, or All above.',
	noResultsThisSearch: 'No results for this search.',
	noStructuredResults: 'No structured query results for this run.',
	allSectionsEmptyHint: 'Try a broader term or change scope.',
	noSupportingEvidenceRowsForAnalysis: 'No supporting evidence rows for this analysis text.',
	noSupportingEvidenceForSearch: 'No supporting evidence for this search.',
	supportingEvidenceAnalysisWithoutRows: 'The analysis text above was returned without evidence rows.',
	noAnalysisText: 'No analysis text was returned for this search.',
	noAnalysisTextReviewEvidence: 'Review supporting evidence below.',
	noCasesMatched: 'No cases matched this search.',
	noEntityHits: 'No entity-type hits for this search.',
	noCitations: 'No citations for this search.'
} as const;

export const ENTITY_FOCUS_UNSUPPORTED_COPY = {
	badRouteTypePrefix: 'Unsupported entity type',
	notAvailableYet: 'Entity focus is not available for this type yet.',
	vehicleBody:
		'Evidence-grounded profile and timeline are not available for vehicles. Use the Entity board and this case’s committed vehicle records instead.',
	noMentions: 'No mentions found for this entity in this case.',
	noTimelineRefs: 'No timeline references found for this entity in this case.',
	noOtherCases: 'No other case references available for this entity.',
	noEvidenceExcerpts: 'No evidence excerpts available.',
	noDetailsReturned: 'No entity details were returned for this request.'
} as const;
