/**
 * P68-FU5 / P68-FU7 / P68-FU8 / P68-FU9 — Direct-create `core_attributes`, label hints, normalization (P68-04).
 * FU7 contract: DetectiveCaseEngine `P68-FU6-normalized-direct-create-field-contract-design.md` §9 MVP.
 */
export const DROPDOWN_OTHER = '__OTHER__';

/** US states + DC for dropdowns; code is 2-letter. */
export const US_STATES: { code: string; name: string }[] = [
	{ code: 'AL', name: 'Alabama' },
	{ code: 'AK', name: 'Alaska' },
	{ code: 'AZ', name: 'Arizona' },
	{ code: 'AR', name: 'Arkansas' },
	{ code: 'CA', name: 'California' },
	{ code: 'CO', name: 'Colorado' },
	{ code: 'CT', name: 'Connecticut' },
	{ code: 'DE', name: 'Delaware' },
	{ code: 'DC', name: 'District of Columbia' },
	{ code: 'FL', name: 'Florida' },
	{ code: 'GA', name: 'Georgia' },
	{ code: 'HI', name: 'Hawaii' },
	{ code: 'ID', name: 'Idaho' },
	{ code: 'IL', name: 'Illinois' },
	{ code: 'IN', name: 'Indiana' },
	{ code: 'IA', name: 'Iowa' },
	{ code: 'KS', name: 'Kansas' },
	{ code: 'KY', name: 'Kentucky' },
	{ code: 'LA', name: 'Louisiana' },
	{ code: 'ME', name: 'Maine' },
	{ code: 'MD', name: 'Maryland' },
	{ code: 'MA', name: 'Massachusetts' },
	{ code: 'MI', name: 'Michigan' },
	{ code: 'MN', name: 'Minnesota' },
	{ code: 'MS', name: 'Mississippi' },
	{ code: 'MO', name: 'Missouri' },
	{ code: 'MT', name: 'Montana' },
	{ code: 'NE', name: 'Nebraska' },
	{ code: 'NV', name: 'Nevada' },
	{ code: 'NH', name: 'New Hampshire' },
	{ code: 'NJ', name: 'New Jersey' },
	{ code: 'NM', name: 'New Mexico' },
	{ code: 'NY', name: 'New York' },
	{ code: 'NC', name: 'North Carolina' },
	{ code: 'ND', name: 'North Dakota' },
	{ code: 'OH', name: 'Ohio' },
	{ code: 'OK', name: 'Oklahoma' },
	{ code: 'OR', name: 'Oregon' },
	{ code: 'PA', name: 'Pennsylvania' },
	{ code: 'RI', name: 'Rhode Island' },
	{ code: 'SC', name: 'South Carolina' },
	{ code: 'SD', name: 'South Dakota' },
	{ code: 'TN', name: 'Tennessee' },
	{ code: 'TX', name: 'Texas' },
	{ code: 'UT', name: 'Utah' },
	{ code: 'VT', name: 'Vermont' },
	{ code: 'VA', name: 'Virginia' },
	{ code: 'WA', name: 'Washington' },
	{ code: 'WV', name: 'West Virginia' },
	{ code: 'WI', name: 'Wisconsin' },
	{ code: 'WY', name: 'Wyoming' }
];

export const COUNTRY_US = 'US';
export const COUNTRY_OTHER = 'OTHER';

export type PersonAddressType = 'HOME' | 'WORK' | 'OTHER' | 'UNKNOWN';

export const PERSON_ADDRESS_TYPES: { value: PersonAddressType; label: string }[] = [
	{ value: 'HOME', label: 'Home' },
	{ value: 'WORK', label: 'Work' },
	{ value: 'OTHER', label: 'Other' },
	{ value: 'UNKNOWN', label: 'Unknown' }
];

/** P68-FU8: constrained PERSON ethnicity (display = stored value). */
export const PERSON_ETHNICITY_OPTIONS = [
	'White',
	'Black',
	'Hispanic',
	'Asian',
	'Native American'
] as const;

export type PersonEthnicityOption = (typeof PERSON_ETHNICITY_OPTIONS)[number];

/** P68-FU9: optional physical descriptor dropdowns (stored value = label). */
export const PERSON_HAIR_COLOR_OPTIONS = [
	'Black',
	'Brown',
	'Blonde',
	'Red',
	'Gray',
	'White',
	'Auburn',
	'Other'
] as const;

export const PERSON_EYE_COLOR_OPTIONS = [
	'Brown',
	'Blue',
	'Green',
	'Hazel',
	'Gray',
	'Black',
	'Other'
] as const;

