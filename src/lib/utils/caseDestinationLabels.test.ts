/**
 * P78-16 — Canonical case destination labels (aligned with case shell primary tabs).
 */
import { describe, expect, it } from 'vitest';
import {
	CASE_DESTINATION_HINTS,
	CASE_DESTINATION_LABELS,
	CASE_DESTINATION_TITLES,
	caseIntelligenceHubHref,
	INTELLIGENCE_ENTRY_COPY
} from './caseDestinationLabels';

describe('caseDestinationLabels (P78-16)', () => {
	it('matches case workspace shell tab labels for primary destinations', () => {
		expect(CASE_DESTINATION_LABELS.overview).toBe('Overview');
		expect(CASE_DESTINATION_LABELS.aiWorkspace).toBe('AI workspace');
		expect(CASE_DESTINATION_LABELS.entityIntelligence).toBe('Entity intelligence');
		expect(CASE_DESTINATION_LABELS.caseProposals).toBe('Proposals');
		expect(CASE_DESTINATION_LABELS.timeline).toBe('Timeline');
		expect(CASE_DESTINATION_LABELS.notes).toBe('Notes');
	});

	it('P78-21 — Timeline and Notes titles align with Workflow empty-state link intent', () => {
		expect(CASE_DESTINATION_TITLES.timeline.toLowerCase()).toContain('timeline');
		expect(CASE_DESTINATION_TITLES.notes.toLowerCase()).toContain('notes');
	});

	it('preserves distinct meanings for Intelligence mode vs Entity intelligence tab', () => {
		expect(CASE_DESTINATION_LABELS.intelligenceMode).toBe('Intelligence');
		expect(CASE_DESTINATION_LABELS.entityIntelligenceFocusDrillDown).toContain('Entity intelligence');
	});

	it('keeps governance hints for Proposals tab vs workflow queue copy', () => {
		expect(CASE_DESTINATION_TITLES.caseProposals).toContain('P19');
		expect(CASE_DESTINATION_TITLES.caseProposalsOpenPill).toContain('case Proposals tab');
	});

	it('cross-case helper names Overview and AI workspace explicitly', () => {
		expect(CASE_DESTINATION_HINTS.crossCaseMatches).toContain('Overview');
		expect(CASE_DESTINATION_HINTS.crossCaseMatches).toContain('AI workspace');
	});

	it('caseIntelligenceHubHref encodes P78-15 sub-modes (P78-17)', () => {
		expect(caseIntelligenceHubHref('c1', 'entities')).toBe('/case/c1/intelligence?mode=entities');
		expect(caseIntelligenceHubHref('c1', 'intelligence')).toBe('/case/c1/intelligence?mode=intelligence');
	});

	it('P78-18 — entry copy names Intelligence mode for handoff and Entities default for shell title', () => {
		expect(INTELLIGENCE_ENTRY_COPY.chatHandoffLead.toLowerCase()).toContain('intelligence mode');
		expect(CASE_DESTINATION_TITLES.entityIntelligenceShellTabEntry.toLowerCase()).toContain('entities mode');
		expect(CASE_DESTINATION_HINTS.backToEntityIntelligence.toLowerCase()).toContain('intelligence mode');
	});
});
