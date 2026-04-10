/**
 * P67-06 — readable presentation helpers for Case Intelligence entity detail (read-only).
 */
import type { CaseIntelligenceAssociationKind, CaseIntelligenceAssertionLane } from '$lib/apis/caseEngine';

export function humanizeAttributeKey(key: string): string {
	const spaced = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
	return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatAttributeValueForProfile(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (Array.isArray(value)) {
		try {
			return value.map((v) => formatAttributeValueForProfile(v)).filter(Boolean).join(', ');
		} catch {
			return '';
		}
	}
	if (typeof value === 'object') {
		try {
			return JSON.stringify(value);
		} catch {
			return '';
		}
	}
	return String(value);
}

export function coreAttributesEntries(attrs: Record<string, unknown>): Array<{
	key: string;
	label: string;
	value: string;
}> {
	return Object.keys(attrs)
		.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
		.map((key) => ({
			key,
			label: humanizeAttributeKey(key),
			value: formatAttributeValueForProfile(attrs[key])
		}))
		.filter((e) => e.value.length > 0);
}

export function associationKindLabel(kind: CaseIntelligenceAssociationKind): string {
	switch (kind) {
		case 'KNOWS':
			return 'Knows';
		case 'ASSOCIATED_WITH':
			return 'Associated with';
		case 'OPERATES_VEHICLE':
			return 'Operates vehicle';
		default:
			return String(kind);
	}
}

export function assertionLaneLabel(lane: CaseIntelligenceAssertionLane): string {
	return lane === 'HYPOTHESIS' ? 'Hypothesis' : 'Settled';
}
