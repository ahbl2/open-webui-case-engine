/**
 * P109-05 — Shared formatting for evidence set saved timestamps (list + detail).
 */
export function formatEvidenceSetSavedAt(iso: string): string {
	try {
		const d = new Date(iso);
		if (Number.isNaN(d.getTime())) return iso;
		return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	} catch {
		return iso;
	}
}
