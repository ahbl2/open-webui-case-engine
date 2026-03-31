/**
 * P33 — Hard rejects for assistant voice, placeholders, speculative insertions, and obvious new entities
 * in Notes Enhance output. Keep in sync with DetectiveCaseEngine `src/services/noteEnhanceOutputGuardrails.ts`.
 */

const ASSISTANT_VOICE_SUBSTRINGS = [
	"i'd be happy",
	'i would be happy',
	'please provide',
	'i apologize',
	'let me know',
	'i can help',
	"i'm here to help"
] as const;

const SPECULATIVE_PATTERNS: readonly RegExp[] = [
	/\bunknown\b/i,
	/\bmay\s+indicate\b/i,
	/\bcould\s+suggest\b/i,
	/\blikely\b/i,
	/\bpossibly\b/i,
	/\bappears\s+to\s+be\b/i
];

const ENHANCED_CAPITALIZED_TOKEN = /\b[A-Z][a-z]{9,}\b/g;

const ENHANCE_ENTITY_ALLOWLIST = new Set(
	[
		'additionally',
		'approximately',
		'approached',
		'confidential',
		'constable',
		'controlled',
		'department',
		'detective',
		'exchange',
		'informant',
		'inspection',
		'inspector',
		'investigator',
		'lieutenant',
		'maintained',
		'management',
		'observation',
		'observed',
		'officer',
		'parked',
		'performed',
		'person',
		'sergeant',
		'subject',
		'superintendent',
		'surveillance',
		'vehicle',
		'witness'
	].map((w) => w.toLowerCase())
);

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wordAppearsInOriginalInsensitive(originalLower: string, wordLower: string): boolean {
	return new RegExp(`\\b${escapeRegExp(wordLower)}\\b`, 'i').test(originalLower);
}

export function validateEnhanceOutputDisallowedPatterns(
	enhancedText: string,
	originalText: string
): string | null {
	const enh = enhancedText;
	const enhLower = enh.toLowerCase();
	const origLower = originalText.toLowerCase();

	for (const sub of ASSISTANT_VOICE_SUBSTRINGS) {
		if (enhLower.includes(sub)) {
			return 'enhance:assistant_voice_detected';
		}
	}

	if (/\[[^\]]+\]/.test(enh)) {
		return 'enhance:placeholder_detected';
	}

	for (const re of SPECULATIVE_PATTERNS) {
		re.lastIndex = 0;
		if (re.test(enh) && !re.test(originalText)) {
			return 'enhance:speculative_language_added';
		}
	}

	for (const m of enh.matchAll(ENHANCED_CAPITALIZED_TOKEN)) {
		const w = m[0];
		const lw = w.toLowerCase();
		if (ENHANCE_ENTITY_ALLOWLIST.has(lw)) continue;
		if (!wordAppearsInOriginalInsensitive(origLower, lw)) {
			return 'enhance:new_entity_detected';
		}
	}

	return null;
}
