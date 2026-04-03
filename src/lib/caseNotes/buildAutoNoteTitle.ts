/**
 * Deterministic auto-title for notebook notes when the investigator leaves the title blank.
 * Uses only string rules — no AI, no external facts.
 */

const MAX_TITLE_LEN = 60;

/** Base tokens dropped when scoring “meaningful” words in fallback. */
const STOP = new Set([
	'a',
	'an',
	'the',
	'for',
	'and',
	'or',
	'but',
	'if',
	'as',
	'at',
	'by',
	'to',
	'of',
	'in',
	'is',
	'was',
	'were',
	'been',
	'have',
	'has',
	'had',
	'this',
	'that',
	'these',
	'those',
	'it',
	'we',
	'i',
	'you',
	'he',
	'she',
	'they',
	'my',
	'our',
	'your',
	'its',
	'with',
	'from',
	'into',
	'onto',
	'upon',
	'about',
	'out',
	'up',
	'down',
	'again',
	'few',
	'lots',
	'weeks',
	'days',
	'some',
	'any',
	'all',
	'not',
	'no',
	'so',
	'very',
	'just',
	'only',
	'also',
	'there',
	'here',
	'then',
	'than',
	'on'
]);

/**
 * Extra weak / filler tokens removed from title output and fallback (lowercase).
 * Includes shorthand and time-adjacent filler per product rules.
 */
const TITLE_STOPWORDS = new Set([
	...STOP,
	'little',
	'wks',
	'now',
	'after',
	'over',
	'maybe',
	'been',
	'this',
	'that',
	'two',
	'2'
]);

/** Signals “activity” when a location anchor is present (substring match, case-insensitive). */
const ACTIVITY_HINT =
	/\b(active|activity|patrol|witness|witnesses|saw|seen|reported|report|incident|vehicle|vehicles|stopped|stopping|leaving|left|entered|enter|worked|working|watching|happening|occurred|responded|response|in\/out|lots)\b/i;

function truncate(s: string, max = MAX_TITLE_LEN): string {
	const t = s.trim().replace(/\s+/g, ' ');
	if (!t) return 'Untitled Note';
	if (t.length <= max) return t;
	return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function capFirst(s: string): string {
	const t = s.trim();
	return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '';
}

/** Title-case phrase: first word capitalized; following words lower unless already multi-part proper noun (simple split). */
function formatLocationLabel(words: string[]): string {
	if (words.length === 0) return '';
	if (words.length === 1) return capFirst(words[0]);
	return `${capFirst(words[0])} ${words.slice(1).map((w) => w.toLowerCase()).join(' ')}`;
}

/** Road-style lines: title-case each token (Rd, St, …). */
function formatRoadLabel(chunk: string): string {
	return chunk
		.split(/\s+/)
		.filter(Boolean)
		.map((w) => capFirst(w))
		.join(' ');
}

function tokenKey(w: string): string {
	return w.replace(/[^a-z0-9']/gi, '').toLowerCase();
}

function isTitleStop(w: string): boolean {
	const k = tokenKey(w);
	return k.length === 0 || TITLE_STOPWORDS.has(k);
}

function meaningfulTokens(words: string[]): string[] {
	return words.filter((w) => !isTitleStop(w));
}

function firstContentLine(text: string): string {
	const lines = text.split('\n').map((l) => l.trim());
	for (const line of lines) {
		if (!line || /^-{3,}$/.test(line)) continue;
		return line.replace(/^#+\s*/, '').trim();
	}
	return '';
}

/** Remove duration / time noise so it cannot leak into composed titles. */
function stripTimeLikeFragments(s: string): string {
	return s
		.replace(/\b\d+\s*(weeks?|wks|days?|hrs?|hours?|mins?|minutes?)\b/gi, ' ')
		.replace(/\bover\s+time\b/gi, ' ')
		.replace(/\b\d+\b/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function hasComplaints(block: string): boolean {
	return /\bcomplaints?\b/i.test(block);
}

function hasActivitySignal(block: string): boolean {
	return ACTIVITY_HINT.test(block);
}

interface LocationAnchor {
	/** Display label, e.g. "Maple house", "House on Elm", "On Cedar" */
	label: string;
}

/** Extract a location anchor when obvious patterns exist (grounded in text). */
function extractLocationAnchor(block: string): LocationAnchor | null {
	// Street / road (keep existing behavior as strong anchor)
	const road =
		/\b([a-z]+(?:\s+[a-z]+)*\s+(?:rd|road|st|ave|dr|ln|blvd))\b/i.exec(block);
	if (road) {
		const chunk = road[1].trim();
		if (meaningfulTokens(chunk.split(/\s+/)).length >= 1) {
			return { label: formatRoadLabel(chunk) };
		}
	}

	// house | building | place | home + on + name
	const houseOn =
		/\b(house|building|place|home)\s+on\s+([a-z][a-z']*)\b/i.exec(block);
	if (houseOn && !isTitleStop(houseOn[2]) && houseOn[2].length >= 2) {
		const head = houseOn[1].toLowerCase();
		const name = capFirst(houseOn[2]);
		return { label: `${capFirst(head)} on ${name}` };
	}

	// "<name> house" e.g. maple house
	const nameHouse = /\b([a-z][a-z']{1,})\s+house\b/i.exec(block);
	if (nameHouse && !isTitleStop(nameHouse[1])) {
		return { label: `${capFirst(nameHouse[1])} house` };
	}

	// generic "on <place>" (not a stopword)
	const onPlace = /\bon\s+([a-z][a-z']{2,})\b/i.exec(block);
	if (onPlace && !isTitleStop(onPlace[1])) {
		return { label: `On ${capFirst(onPlace[1])}` };
	}

	const near = /\bnear\s+([^.,!?]{1,80})/i.exec(block);
	if (near) {
		const chunk = stripTimeLikeFragments(near[1])
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 4);
		const m = meaningfulTokens(chunk);
		if (m.length >= 1) {
			return { label: `Near ${formatLocationLabel(m)}` };
		}
	}

	return null;
}

function composeAnchorTitle(locationLabel: string, block: string): string {
	const c = hasComplaints(block);
	const a = hasActivitySignal(block);
	if (c && a) return `${locationLabel} activity and complaints`;
	if (c) return `${locationLabel} complaints`;
	// default + activity-only: suffix "activity"
	return `${locationLabel} activity`;
}

function fallbackTitle(block: string): string {
	const cleaned = stripTimeLikeFragments(block);
	const words = cleaned
		.replace(/[^\w\s'-]/g, ' ')
		.split(/\s+/)
		.filter(Boolean);
	const filtered = meaningfulTokens(words);
	if (filtered.length === 0) {
		const slice = words.filter((w) => !isTitleStop(w)).slice(0, 6);
		if (slice.length === 0) return 'Untitled Note';
		return truncate(formatLocationLabel(slice));
	}
	const n = Math.min(6, Math.max(3, filtered.length));
	return truncate(formatLocationLabel(filtered.slice(0, n)));
}

/**
 * Build a short deterministic title from note body text (plain / markdown-ish).
 * Never invents content not grounded in the text.
 */
export function buildAutoNoteTitle(text: string): string {
	const raw = text.replace(/\r\n/g, '\n').trim();
	if (!raw) return 'Untitled Note';

	const block = firstContentLine(raw);
	if (!block) return 'Untitled Note';

	const anchor = extractLocationAnchor(block);
	if (anchor) {
		return truncate(composeAnchorTitle(anchor.label, block));
	}

	return fallbackTitle(block);
}
