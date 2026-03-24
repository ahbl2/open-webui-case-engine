import type {
	TemplateMeta,
	WarrantDraftResult,
	NarrativeEvent,
	ExhibitItem,
	ProsecutorSummarySection
} from '$lib/apis/caseEngine';

export type WarrantChatIntent =
	| 'list_templates'
	| 'ai_warrant_draft'
	| 'narrative_timeline'
	| 'exhibits'
	| 'prosecutor_summary'
	| 'handoff_render_export';

export function detectWarrantChatIntent(input: string): WarrantChatIntent | null {
	const q = String(input ?? '').toLowerCase().trim();
	if (!q) return null;

	if (
		(/\b(render|export|download)\b/.test(q) &&
			(/\btemplate\b/.test(q) || /\bwarrant packet\b/.test(q) || /\bpdf\b/.test(q))) ||
		/\brender template\b/.test(q)
	) {
		return 'handoff_render_export';
	}
	if (/\b(show|list|view|available)\b/.test(q) && /\btemplates?\b/.test(q)) {
		return 'list_templates';
	}
	if (/\bwarrant draft\b/.test(q) || (/\bgenerate\b/.test(q) && /\bwarrant\b/.test(q))) {
		return 'ai_warrant_draft';
	}
	if (/\bprosecutor summary\b/.test(q)) {
		return 'prosecutor_summary';
	}
	if (/\bnarrative timeline\b/.test(q) || (/\bnarrative\b/.test(q) && /\btimeline\b/.test(q))) {
		return 'narrative_timeline';
	}
	if (/\bexhibits?\b/.test(q)) {
		return 'exhibits';
	}
	return null;
}

export function formatTemplateListForChat(templates: TemplateMeta[], caseId: string): string {
	const lines: string[] = [];
	lines.push('Here are the available warrant/templates for this case workflow.');
	if (templates.length === 0) {
		lines.push('No templates available.');
	} else {
		for (const t of templates.slice(0, 8)) {
			lines.push(`- ${t.label} (${t.category})${t.disabled ? ' [disabled]' : ''}`);
		}
	}
	lines.push('Use the Warrants tab for render and export actions.');
	lines.push(`/case/${caseId}/warrants`);
	return lines.join('\n');
}

export function formatAiWarrantDraftForChat(result: WarrantDraftResult, caseId: string): string {
	const draft = result.draft;
	const lines: string[] = [];
	lines.push('AI warrant draft generated from real case data.');
	lines.push(`- Title: ${draft.title || '(untitled)'}`);
	lines.push(`- Probable cause narrative: ${draft.probableCauseNarrative ? 'available' : 'not available'}`);
	lines.push(`- Requested items: ${draft.requestedItems?.length ?? 0}`);
	lines.push(`- Locations: ${draft.locations?.length ?? 0}`);
	lines.push(`- People: ${draft.people?.length ?? 0}`);
	lines.push(`- Timeline highlights: ${draft.timelineHighlights?.length ?? 0}`);
	lines.push(`- Confidence notes: ${draft.confidenceNotes?.length ?? 0}`);
	lines.push(`- Missing info questions: ${draft.missingInfoQuestions?.length ?? 0}`);
	lines.push(`- Citation links: ${draft.citations?.length ?? 0}`);
	lines.push('View full draft details in the Warrants tab.');
	lines.push(`/case/${caseId}/warrants`);
	return lines.join('\n');
}

export function formatNarrativeTimelineForChat(
	events: NarrativeEvent[],
	caseId: string
): string {
	const lines: string[] = [];
	lines.push('Narrative timeline from backend case data:');
	if (events.length === 0) {
		lines.push('No narrative timeline events returned.');
	} else {
		for (const e of events.slice(0, 6)) {
			lines.push(`- ${e.occurred_at}: ${e.title ?? e.event_type}`);
		}
	}
	lines.push('View full details in the Warrants tab.');
	lines.push(`/case/${caseId}/warrants`);
	return lines.join('\n');
}

export function formatExhibitsForChat(exhibits: ExhibitItem[], caseId: string): string {
	const lines: string[] = [];
	lines.push('Exhibit list from backend case data:');
	if (exhibits.length === 0) {
		lines.push('No exhibits returned.');
	} else {
		for (const e of exhibits.slice(0, 8)) {
			lines.push(`- ${e.exhibit_id}: ${e.title ?? '(untitled exhibit)'}`);
		}
	}
	lines.push('View full details in the Warrants tab.');
	lines.push(`/case/${caseId}/warrants`);
	return lines.join('\n');
}

export function formatProsecutorSummaryForChat(
	sections: ProsecutorSummarySection[],
	caseId: string
): string {
	const lines: string[] = [];
	lines.push('Prosecutor summary from backend case data:');
	if (sections.length === 0) {
		lines.push('No prosecutor summary sections returned.');
	} else {
		for (const s of sections.slice(0, 6)) {
			lines.push(`- ${s.section}: ${s.text ? 'available' : 'empty'}`);
		}
	}
	lines.push('View full details in the Warrants tab.');
	lines.push(`/case/${caseId}/warrants`);
	return lines.join('\n');
}
