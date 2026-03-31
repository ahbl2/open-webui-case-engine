/**
 * P34-18 — Frontend mirrors of Case Engine structured-notes extraction preview (`/notebook/structured-notes/extraction-preview`).
 * Source of truth: DetectiveCaseEngine `extractionProposal.ts`, `extractionValidation.ts`, `extractionRender.ts`, `extractionPreview.ts`.
 */

export type StructuredNoteExtractionStatus =
	| 'not_run'
	| 'complete'
	| 'partial'
	| 'failed';

export interface StructuredNoteStatementProposal {
	statementId: string;
	rawSpan: { start: number; end: number };
	verbatimText: string;
	statementType: string;
	sourceType: string;
	attributionDepth: string;
	certainty: string;
	entityRefs: string[];
	timeRefIds: string[];
	notes?: string | null;
	issueFlags?: string[];
}

export interface StructuredNoteEntityProposal {
	entityId: string;
	rawSpan: { start: number; end: number };
	verbatimText: string;
	entityType: string;
	statementRefs: string[];
}

export interface StructuredNoteTimeReferenceProposal {
	timeRefId: string;
	rawSpan: { start: number; end: number };
	verbatimText: string;
	normalizedValue: string | null;
	granularity: string;
	certainty: string;
}

export interface StructuredNoteConflictProposal {
	conflictId: string;
	statementIds: string[];
	conflictKind: string;
	rawSpan?: { start: number; end: number };
}

export interface StructuredNoteAmbiguityProposal {
	ambiguityId: string;
	ambiguityType: string;
	rawSpan: { start: number; end: number };
	verbatimText: string;
	relatedStatementIds?: string[];
	relatedEntityIds?: string[];
}

export interface StructuredNoteActionProposal {
	actionId: string;
	rawSpan: { start: number; end: number };
	verbatimText: string;
	timeRefIds: string[];
}

export interface StructuredNoteIssueProposal {
	issueId: string;
	issueType: string;
	message: string;
	rawSpan?: { start: number; end: number } | null;
}

export interface StructuredNoteExtractionProposal {
	schemaVersion: string;
	extractionStatus: StructuredNoteExtractionStatus;
	statements: StructuredNoteStatementProposal[];
	entities: StructuredNoteEntityProposal[];
	timeReferences: StructuredNoteTimeReferenceProposal[];
	conflicts: StructuredNoteConflictProposal[];
	ambiguities: StructuredNoteAmbiguityProposal[];
	actions: StructuredNoteActionProposal[];
	issues: StructuredNoteIssueProposal[];
}

export type StructuredNoteValidationStatus = 'pass' | 'pass_with_warnings' | 'fail';

export interface StructuredNoteValidationIssue {
	code: string;
	severity: 'error' | 'warning';
	message: string;
	affectedObjectIds: string[];
}

export interface StructuredNoteValidationResult {
	status: StructuredNoteValidationStatus;
	blockedRender: boolean;
	renderEligibility: string;
	errors: StructuredNoteValidationIssue[];
	warnings: StructuredNoteValidationIssue[];
}

export type StructuredNoteRenderStatus = 'rendered' | 'blocked';

export interface StructuredNoteRenderWarning {
	code: string;
	message: string;
	affectedObjectIds: string[];
}

/** P34-30 — optional per-statement expansion audit (CE `p34-render-2+`). */
export interface StructuredNoteStatementExpansionTrace {
	originalStructuredStatement: string;
	preControlledExpansionRendered: string;
	finalRenderedStatement: string;
	rulesApplied: string[];
}

export interface StructuredNoteRenderedBlock {
	blockId: string;
	kind: 'statement' | 'conflict' | 'ambiguity' | 'action' | 'issue';
	text: string;
	expansionTrace?: StructuredNoteStatementExpansionTrace;
}

export interface StructuredNoteRenderTraceMapEntry {
	blockId: string;
	statementIds: string[];
	conflictIds?: string[];
	ambiguityIds?: string[];
	actionIds?: string[];
	issueIds?: string[];
}

export interface StructuredNoteRenderResult {
	status: StructuredNoteRenderStatus;
	rendererVersion: string;
	renderedText: string;
	blocks: StructuredNoteRenderedBlock[];
	traceMap: StructuredNoteRenderTraceMapEntry[];
	warnings: StructuredNoteRenderWarning[];
	omittedObjectIds: string[];
}

export interface StructuredNoteExtractionPreviewMeta {
	statementCount: number;
	entityCount: number;
	timeReferenceCount: number;
	ambiguityCount: number;
	conflictCount: number;
	actionCount: number;
	issueCount: number;
}

