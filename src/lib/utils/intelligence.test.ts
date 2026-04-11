import { describe, expect, it } from 'vitest';
import {
	buildIntelligenceHandoffMessage,
	detectCrossCaseSignal,
	detectIntelligenceIntent,
	resolveIntelligenceHandoff
} from './intelligence';

describe('detectIntelligenceIntent', () => {
	it('matches cross-case prompts', () => {
		expect(detectIntelligenceIntent('show cross-case overlap for this suspect')).toBe(true);
		expect(detectIntelligenceIntent('compare across cases for this phone')).toBe(true);
		expect(detectIntelligenceIntent('where else does this appear')).toBe(true);
		expect(detectIntelligenceIntent('show other cases with this number')).toBe(true);
	});

	it('matches intelligence phrasing', () => {
		expect(detectIntelligenceIntent('open intelligence for this case')).toBe(true);
		expect(detectIntelligenceIntent('entity intelligence on this person')).toBe(true);
		expect(detectIntelligenceIntent('find connections for this phone across cases')).toBe(true);
	});

	it('does not match ordinary case-scoped prompts', () => {
		expect(detectIntelligenceIntent('summarize this case timeline')).toBe(false);
		expect(detectIntelligenceIntent('show phone connections in this case')).toBe(false);
		expect(detectIntelligenceIntent('list workflow items')).toBe(false);
	});

	it('builds deterministic handoff message', () => {
		expect(buildIntelligenceHandoffMessage('case-123')).toBe(
			'Cross-case analysis: open Entity intelligence in Intelligence mode (search & Ask): /case/case-123/intelligence?mode=intelligence'
		);
	});

	it('prefers handoff for ambiguous intelligence prompts', () => {
		expect(
			resolveIntelligenceHandoff({
				prompt: 'where else does this person appear',
				caseId: 'abc-123'
			})
		).toBe('Cross-case analysis: open Entity intelligence in Intelligence mode (search & Ask): /case/abc-123/intelligence?mode=intelligence');
	});

	it('keeps case-scoped prompts out of handoff', () => {
		expect(
			resolveIntelligenceHandoff({
				prompt: 'summarize this case timeline',
				caseId: 'abc-123'
			})
		).toBeNull();
	});

	it('routes mixed this-case + cross-case prompts to handoff only', () => {
		expect(
			resolveIntelligenceHandoff({
				prompt: 'Summarize this case and tell me where else this phone appears',
				caseId: 'abc-123'
			})
		).toBe('Cross-case analysis: open Entity intelligence in Intelligence mode (search & Ask): /case/abc-123/intelligence?mode=intelligence');
		expect(
			resolveIntelligenceHandoff({
				prompt: 'What do we know about John in this case and any others',
				caseId: 'abc-123'
			})
		).toBe('Cross-case analysis: open Entity intelligence in Intelligence mode (search & Ask): /case/abc-123/intelligence?mode=intelligence');
		expect(
			resolveIntelligenceHandoff({
				prompt: 'List the timeline mentions here and compare them to other cases',
				caseId: 'abc-123'
			})
		).toBe('Cross-case analysis: open Entity intelligence in Intelligence mode (search & Ask): /case/abc-123/intelligence?mode=intelligence');
	});

	it('prefers conservative handoff whenever cross-case language appears', () => {
		expect(detectCrossCaseSignal('what do we know about this person in any others')).toBe(true);
		expect(
			resolveIntelligenceHandoff({
				prompt: 'what do we know about this person in any others',
				caseId: 'abc-123'
			})
		).toBe('Cross-case analysis: open Entity intelligence in Intelligence mode (search & Ask): /case/abc-123/intelligence?mode=intelligence');
	});

	it('returns handoff message only (no hybrid text)', () => {
		const handoff = resolveIntelligenceHandoff({
			prompt: 'compare this against other cases',
			caseId: 'abc-123'
		});
		expect(handoff).toBe('Cross-case analysis: open Entity intelligence in Intelligence mode (search & Ask): /case/abc-123/intelligence?mode=intelligence');
		expect(handoff?.includes('\n')).toBe(false);
	});
});