/** Curated MVP lists — not exhaustive (FU6). */
export const VEHICLE_MAKE_OPTIONS: { value: string; label: string }[] = [
	{ value: 'Acura', label: 'Acura' },
	{ value: 'Audi', label: 'Audi' },
	{ value: 'BMW', label: 'BMW' },
	{ value: 'Buick', label: 'Buick' },
	{ value: 'Cadillac', label: 'Cadillac' },
	{ value: 'Chevrolet', label: 'Chevrolet' },
	{ value: 'Chrysler', label: 'Chrysler' },
	{ value: 'Dodge', label: 'Dodge' },
	{ value: 'Ford', label: 'Ford' },
	{ value: 'GMC', label: 'GMC' },
	{ value: 'Honda', label: 'Honda' },
	{ value: 'Hyundai', label: 'Hyundai' },
	{ value: 'Jeep', label: 'Jeep' },
	{ value: 'Kia', label: 'Kia' },
	{ value: 'Lexus', label: 'Lexus' },
	{ value: 'Mazda', label: 'Mazda' },
	{ value: 'Mercedes-Benz', label: 'Mercedes-Benz' },
	{ value: 'Nissan', label: 'Nissan' },
	{ value: 'Ram', label: 'Ram' },
	{ value: 'Subaru', label: 'Subaru' },
	{ value: 'Tesla', label: 'Tesla' },
	{ value: 'Toyota', label: 'Toyota' },
	{ value: 'Volkswagen', label: 'Volkswagen' },
	{ value: 'Volvo', label: 'Volvo' },
	{ value: DROPDOWN_OTHER, label: 'Other…' }
];

export const VEHICLE_COLOR_OPTIONS: { value: string; label: string }[] = [
	{ value: 'Black', label: 'Black' },
	{ value: 'White', label: 'White' },
	{ value: 'Silver', label: 'Silver' },
	{ value: 'Gray', label: 'Gray' },
	{ value: 'Red', label: 'Red' },
	{ value: 'Blue', label: 'Blue' },
	{ value: 'Green', label: 'Green' },
	{ value: 'Yellow', label: 'Yellow' },
	{ value: 'Orange', label: 'Orange' },
	{ value: 'Brown', label: 'Brown' },
	{ value: 'Gold', label: 'Gold' },
	{ value: 'Beige', label: 'Beige' },
	{ value: DROPDOWN_OTHER, label: 'Other…' }
];

/** Strip decorative chars; keep leading + and digits. */
export function normalizePhoneForStorage(raw: string): string {
	const t = raw.trim();
	if (!t) return '';
	let s = t.replace(/[^\d+]/g, '');
	if (s.startsWith('+')) {
		return '+' + s.slice(1).replace(/\D/g, '');
	}
	return s.replace(/\D/g, '');
}

/**
 * P68-FU8 / P68-FU9: US person direct-create phones — digits only, max **10** (hard-stop via slice);
 * strip leading country `1` when 11+ digits; strip all non-digits first (paste-safe).
 */
export function usPersonPhoneDigitsFromInput(raw: string): string {
	let d = raw.replace(/\D/g, '');
	if (d.startsWith('1') && d.length >= 11) d = d.slice(1);
	return d.slice(0, 10);
}

/**
 * P68-FU8: live `(###) ###-####` mask from digit string (0–10 chars).
 * 1–3: area code only; 4–6: `(###) ###`; 7–10: full US block.
 */
