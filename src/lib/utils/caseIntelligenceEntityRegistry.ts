/**
 * P67-05 — client-side helpers for Case Intelligence entity registry sections.
 * List data comes from Case Engine `listCaseIntelligenceCommittedEntities`; attributes are best-effort.
 */
import type {
	CaseIntelligenceCommittedEntity,
	CaseIntelligenceEntityKind,
	CaseIntelligencePersonPosture
} from '$lib/apis/caseEngine';
import { formatCaseDateTime } from '$lib/utils/formatDateTime';

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

function isoTimestampLine(attrs: Record<string, unknown>, keys: string[], label: string): string | null {
	const iso = pickAttrString(attrs, keys);
	if (!iso) return null;
	return `${label}: ${formatCaseDateTime(iso)}`;
}

/** Mockup-style POI / role strip for person rows (best-effort from core_attributes). */
export function personRegistryRowDisplay(ent: CaseIntelligenceCommittedEntity): {
	showPoiBadge: boolean;
	roleLine: string | null;
	dobLine: string | null;
	demoLine: string | null;
} {
	const a = ent.core_attributes ?? {};
	const poiRaw = pickAttrString(a, ['person_of_interest', 'is_poi', 'poi']);
	const showPoiBadge =
		poiRaw === 'true' ||
		poiRaw === '1' ||
		poiRaw === 'yes' ||
		poiRaw?.toLowerCase() === 'person_of_interest';

	const roleCandidate =
		pickAttrString(a, ['role', 'capacity', 'involvement_role', 'registry_role']) ??
		personPostureShort(ent.person_identity_posture);
	const roleLine = showPoiBadge ? null : roleCandidate;

	const dob = pickAttrString(a, ['dob', 'date_of_birth', 'dateOfBirth', 'birth_date']);
	const age = pickAttrString(a, ['age']);
	const dobLine =
		dob && age ? `DOB: ${dob} (${age})` : dob ? `DOB: ${dob}` : null;

	const gender = pickAttrString(a, ['gender', 'sex']);
	const race = pickAttrString(a, ['race', 'ethnicity']);
	const demoLine =
		gender && race ? `${gender} · ${race}` : gender ?? race ?? null;

	return { showPoiBadge, roleLine: roleLine ?? null, dobLine, demoLine };
}

export function vehicleRegistryRowDisplay(ent: CaseIntelligenceCommittedEntity): {
	plateLine: string | null;
	lastSeenLine: string | null;
	locationLine: string | null;
} {
	const a = ent.core_attributes ?? {};
	const plate = pickAttrString(a, ['plate', 'license_plate', 'registration']);
	const state = pickAttrString(a, ['plate_state', 'state', 'registration_state']);
	const plateLine =
		plate && state ? `Plate: ${plate} (${state})` : plate ? `Plate: ${plate}` : null;
	const lastSeenLine = isoTimestampLine(
		a,
		['last_seen_at', 'last_seen', 'sighting_at'],
		'Last seen'
	);
	const locationLine = pickAttrString(a, ['last_seen_location', 'last_location', 'location_label']);
	return { plateLine, lastSeenLine, locationLine };
}

export function locationRegistryRowDisplay(ent: CaseIntelligenceCommittedEntity): {
	cityLine: string | null;
	roleLabel: string | null;
	lastSeenLine: string | null;
} {
	const a = ent.core_attributes ?? {};
	const city = pickAttrString(a, ['city', 'locality']);
	const region = pickAttrString(a, ['state', 'region', 'province']);
	const zip = pickAttrString(a, ['zip', 'postal_code', 'postal']);
	const cityLine =
		city && region && zip
			? `${city}, ${region} ${zip}`
			: city && region
				? `${city}, ${region}`
				: city ?? region ?? zip ?? null;
	const roleLabel = pickAttrString(a, ['location_role', 'role', 'label', 'kind']);
	const lastSeenLine = isoTimestampLine(
		a,
		['last_seen_at', 'last_seen', 'observed_at'],
		'Last seen'
	);
	return { cityLine, roleLabel, lastSeenLine };
}

export function phoneRegistryRowDisplay(ent: CaseIntelligenceCommittedEntity): {
	ownerLine: string | null;
	lastPingLine: string | null;
} {
	const a = ent.core_attributes ?? {};
	const ownerLine = pickAttrString(a, [
		'owner_name',
		'owner',
		'subscriber_name',
		'linked_person_name',
		'name'
	]);
	const lastPingLine = isoTimestampLine(
		a,
		['last_ping_at', 'last_ping', 'last_seen_at', 'last_seen'],
		'Last ping'
	);
	return { ownerLine, lastPingLine };
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
