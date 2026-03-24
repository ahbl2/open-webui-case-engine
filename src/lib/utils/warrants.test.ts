import { describe, expect, it } from 'vitest';
import type {
	TemplateMeta,
	WarrantDraftResult,
	NarrativeEvent,
	ExhibitItem,
	ProsecutorSummarySection
} from '$lib/apis/caseEngine';
import {
	detectWarrantChatIntent,
	formatAiWarrantDraftForChat,
	formatExhibitsForChat,
	formatNarrativeTimelineForChat,
	formatProsecutorSummaryForChat,
	formatTemplateListForChat
} from './warrants';

describe('warrants utils', () => {
	it('detects warrant/template chat intents', () => {
		expect(detectWarrantChatIntent('show templates')).toBe('list_templates');
		expect(detectWarrantChatIntent('generate warrant draft')).toBe('ai_warrant_draft');
		expect(detectWarrantChatIntent('show prosecutor summary')).toBe('prosecutor_summary');
		expect(detectWarrantChatIntent('show exhibits')).toBe('exhibits');
		expect(detectWarrantChatIntent('show narrative timeline')).toBe('narrative_timeline');
		expect(detectWarrantChatIntent('render template pdf')).toBe('handoff_render_export');
	});

	it('formats grounded template list and empty states', () => {
		const templates: TemplateMeta[] = [
			{ templateId: 'a', label: 'Search Warrant', category: 'warrant', disabled: false }
		];
		const withData = formatTemplateListForChat(templates, 'c1');
		expect(withData).toContain('available warrant/templates');
		expect(withData).toContain('Search Warrant (warrant)');
		expect(withData).toContain('/case/c1/warrants');

		const empty = formatTemplateListForChat([], 'c2');
		expect(empty).toContain('No templates available.');
	});

	it('formats AI warrant draft and secondary outputs safely', () => {
		const draft: WarrantDraftResult = {
			caseId: 'c1',
			purpose: 'probable_cause',
			generatedAt: '2026-01-01T00:00:00Z',
			evidencePack: { packVersion: 1, items: [] },
			draft: {
				title: 'Draft A',
				probableCauseNarrative: 'Narrative',
				requestedItems: ['Phone'],
				locations: ['Address 1'],
				people: ['John Doe'],
				timelineHighlights: ['Event 1'],
				citations: [],
				confidenceNotes: ['Note 1'],
				missingInfoQuestions: ['Question 1']
			},
			model: { provider: 'x', model: 'y' }
		};
		expect(formatAiWarrantDraftForChat(draft, 'c1')).toContain('AI warrant draft generated');

		const events: NarrativeEvent[] = [];
		expect(formatNarrativeTimelineForChat(events, 'c1')).toContain('No narrative timeline events returned.');

		const exhibits: ExhibitItem[] = [];
		expect(formatExhibitsForChat(exhibits, 'c1')).toContain('No exhibits returned.');

		const sections: ProsecutorSummarySection[] = [];
		expect(formatProsecutorSummaryForChat(sections, 'c1')).toContain('No prosecutor summary sections returned.');
	});
});