/** Success payload from `POST .../structured-notes/extraction-preview`. */
export interface StructuredNotesExtractionPreviewData {
	proposal: StructuredNoteExtractionProposal;
	validation: StructuredNoteValidationResult;
	render: StructuredNoteRenderResult;
	meta: StructuredNoteExtractionPreviewMeta;
}

function isRecord(x: unknown): x is Record<string, unknown> {
	return x != null && typeof x === 'object' && !Array.isArray(x);
}

function isRawSpan(x: unknown): x is { start: number; end: number } {
	if (!isRecord(x)) return false;
	return typeof x.start === 'number' && typeof x.end === 'number';
}

function isStatementRow(x: unknown): x is StructuredNoteStatementProposal {
	if (!isRecord(x)) return false;
	return (
		typeof x.statementId === 'string' &&
		isRawSpan(x.rawSpan) &&
		typeof x.verbatimText === 'string' &&
		typeof x.statementType === 'string' &&
		typeof x.sourceType === 'string' &&
		typeof x.attributionDepth === 'string' &&
		typeof x.certainty === 'string' &&
		Array.isArray(x.entityRefs) &&
		x.entityRefs.every((id) => typeof id === 'string') &&
		Array.isArray(x.timeRefIds) &&
		x.timeRefIds.every((id) => typeof id === 'string')
	);
}

function isEntityRow(x: unknown): x is StructuredNoteEntityProposal {
	if (!isRecord(x)) return false;
	return (
		typeof x.entityId === 'string' &&
		isRawSpan(x.rawSpan) &&
		typeof x.verbatimText === 'string' &&
		typeof x.entityType === 'string' &&
		Array.isArray(x.statementRefs) &&
		x.statementRefs.every((id) => typeof id === 'string')
	);
}

function isTimeRefRow(x: unknown): x is StructuredNoteTimeReferenceProposal {
	if (!isRecord(x)) return false;
	return (
		typeof x.timeRefId === 'string' &&
		isRawSpan(x.rawSpan) &&
		typeof x.verbatimText === 'string' &&
		(x.normalizedValue === null || typeof x.normalizedValue === 'string') &&
		typeof x.granularity === 'string' &&
		typeof x.certainty === 'string'
	);
}

function isConflictRow(x: unknown): x is StructuredNoteConflictProposal {
	if (!isRecord(x)) return false;
	return (
		typeof x.conflictId === 'string' &&
		Array.isArray(x.statementIds) &&
		x.statementIds.every((id) => typeof id === 'string') &&
		typeof x.conflictKind === 'string'
	);
}

function isAmbiguityRow(x: unknown): x is StructuredNoteAmbiguityProposal {
	if (!isRecord(x)) return false;
	return (
		typeof x.ambiguityId === 'string' &&
		typeof x.ambiguityType === 'string' &&
		isRawSpan(x.rawSpan) &&
		typeof x.verbatimText === 'string'
	);
}

function isActionRow(x: unknown): x is StructuredNoteActionProposal {
	if (!isRecord(x)) return false;
	return (
		typeof x.actionId === 'string' &&
		isRawSpan(x.rawSpan) &&
		typeof x.verbatimText === 'string' &&
		Array.isArray(x.timeRefIds) &&
		x.timeRefIds.every((id) => typeof id === 'string')
	);
}

function isIssueRow(x: unknown): x is StructuredNoteIssueProposal {
	if (!isRecord(x)) return false;
	return typeof x.issueId === 'string' && typeof x.issueType === 'string' && typeof x.message === 'string';
}

function isValidationIssue(x: unknown): x is StructuredNoteValidationIssue {
	if (!isRecord(x)) return false;
	return (
		typeof x.code === 'string' &&
		(x.severity === 'error' || x.severity === 'warning') &&
		typeof x.message === 'string' &&
		Array.isArray(x.affectedObjectIds) &&
		x.affectedObjectIds.every((id) => typeof id === 'string')
	);
}

function isRenderedBlock(x: unknown): x is StructuredNoteRenderedBlock {
	if (!isRecord(x)) return false;
	const k = x.kind;
	return (
		typeof x.blockId === 'string' &&
		typeof x.text === 'string' &&
		(k === 'statement' || k === 'conflict' || k === 'ambiguity' || k === 'action' || k === 'issue')
	);
}

function isTraceEntry(x: unknown): x is StructuredNoteRenderTraceMapEntry {
	if (!isRecord(x)) return false;
	return typeof x.blockId === 'string' && Array.isArray(x.statementIds) && x.statementIds.every((id) => typeof id === 'string');
}