export function formatUsPersonPhoneMask(digits: string): string {
	const d = usPersonPhoneDigitsFromInput(digits);
	const n = d.length;
	if (n === 0) return '';
	if (n <= 3) return d;
	if (n <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
	return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Map masked or raw PERSON phone fields into `core_attributes` (partial digits allowed). */
export function normalizeUsPersonPhoneForStorage(raw: string): string {
	return usPersonPhoneDigitsFromInput(raw);
}

function parseOptionalUintClamped(raw: string, max: number): number | null {
	const t = raw.trim();
	if (t === '') return null;
	const n = parseInt(t, 10);
	if (!Number.isFinite(n) || n < 0) return null;
	return Math.min(n, max);
}

/** P68-FU9: optional height feet (0–9) for `core_attributes.height_feet`. */
export function normalizePersonHeightFeetForStorage(raw: string): number | null {
	return parseOptionalUintClamped(raw, 9);
}

/** P68-FU9: optional height inches (0–11) for `core_attributes.height_inches`. */
export function normalizePersonHeightInchesForStorage(raw: string): number | null {
	return parseOptionalUintClamped(raw, 11);
}

/** P68-FU9: optional weight in pounds (positive integer) for `core_attributes.weight`. */
export function normalizePersonWeightPoundsForStorage(raw: string): number | null {
	const t = raw.trim().replace(/[^\d.]/g, '');
	if (t === '') return null;
	const n = parseFloat(t);
	if (!Number.isFinite(n) || n <= 0) return null;
	return Math.min(Math.round(n), 9999);
}

export function normalizePlateForStorage(raw: string): string {
	return raw.trim().toUpperCase();
}

export function normalizeVinForStorage(raw: string): string {
	return raw.replace(/\s/g, '').toUpperCase();
}

/** `select` is state code, `DROPDOWN_OTHER`, or ''. */
export function resolveUsStateValue(select: string, otherText: string): string {
	if (select === DROPDOWN_OTHER) return otherText.trim();
	return select.trim().toUpperCase();
}

export function resolveCountryFields(
	countrySelect: string,
	countryOther: string
): { country: string; country_detail?: string } {
	if (countrySelect === COUNTRY_OTHER) {
		const d = countryOther.trim();
		return { country: COUNTRY_OTHER, ...(d ? { country_detail: d } : {}) };
	}
	return { country: COUNTRY_US };
}

export function suggestPersonDisplayLabel(f: {
	first_name: string;
	middle_name: string;
	last_name: string;
}): string | null {
	const fn = f.first_name.trim();
	const mn = f.middle_name.trim();
	const ln = f.last_name.trim();
	if (!fn && !ln) return null;
	if (ln && fn) {
		return mn ? `${ln}, ${fn} ${mn}` : `${ln}, ${fn}`;
	}
	if (ln) return mn ? `${ln} ${mn}`.trim() : ln;
	return fn;
}

export function buildPersonCoreAttributes(args: {
	first_name: string;
	middle_name: string;
	last_name: string;
	aliases: string;
	primary_phone: string;
	additional_phones: string[];
	address_line: string;
	unit: string;
	city: string;
	stateResolved: string;
	countrySelect: string;
	countryOther: string;
	address_type: PersonAddressType;
	dob_iso: string;
	dob_approx: string;
	notes: string;
	ethnicity: string;
	height_feet: string;
	height_inches: string;
	weight: string;
	hair_color: string;
	eye_color: string;
}): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	const fn = args.first_name.trim();
	const mn = args.middle_name.trim();
	const ln = args.last_name.trim();
	if (fn) out.first_name = fn;
	if (mn) out.middle_name = mn;
	if (ln) out.last_name = ln;
	const al = args.aliases.trim();
	if (al) out.aliases = al;
	const eth = args.ethnicity.trim();
	if (eth && (PERSON_ETHNICITY_OPTIONS as readonly string[]).includes(eth)) {
		out.ethnicity = eth;
	}
	const pp = normalizeUsPersonPhoneForStorage(args.primary_phone);
	if (pp) out.primary_phone = pp;
	const extras = args.additional_phones.map((p) => normalizeUsPersonPhoneForStorage(p)).filter(Boolean);
	if (extras.length) out.additional_phones = extras;
	const line = args.address_line.trim();
	if (line) out.address_line = line;
	const unit = args.unit.trim();
	if (unit) out.unit = unit;
	const city = args.city.trim();
	if (city) out.city = city;
	const st = args.stateResolved.trim();
	if (st) out.state = st;
	const cf = resolveCountryFields(args.countrySelect, args.countryOther);
	out.country = cf.country;
	if (cf.country_detail) out.country_detail = cf.country_detail;
	out.address_type = args.address_type;
	const dob = args.dob_iso.trim();
	if (dob) out.dob = dob;
	const dapprox = args.dob_approx.trim();
	if (dapprox) out.dob_approx = dapprox;
	const hf = normalizePersonHeightFeetForStorage(args.height_feet);
	if (hf !== null) out.height_feet = hf;
	const hi = normalizePersonHeightInchesForStorage(args.height_inches);
	if (hi !== null) out.height_inches = hi;
	const wt = normalizePersonWeightPoundsForStorage(args.weight);
	if (wt !== null) out.weight = wt;
	const hair = args.hair_color.trim();
	if (hair && (PERSON_HAIR_COLOR_OPTIONS as readonly string[]).includes(hair)) {
		out.hair_color = hair;
	}
	const eye = args.eye_color.trim();
	if (eye && (PERSON_EYE_COLOR_OPTIONS as readonly string[]).includes(eye)) {
		out.eye_color = eye;
	}
	const notes = args.notes.trim();
	if (notes) out.notes = notes;
	return out;
}

export function resolveVehicleMake(makeSelect: string, makeOther: string): string {
	if (makeSelect === DROPDOWN_OTHER) return makeOther.trim();
	return makeSelect.trim();
}

export function resolveVehicleColor(colorSelect: string, colorOther: string): string {
	if (colorSelect === DROPDOWN_OTHER) return colorOther.trim();
	return colorSelect.trim();
}

export function buildVehicleCoreAttributes(args: {
	plate: string;
	plate_state_resolved: string;
	vin: string;
	make_resolved: string;
	model: string;
	color_resolved: string;
	year: string;
	notes: string;
}): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	const plate = normalizePlateForStorage(args.plate);
	if (plate) out.plate = plate;
	const ps = args.plate_state_resolved.trim().toUpperCase();
	if (ps) out.plate_state = ps;
	const vin = normalizeVinForStorage(args.vin);
	if (vin) out.vin = vin;
	const mk = args.make_resolved;
	if (mk) out.make = mk;
	const md = args.model.trim();
	if (md) out.model = md;
	const cl = args.color_resolved;
	if (cl) out.color = cl;
	const yr = args.year.trim();
	if (yr) out.year = yr;
	const notes = args.notes.trim();
	if (notes) out.notes = notes;
	return out;
}

