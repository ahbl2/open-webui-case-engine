/**
 * P39-06 — Timeline composer deterministic cleanup.
 *
 * Client-side port of the rules from DetectiveCaseEngine/src/services/safeSurfaceCleanup.ts.
 * No LLM or network call — all transforms are rule-based and bounded.
 *
 * Rules applied (in order):
 *   1. Normalize line endings (CRLF/CR → LF)
 *   2. Normalize Unicode typography (curly quotes, smart ellipsis, em/en dash → ASCII)
 *   3. Remove trailing whitespace from each line
 *   4. Collapse multiple spaces/tabs within a line to one space
 *      (also normalizes Unicode space separators, e.g. NBSP, to ASCII space first)
 *   5. Capitalize standalone lowercase 'i' → 'I' (word boundaries only)
 *   6. Correct common whole-word spelling mistakes (small, well-governed typo map)
 *   7. Capitalize sentence starts: first character of text + first letter after '. '/'! '/'? '
 *   8. Strip trailing whitespace/newlines at end of text
 *
 * Typo map governance (keep small — do not expand casually):
 *   Only unambiguous editorial misspellings. No slang, abbreviations, or role-specific
 *   shorthand. Never "fix" tokens that could be names, codes, or copy-pasted identifiers.
 */

export type TimelineCleanupResult = {
	/** Text after all cleanup rules have been applied. */
	cleanedText: string;
	/** Human-readable summary of each type of change made. Empty when no changes. */
	changesSummary: string[];
	/** True when `cleanedText` differs from the input. */
	changed: boolean;
};

/**
 * Whole-word typo fixes only. Keys sorted longest-first at runtime.
 * Mirror of the backend safeSurfaceCleanup typo map — keep in sync when entries are added there.
 */
const WORD_TYPOS: Record<string, string> = {
	definately: 'definitely',
	occured: 'occurred',
	occurence: 'occurrence',
	recieve: 'receive',
	recieved: 'received',
	seperate: 'separate',
	alledged: 'alleged',
	neccessary: 'necessary',
	publically: 'publicly',
	wich: 'which',
	taht: 'that',
	adn: 'and',
	teh: 'the'
};

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyTypoCase(sourceWord: string, correctedLower: string): string {
	if (sourceWord.length === 0) return correctedLower;
	if (sourceWord === sourceWord.toUpperCase()) return correctedLower.toUpperCase();
	if (
		sourceWord[0] === sourceWord[0].toUpperCase() &&
		sourceWord[0] !== sourceWord[0].toLowerCase()
	) {
		return correctedLower[0].toUpperCase() + correctedLower.slice(1);
	}
	return correctedLower;
}

function normalizeLineEndings(s: string, summary: string[]): string {
	if (/\r\n/.test(s) || /\r/.test(s)) {
		summary.push('Normalized line endings (CRLF/CR → LF).');
		return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	}
	return s;
}

function normalizeUnicodeTypography(s: string, summary: string[]): string {
	const before = s;
	s = s.replace(/[\u2018\u2019]/g, "'");
	s = s.replace(/[\u201c\u201d]/g, '"');
	s = s.replace(/\u2026/g, '...');
	s = s.replace(/[\u2013\u2014]/g, '-');
	if (s !== before) {
		summary.push('Normalized curly quotes, ellipsis, or dash characters to ASCII equivalents.');
	}
	return s;
}

function trimTrailingWhitespacePerLine(s: string, summary: string[]): string {
	const lines = s.split('\n');
	let changed = false;
	const out = lines.map((line) => {
		const t = line.replace(/[ \t]+$/g, '');
		if (t !== line) changed = true;
		return t;
	});
	if (changed) summary.push('Removed trailing spaces or tabs at ends of lines.');
	return out.join('\n');
}

function collapseInternalSpacesPerLine(s: string, summary: string[]): string {
	const lines = s.split('\n');
	let changed = false;
	const out = lines.map((line) => {
		// Normalize Unicode space separators (e.g. NBSP) to ASCII space before collapsing.
		let t = line.replace(/\p{Zs}+/gu, ' ');
		t = t.replace(/[ \t]{2,}/g, ' ');
		if (t !== line) changed = true;
		return t;
	});
	if (changed) summary.push('Collapsed repeated spaces or tabs within lines.');
	return out.join('\n');
}

function fixStandaloneI(s: string, summary: string[]): string {
	const replaced = s.replace(/\bi\b/g, (m) => (m === 'i' ? 'I' : m));
	if (replaced !== s) summary.push("Capitalized standalone 'i' to 'I'.");
	return replaced;
}

function applyWordTypos(s: string, summary: string[]): string {
	const before = s;
	const keys = Object.keys(WORD_TYPOS).sort((a, b) => b.length - a.length);
	for (const wrong of keys) {
		const right = WORD_TYPOS[wrong];
		const re = new RegExp(`\\b${escapeRegExp(wrong)}\\b`, 'gi');
		s = s.replace(re, (matched) => applyTypoCase(matched, right));
	}
	if (s !== before) summary.push('Corrected common spelling mistakes (word-boundary typos only).');
	return s;
}

/**
 * Capitalize sentence starts:
 *   - First character of the entire text, if it is a lowercase letter.
 *   - First letter immediately after '. ', '! ', or '? ' (sentence-ending
 *     punctuation followed by one or more spaces), if that letter is lowercase.
 *
 * This is deterministic and bounded: it only changes the case of letters at
 * sentence boundaries. It does not alter spelling, wording, or meaning.
 * Edge cases (abbreviations like "e.g. x") are accepted as a tolerable
 * false positive for a detective field tool — consistent with the typo map
 * governance principle of "prefer fewer rules over risky automation."
 */
function capitalizeAfterSentenceEnd(s: string, summary: string[]): string {
	const before = s;
	// Capitalize the very first letter of the text.
	s = s.replace(/^([a-z])/, (m) => m.toUpperCase());
	// Capitalize the first letter after sentence-ending punctuation + whitespace.
	s = s.replace(/([.!?])\s+([a-z])/g, (_, punct, letter) => `${punct} ${letter.toUpperCase()}`);
	if (s !== before) {
		summary.push('Capitalized sentence starts (beginning of text and/or after sentence-ending punctuation).');
	}
	return s;
}

function stripTrailingWhitespaceAndNewlines(s: string, summary: string[]): string {
	const out = s.replace(/[\s]+$/g, '');
	if (out !== s) summary.push('Trimmed trailing whitespace or newlines at end of text.');
	return out;
}

/**
 * Apply deterministic, rule-based cleanup to Timeline composer text.
 * Never consults an LLM or network service.
 *
 * @returns `{ cleanedText, changesSummary, changed }` — safe to apply directly to
 *   `composerDraft.text_original`; `changed` tells the UI whether to report changes.
 */
export function applyTimelineComposerCleanup(rawText: string): TimelineCleanupResult {
	if (!rawText) return { cleanedText: rawText, changesSummary: [], changed: false };

	const summary: string[] = [];
	let s = rawText;

	s = normalizeLineEndings(s, summary);
	s = normalizeUnicodeTypography(s, summary);
	s = trimTrailingWhitespacePerLine(s, summary);
	s = collapseInternalSpacesPerLine(s, summary);
	s = fixStandaloneI(s, summary);
	s = applyWordTypos(s, summary);
	s = capitalizeAfterSentenceEnd(s, summary);
	s = stripTrailingWhitespaceAndNewlines(s, summary);

	return { cleanedText: s, changesSummary: summary, changed: s !== rawText };
}
