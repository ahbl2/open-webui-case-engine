/**
 * Strip leading chronology stamps from timeline entry prose so UI meta lines own the datetime.
 * Shared by Cases browse rail and Overview activity/snapshot.
 */
export function stripLeadingDateTimePrefix(s: string): string {
	let t = s.trim();
	for (let i = 0; i < 4; i++) {
		const next = t
			.replace(/^At\s+\d{1,2}:\d{2}\s*(?:AM|PM)\s+/i, '')
			.replace(
				/^(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*\d{4}\s+at\s+\d{1,2}:\d{2}\s*(?:AM|PM)\s+/i,
				''
			)
			.replace(
				/^(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s*\d{4}\s+at\s+\d{1,2}:\d{2}\s*(?:AM|PM)\s+/i,
				''
			)
			.trim();
		if (next === t) break;
		t = next;
	}
	return t;
}