export function buildLocationCoreAttributes(args: {
	place_name: string;
	address_line: string;
	unit: string;
	city: string;
	stateResolved: string;
	countrySelect: string;
	countryOther: string;
	notes: string;
}): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	const pn = args.place_name.trim();
	if (pn) out.place_name = pn;
	out.address_line = args.address_line.trim();
	const unit = args.unit.trim();
	if (unit) out.unit = unit;
	out.city = args.city.trim();
	out.state = args.stateResolved.trim();
	const cf = resolveCountryFields(args.countrySelect, args.countryOther);
	out.country = cf.country;
	if (cf.country_detail) out.country_detail = cf.country_detail;
	const notes = args.notes.trim();
	if (notes) out.notes = notes;
	return out;
}

/** VEHICLE label hint — uses resolved plate state text (2-letter or other). */
export function suggestVehicleDisplayLabel(f: {
	plate: string;
	plate_state: string;
	year: string;
	make: string;
	model: string;
}): string | null {
	const plate = normalizePlateForStorage(f.plate);
	const st = f.plate_state.trim().toUpperCase();
	const year = f.year.trim();
	const make = f.make.trim();
	const model = f.model.trim();
	const bits: string[] = [];
	if (st && plate) bits.push(`${st} ${plate}`);
	else if (plate) bits.push(plate);
	const ymm = [year, make, model].filter(Boolean).join(' ').trim();
	if (ymm) bits.push(ymm);
	if (bits.length === 0) return null;
	return bits.join(' · ');
}

export function suggestLocationDisplayLabel(f: {
	place_name: string;
	address_line: string;
	unit: string;
	city: string;
	state: string;
}): string | null {
	const place = f.place_name.trim();
	const unit = f.unit.trim();
	const addr = f.address_line.trim();
	const city = f.city.trim();
	const state = f.state.trim();
	const addrWithUnit = addr && unit ? `${addr} #${unit}` : addr;
	if (place && city) {
		return state ? `${place} — ${city}, ${state}` : `${place} — ${city}`;
	}
	if (addrWithUnit && city && state) return `${addrWithUnit}, ${city}, ${state}`;
	if (city && state && !addrWithUnit) return `${city}, ${state}`;
	if (addrWithUnit) return addrWithUnit;
	if (place) return place;
	return null;
}

export function mergeCoreAttributesStructuredWins(
	advanced: Record<string, unknown>,
	structured: Record<string, unknown>
): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...advanced };
	for (const [k, v] of Object.entries(structured)) {
		merged[k] = v;
	}
	return merged;
}

export function pruneEmptyCoreValues(obj: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) {
		if (v === '' || v === undefined || v === null) continue;
		if (Array.isArray(v) && v.length === 0) continue;
		out[k] = v;
	}
	return out;
}

export function parseAdvancedCoreAttributesJson(
	raw: string
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
	const t = raw.trim();
	if (t === '') return { ok: true, value: {} };
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			return { ok: false, error: 'Advanced JSON must be a single object (e.g. {}).' };
		}
		return { ok: true, value: parsed as Record<string, unknown> };
	} catch {
		return { ok: false, error: 'Advanced JSON must be valid JSON.' };
	}
}

export function assembleCoreAttributesForSubmit(args: {
	structured: Record<string, unknown>;
	advancedJson: string;
}): { ok: true; core: Record<string, unknown> } | { ok: false; error: string } {
	const parsed = parseAdvancedCoreAttributesJson(args.advancedJson);
	if (!parsed.ok) return parsed;
	const merged = mergeCoreAttributesStructuredWins(parsed.value, args.structured);
	return { ok: true, core: pruneEmptyCoreValues(merged) };
}

/** @deprecated FU5 string-only builders removed — use buildPersonCoreAttributes / build* family. */
export function pickNonEmptyStringFields(entries: Record<string, string>): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(entries)) {
		const t = v.trim();
		if (t !== '') out[k] = t;
	}
	return out;
}
