/**
 * P67-05 — client-side helpers for Case Intelligence entity registry sections.
 * List data comes from Case Engine `listCaseIntelligenceCommittedEntities`; attributes are best-effort.
 */
import type {
	CaseIntelligenceCommittedEntity,
	CaseIntelligenceEntityKind,
	CaseIntelligencePersonPosture
} from '$lib/apis/caseEngine';

export type RegistrySortKey = 'name_asc' | 'created_desc';

export function pickAttrString(attrs: Record<string, unknown>, keys: string[]): string | null {
	for (const k of keys) {
		const v = attrs[k];
		if (v === undefined || v === null) continue;
		const s = String(v).trim();
		if (s) return s;
	}
	return null;
}

export function personPostureShort(p: CaseIntelligencePersonPosture | null): string | null {
	if (!p) return null;
	switch (p) {
		case 'IDENTIFIED':
			return 'Identified';
		case 'UNKNOWN_PARTIAL':
			return 'Unknown (partial)';
		case 'UNKNOWN_PLACEHOLDER':
			return 'Unknown (placeholder)';
		default:
			return String(p);
	}
}

/** Single-line summary under display_label per P67-02 (omit parts with no data). */
export function buildRegistrySecondaryLine(
	kind: CaseIntelligenceEntityKind,
	ent: CaseIntelligenceCommittedEntity
): string | null {
	const a = ent.core_attributes ?? {};
	const parts: string[] = [];

	if (kind === 'PERSON') {
		const posture = personPostureShort(ent.person_identity_posture);
		if (posture) parts.push(posture);
		const dob = pickAttrString(a, ['dob', 'date_of_birth', 'dateOfBirth', 'birth_date']);
		if (dob) parts.push(`DOB: ${dob}`);
		const role = pickAttrString(a, ['role', 'roles', 'capacity']);
		if (role) parts.push(role);
	} else if (kind === 'VEHICLE') {
		const plate = pickAttrString(a, ['plate', 'license_plate', 'registration']);
		const state = pickAttrString(a, ['plate_state', 'state', 'registration_state']);
		const plateLine =
			plate && state ? `${plate} (${state})` : plate ?? (state ? `Plate state: ${state}` : null);
		if (plateLine) parts.push(plateLine);
		const make = pickAttrString(a, ['make', 'manufacturer']);
		const model = pickAttrString(a, ['model']);
		const mm = make && model ? `${make} ${model}` : make ?? model;
		if (mm) parts.push(mm);
		const color = pickAttrString(a, ['color', 'colour']);
		if (color) parts.push(color);
		const year = pickAttrString(a, ['year', 'model_year']);
		if (year) parts.push(year);
		const vin = pickAttrString(a, ['vin', 'VIN']);
		if (vin) parts.push(vin.length > 12 ? `${vin.slice(0, 6)}…${vin.slice(-4)}` : vin);
	} else {
		const addr =
			pickAttrString(a, ['address', 'normalized_address', 'street', 'full_address']) ??
			pickAttrString(a, ['place_label', 'label', 'name']);
		if (addr) parts.push(addr);
		const city = pickAttrString(a, ['city', 'locality']);
		const region = pickAttrString(a, ['state', 'region', 'province']);
		const loc = city && region ? `${city}, ${region}` : city ?? region;
		if (loc) parts.push(loc);
		const lat = pickAttrString(a, ['lat', 'latitude']);
		const lng = pickAttrString(a, ['lng', 'lon', 'longitude']);
		if (lat && lng) parts.push(`≈ ${lat}, ${lng}`);
	}

	const line = parts.filter(Boolean).join(' · ');
	return line.length > 0 ? line : null;
}

export function entityPortraitUrl(attrs: Record<string, unknown>): string | null {
	const u = pickAttrString(attrs, ['photo_url', 'avatar_url', 'image_url', 'portrait_url']);
	if (!u) return null;
	try {
		const parsed = new URL(u);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
		return u;
	} catch {
		return null;
	}
}

export function initialsFromDisplayLabel(label: string): string {
	const t = label.trim();
	if (!t) return '?';
	const parts = t.split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
	}
	return t.slice(0, 2).toUpperCase();
}

export function committedEntityMatchesSearch(ent: CaseIntelligenceCommittedEntity, qRaw: string): boolean {
	const q = qRaw.trim().toLowerCase();
	if (!q) return true;
	const blob = [
		ent.display_label,
		ent.id,
		buildRegistrySecondaryLine(ent.entity_kind, ent) ?? '',
		JSON.stringify(ent.core_attributes ?? {})
	]
		.join(' ')
		.toLowerCase();
	return blob.includes(q);
}

function parseCreatedMs(iso: string): number {
	const n = Date.parse(iso);
	return Number.isFinite(n) ? n : 0;
}

export function sortCommittedEntities(
	rows: CaseIntelligenceCommittedEntity[],
	sortKey: RegistrySortKey
): CaseIntelligenceCommittedEntity[] {
	const copy = [...rows];
	if (sortKey === 'created_desc') {
		copy.sort((a, b) => {
			const d = parseCreatedMs(b.created_at) - parseCreatedMs(a.created_at);
			return d !== 0 ? d : a.display_label.localeCompare(b.display_label, undefined, { sensitivity: 'base' });
		});
	} else {
		copy.sort((a, b) => {
			const c = a.display_label.localeCompare(b.display_label, undefined, { sensitivity: 'base' });
			return c !== 0 ? c : parseCreatedMs(a.created_at) - parseCreatedMs(b.created_at);
		});
	}
	return copy;
}
