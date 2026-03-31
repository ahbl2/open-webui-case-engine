import { describe, expect, it } from 'vitest';
import { parseStructuredNotesExtractionPreviewData } from './extractionPreview';

const minimalValidPayload = {
	proposal: {
		schemaVersion: 'p34-extract-1',
		extractionStatus: 'not_run',
		statements: [] as unknown[],
		entities: [] as unknown[],
		timeReferences: [] as unknown[],
		conflicts: [] as unknown[],
		ambiguities: [] as unknown[],
		actions: [] as unknown[],
		issues: [] as unknown[]
	},
	validation: {
		status: 'pass',
		blockedRender: false,
		renderEligibility: 'eligible',
		errors: [] as unknown[],
		warnings: [] as unknown[]
	},
	render: {
		status: 'rendered',
		rendererVersion: 'p34-render-2',
		renderedText: '',
		blocks: [] as unknown[],
		traceMap: [] as unknown[],
		warnings: [] as unknown[],
		omittedObjectIds: [] as unknown[]
	},
	meta: {
		statementCount: 0,
		entityCount: 0,
		timeReferenceCount: 0,
		ambiguityCount: 0,
		conflictCount: 0,
		actionCount: 0,
		issueCount: 0
	}
};

describe('parseStructuredNotesExtractionPreviewData (P34-18)', () => {
	it('accepts minimal scaffold-shaped payload', () => {
		const p = parseStructuredNotesExtractionPreviewData(minimalValidPayload);
		expect(p).not.toBeNull();
		expect(p!.proposal.schemaVersion).toBe('p34-extract-1');
		expect(p!.validation.status).toBe('pass');
		expect(p!.render.rendererVersion).toBe('p34-render-2');
	});

	it('rejects missing proposal', () => {
		expect(parseStructuredNotesExtractionPreviewData({})).toBeNull();
	});

	it('parses one statement row', () => {
		const withStmt = {
			...minimalValidPayload,
			proposal: {
				...minimalValidPayload.proposal,
				statements: [
					{
						statementId: 's1',
						rawSpan: { start: 0, end: 3 },
						verbatimText: 'abc',
						statementType: 'observation',
						sourceType: 'investigator_observed',
						attributionDepth: 'none',
						certainty: 'asserted',
						entityRefs: [],
						timeRefIds: []
					}
				]
			},
			meta: { ...minimalValidPayload.meta, statementCount: 1 }
		};
		const p = parseStructuredNotesExtractionPreviewData(withStmt);
		expect(p?.proposal.statements).toHaveLength(1);
		expect(p?.proposal.statements[0].statementId).toBe('s1');
	});
});
