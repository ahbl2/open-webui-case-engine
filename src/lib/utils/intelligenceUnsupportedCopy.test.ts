import { describe, expect, it } from 'vitest';
import {
	ENTITY_FOCUS_UNSUPPORTED_COPY,
	INTELLIGENCE_UNSUPPORTED_COPY
} from './intelligenceUnsupportedCopy';

describe('P78-14 intelligence unsupported copy', () => {
	it('uses consistent “this search” wording for empty result lines', () => {
		expect(INTELLIGENCE_UNSUPPORTED_COPY.noResultsThisSearch).toContain('this search');
		expect(INTELLIGENCE_UNSUPPORTED_COPY.noStructuredResults).toContain('this run');
		expect(INTELLIGENCE_UNSUPPORTED_COPY.noSupportingEvidenceForSearch).toContain('this search');
		expect(INTELLIGENCE_UNSUPPORTED_COPY.noCasesMatched).toContain('this search');
		expect(INTELLIGENCE_UNSUPPORTED_COPY.noEntityHits).toContain('this search');
		expect(INTELLIGENCE_UNSUPPORTED_COPY.noCitations).toContain('this search');
		expect(INTELLIGENCE_UNSUPPORTED_COPY.noAnalysisText).toContain('this search');
	});

	it('runSearchFirst and scope messages point to UI affordances', () => {
		expect(INTELLIGENCE_UNSUPPORTED_COPY.runSearchFirst.toLowerCase()).toContain('intelligence');
		expect(INTELLIGENCE_UNSUPPORTED_COPY.crossCaseNotInThisScope.toLowerCase()).toContain('switch');
		expect(INTELLIGENCE_UNSUPPORTED_COPY.thisCaseScopeRibbon.toLowerCase()).toContain('this case');
	});

	it('entity focus copy covers unsupported and empty states', () => {
		expect(ENTITY_FOCUS_UNSUPPORTED_COPY.notAvailableYet.length).toBeGreaterThan(10);
		expect(ENTITY_FOCUS_UNSUPPORTED_COPY.vehicleBody.toLowerCase()).toContain('vehicle');
		expect(ENTITY_FOCUS_UNSUPPORTED_COPY.noMentions).toContain('this case');
	});
});