function isRenderWarning(x: unknown): x is StructuredNoteRenderWarning {
	if (!isRecord(x)) return false;
	return (
		typeof x.code === 'string' &&
		typeof x.message === 'string' &&
		Array.isArray(x.affectedObjectIds) &&
		x.affectedObjectIds.every((id) => typeof id === 'string')
	);
}

/**
 * Parse `data` object from `{ success: true, data }` preview response. Returns null if invalid.
 */
export function parseStructuredNotesExtractionPreviewData(data: unknown): StructuredNotesExtractionPreviewData | null {
	if (!isRecord(data)) return null;
	const proposalRaw = data.proposal;
	const validationRaw = data.validation;
	const renderRaw = data.render;
	const metaRaw = data.meta;
	if (!isRecord(proposalRaw) || !isRecord(validationRaw) || !isRecord(renderRaw) || !isRecord(metaRaw)) return null;

	if (typeof proposalRaw.schemaVersion !== 'string' || typeof proposalRaw.extractionStatus !== 'string') return null;
	const st = proposalRaw.statements;
	const ent = proposalRaw.entities;
	const tr = proposalRaw.timeReferences;
	const conf = proposalRaw.conflicts;
	const amb = proposalRaw.ambiguities;
	const act = proposalRaw.actions;
	const iss = proposalRaw.issues;
	if (
		!Array.isArray(st) ||
		!st.every(isStatementRow) ||
		!Array.isArray(ent) ||
		!ent.every(isEntityRow) ||
		!Array.isArray(tr) ||
		!tr.every(isTimeRefRow) ||
		!Array.isArray(conf) ||
		!conf.every(isConflictRow) ||
		!Array.isArray(amb) ||
		!amb.every(isAmbiguityRow) ||
		!Array.isArray(act) ||
		!act.every(isActionRow) ||
		!Array.isArray(iss) ||
		!iss.every(isIssueRow)
	) {
		return null;
	}

	const vs = validationRaw.status;
	if (vs !== 'pass' && vs !== 'pass_with_warnings' && vs !== 'fail') return null;
	if (typeof validationRaw.blockedRender !== 'boolean' || typeof validationRaw.renderEligibility !== 'string') return null;
	const errs = validationRaw.errors;
	const warns = validationRaw.warnings;
	if (!Array.isArray(errs) || !errs.every(isValidationIssue)) return null;
	if (!Array.isArray(warns) || !warns.every(isValidationIssue)) return null;

	const rs = renderRaw.status;
	if (rs !== 'rendered' && rs !== 'blocked') return null;
	if (typeof renderRaw.rendererVersion !== 'string' || typeof renderRaw.renderedText !== 'string') return null;
	const blocks = renderRaw.blocks;
	const traceMap = renderRaw.traceMap;
	const rw = renderRaw.warnings;
	const omitted = renderRaw.omittedObjectIds;
	if (!Array.isArray(blocks) || !blocks.every(isRenderedBlock)) return null;
	if (!Array.isArray(traceMap) || !traceMap.every(isTraceEntry)) return null;
	if (!Array.isArray(rw) || !rw.every(isRenderWarning)) return null;
	if (!Array.isArray(omitted) || !omitted.every((id) => typeof id === 'string')) return null;

	if (
		typeof metaRaw.statementCount !== 'number' ||
		typeof metaRaw.entityCount !== 'number' ||
		typeof metaRaw.timeReferenceCount !== 'number' ||
		typeof metaRaw.ambiguityCount !== 'number' ||
		typeof metaRaw.conflictCount !== 'number' ||
		typeof metaRaw.actionCount !== 'number' ||
		typeof metaRaw.issueCount !== 'number'
	) {
		return null;
	}

	return {
		proposal: {
			schemaVersion: proposalRaw.schemaVersion,
			extractionStatus: proposalRaw.extractionStatus as StructuredNoteExtractionStatus,
			statements: st,
			entities: ent,
			timeReferences: tr,
			conflicts: conf,
			ambiguities: amb,
			actions: act,
			issues: iss
		},
		validation: {
			status: vs,
			blockedRender: validationRaw.blockedRender,
			renderEligibility: validationRaw.renderEligibility,
			errors: errs,
			warnings: warns
		},
		render: {
			status: rs,
			rendererVersion: renderRaw.rendererVersion,
			renderedText: renderRaw.renderedText,
			blocks,
			traceMap,
			warnings: rw,
			omittedObjectIds: omitted
		},
		meta: {
			statementCount: metaRaw.statementCount,
			entityCount: metaRaw.entityCount,
			timeReferenceCount: metaRaw.timeReferenceCount,
			ambiguityCount: metaRaw.ambiguityCount,
			conflictCount: metaRaw.conflictCount,
			actionCount: metaRaw.actionCount,
			issueCount: metaRaw.issueCount
		}
	};
}
