/**
 * P21-04 — Detective-specific static suggestion sets.
 *
 * These replace generic Open WebUI starter prompts in the desktop and case
 * empty-state views. Suggestions are scope-aware (desktop vs. case), prefill-only
 * (no auto-submit), and static (no backend, no personalization).
 *
 * Shape matches the { content, title } format consumed by Suggestions.svelte.
 */

export interface SuggestionPrompt {
	content: string;
	title: [string, string];
}

/** Shown in the My Desktop empty state — cross-case / general detective work. */
export const DESKTOP_SUGGESTIONS: SuggestionPrompt[] = [
	{
		content: 'Summarize my recent investigative activity.',
		title: ['Recent activity', 'Summarize across active cases']
	},
	{
		content: 'What follow-up items appear across my current work?',
		title: ['Follow-up items', 'What needs attention']
	},
	{
		content: 'Help me organize notes from multiple investigations.',
		title: ['Organize notes', 'Across multiple investigations']
	},
	{
		content: 'Summarize what I worked on this week.',
		title: ['Weekly summary', 'What I covered this week']
	}
];

/** Shown in the case chat empty state — single-case investigative work. */
export const CASE_SUGGESTIONS: SuggestionPrompt[] = [
	{
		content: 'Summarize this case.',
		title: ['Case summary', 'Key facts and current status']
	},
	{
		content: 'What are the most recent developments in this case?',
		title: ['Recent developments', 'What has changed']
	},
	{
		content: 'List names mentioned in this case.',
		title: ['Extract names', 'People referenced in case records']
	},
	{
		content: 'Extract phone numbers from this case.',
		title: ['Extract phone numbers', 'Numbers found in case records']
	},
	{
		content: 'Help me organize notes for this case.',
		title: ['Organize case notes', 'Structure and clarify key points']
	},
	{
		content: 'Draft a timeline-style summary of this case.',
		title: ['Timeline summary', 'Chronological case overview']
	}
];
