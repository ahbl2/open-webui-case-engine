export function buildIntelligenceHandoffMessage(caseId: string): string {
	return `Cross-case analysis is available in the Intelligence tab: /case/${caseId}/intelligence`;
}

export function detectCrossCaseSignal(input: string): boolean {
	const q = String(input ?? '').toLowerCase().trim();
	if (!q) return false;

	const explicitCrossCaseSignals =
		/\bcross[- ]case\b/.test(q) ||
		/\bacross cases?\b/.test(q) ||
		/\bother cases?\b/.test(q) ||
		/\bwhere else\b/.test(q) ||
		/\bdoes this appear in\b/.test(q) ||
		/\bwhich cases?\b/.test(q) ||
		/\bmulti[- ]case\b/.test(q) ||
		/\bbetween cases?\b/.test(q) ||
		/\bany others?\b/.test(q) ||
		(/\brelated cases?\b/.test(q) && /\b(show|find|analy|compare|overlap)\b/.test(q)) ||
		(/\bcompare\b/.test(q) && /\bcases?\b/.test(q));

	const scopedIntelligenceSignals =
		/\bintelligence\b/.test(q) ||
		(/\bentity\b/.test(q) && /\bintelligence|analysis|across|trace\b/.test(q));

	// Terms like "overlap", "connections", or "patterns" are only cross-case
	// when paired with explicit multi-case language.
	const overlapStyleSignals =
		(/\boverlap\b/.test(q) || /\bconnections?\b/.test(q) || /\bpatterns?\b/.test(q)) &&
		(
			/\bcross[- ]case\b/.test(q) ||
			/\bacross\b/.test(q) ||
			/\bother cases?\b/.test(q) ||
			/\bbetween cases?\b/.test(q) ||
			/\bwhere else\b/.test(q) ||
			/\bany others?\b/.test(q)
		);

	return explicitCrossCaseSignals || scopedIntelligenceSignals || overlapStyleSignals;
}

export function detectThisCaseSignal(input: string): boolean {
	const q = String(input ?? '').toLowerCase().trim();
	if (!q) return false;
	return /\bthis case\b/.test(q) || /\bin this case\b/.test(q) || /\bhere\b/.test(q);
}

export function resolveIntelligenceHandoff(input: {
	prompt: string;
	caseId?: string | null;
}): string | null {
	const hasCrossCaseSignal = detectCrossCaseSignal(input.prompt);
	const hasThisCaseSignal = detectThisCaseSignal(input.prompt);
	if (!hasCrossCaseSignal) return null;
	const resolvedCaseId = String(input.caseId ?? '').trim();
	const handoff = resolvedCaseId
		? buildIntelligenceHandoffMessage(resolvedCaseId)
		: 'Cross-case analysis is available in the Intelligence tab: /case/<id>/intelligence';
	if (hasThisCaseSignal && hasCrossCaseSignal) {
		// Conservative boundary: mixed this-case + cross-case prompts route to Intelligence only.
		return handoff;
	}
	return handoff;
}

export function detectIntelligenceIntent(input: string): boolean {
	return detectCrossCaseSignal(input);
}
