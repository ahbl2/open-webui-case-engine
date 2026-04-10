/**
 * P68-FU7 / P68-FU8 — direct-create payload assembly & normalization (P68-04 contract).
 */
import { describe, it, expect } from 'vitest';
import {
	assembleCoreAttributesForSubmit,
	buildLocationCoreAttributes,
	buildPersonCoreAttributes,
	buildVehicleCoreAttributes,
	COUNTRY_OTHER,
	COUNTRY_US,
	DROPDOWN_OTHER,
	formatUsPersonPhoneMask,
	mergeCoreAttributesStructuredWins,
	normalizePersonHeightFeetForStorage,
	normalizePersonHeightInchesForStorage,
	normalizePersonWeightPoundsForStorage,
	normalizePhoneForStorage,
	normalizeUsPersonPhoneForStorage,
	parseAdvancedCoreAttributesJson,
	pruneEmptyCoreValues,
	resolveCountryFields,
	resolveUsStateValue,
	resolveVehicleColor,
	resolveVehicleMake,
	suggestLocationDisplayLabel,
	suggestPersonDisplayLabel,
	suggestVehicleDisplayLabel,
	usPersonPhoneDigitsFromInput
} from './caseIntelligenceDirectCreatePayload';

describe('caseIntelligenceDirectCreatePayload (P68-FU8 US person phone mask)', () => {
	it('formatUsPersonPhoneMask formats progressively', () => {
		expect(formatUsPersonPhoneMask('')).toBe('');
		expect(formatUsPersonPhoneMask('5')).toBe('5');
		expect(formatUsPersonPhoneMask('555')).toBe('555');
		expect(formatUsPersonPhoneMask('5551')).toBe('(555) 1');
		expect(formatUsPersonPhoneMask('555123')).toBe('(555) 123');
		expect(formatUsPersonPhoneMask('5551234')).toBe('(555) 123-4');
		expect(formatUsPersonPhoneMask('5551234567')).toBe('(555) 123-4567');
	});

	it('usPersonPhoneDigitsFromInput strips non-digits and caps at 10', () => {
		expect(usPersonPhoneDigitsFromInput('abc')).toBe('');
		expect(usPersonPhoneDigitsFromInput('(555) abc-12')).toBe('55512');
		expect(usPersonPhoneDigitsFromInput('9998887777666555')).toBe('9998887777');
	});

	it('usPersonPhoneDigitsFromInput normalizes NANP paste with leading 1', () => {
		expect(usPersonPhoneDigitsFromInput('+1 (555) 123-4567')).toBe('5551234567');
		expect(usPersonPhoneDigitsFromInput('15551234567')).toBe('5551234567');
	});

	it('normalizeUsPersonPhoneForStorage matches digit extraction', () => {
		expect(normalizeUsPersonPhoneForStorage('(555) 111-2222')).toBe('5551112222');
	});

	it('buildPersonCoreAttributes maps ethnicity and still maps phones', () => {
		const core = buildPersonCoreAttributes({
			first_name: 'A',
			middle_name: '',
			last_name: 'B',
			aliases: '',
			primary_phone: '(555) 111-2222',
			additional_phones: ['5557777'],
			address_line: '',
			unit: '',
			city: '',
			stateResolved: '',
			countrySelect: COUNTRY_US,
			countryOther: '',
			address_type: 'HOME',
			dob_iso: '',
			dob_approx: '',
			ethnicity: 'Asian',
			height_feet: '',
			height_inches: '',
			weight: '',
			hair_color: '',
			eye_color: '',
			notes: ''
		});
		expect(core).toMatchObject({
			primary_phone: '5551112222',
			additional_phones: ['5557777'],
			ethnicity: 'Asian'
		});
	});

	it('buildPersonCoreAttributes omits invalid ethnicity string', () => {
		const core = buildPersonCoreAttributes({
			first_name: 'A',
			middle_name: '',
			last_name: '',
			aliases: '',
			primary_phone: '',
			additional_phones: [],
			address_line: '',
			unit: '',
			city: '',
			stateResolved: '',
			countrySelect: COUNTRY_US,
			countryOther: '',
			address_type: 'UNKNOWN',
			dob_iso: '',
			dob_approx: '',
			ethnicity: 'NotInList',
			height_feet: '',
			height_inches: '',
			weight: '',
			hair_color: '',
			eye_color: '',
			notes: ''
		});
		expect(core).not.toHaveProperty('ethnicity');
	});
});

describe('caseIntelligenceDirectCreatePayload (P68-FU9)', () => {
	it('usPersonPhoneDigitsFromInput hard-stops at 10 digits (extra typed/pasted digits dropped)', () => {
		expect(usPersonPhoneDigitsFromInput('555123456789999')).toBe('5551234567');
		expect(usPersonPhoneDigitsFromInput('++1 ((555)) ..123--4567 ext 999')).toBe('5551234567');
	});

	it('normalizePersonHeight / weight helpers', () => {
		expect(normalizePersonHeightFeetForStorage('')).toBe(null);
		expect(normalizePersonHeightFeetForStorage('6')).toBe(6);
		expect(normalizePersonHeightFeetForStorage('12')).toBe(9);
		expect(normalizePersonHeightInchesForStorage('15')).toBe(11);
		expect(normalizePersonWeightPoundsForStorage('')).toBe(null);
		expect(normalizePersonWeightPoundsForStorage('180')).toBe(180);
		expect(normalizePersonWeightPoundsForStorage('190.4 lbs')).toBe(190);
	});

	it('buildPersonCoreAttributes maps height_feet, height_inches, weight, hair_color, eye_color', () => {
		const core = buildPersonCoreAttributes({
			first_name: 'P',
			middle_name: '',
			last_name: 'Q',
			aliases: '',
			primary_phone: '',
			additional_phones: [],
			address_line: '',
			unit: '',
			city: '',
			stateResolved: '',
			countrySelect: COUNTRY_US,
			countryOther: '',
			address_type: 'UNKNOWN',
			dob_iso: '',
			dob_approx: '',
			ethnicity: '',
			height_feet: '5',
			height_inches: '10',
			weight: '175',
			hair_color: 'Brown',
			eye_color: 'Blue',
			notes: ''
		});
		expect(core).toMatchObject({
			first_name: 'P',
			last_name: 'Q',
			height_feet: 5,
			height_inches: 10,
			weight: 175,
			hair_color: 'Brown',
			eye_color: 'Blue'
		});
	});

	it('buildPersonCoreAttributes omits optional physical fields when empty', () => {
		const core = buildPersonCoreAttributes({
			first_name: 'P',
			middle_name: '',
			last_name: 'Q',
			aliases: '',
			primary_phone: '',
			additional_phones: [],
			address_line: '',
			unit: '',
			city: '',
			stateResolved: '',
			countrySelect: COUNTRY_US,
			countryOther: '',
			address_type: 'UNKNOWN',
			dob_iso: '',
			dob_approx: '',
			ethnicity: '',
			height_feet: '',
			height_inches: '',
			weight: '',
			hair_color: '',
			eye_color: '',
			notes: 'only notes'
		});
		expect(core).toMatchObject({ notes: 'only notes' });
		expect(core).not.toHaveProperty('height_feet');
		expect(core).not.toHaveProperty('weight');
		expect(core).not.toHaveProperty('hair_color');
	});
});

describe('caseIntelligenceDirectCreatePayload (P68-FU7)', () => {
	it('normalizePhoneForStorage strips non-digits except leading +', () => {
		expect(normalizePhoneForStorage('')).toBe('');
		expect(normalizePhoneForStorage('(555) 123-4567')).toBe('5551234567');
		expect(normalizePhoneForStorage('+1 555 123 4567')).toBe('+15551234567');
	});

	it('resolveUsStateValue maps code or OTHER text', () => {
		expect(resolveUsStateValue('ny', '')).toBe('NY');
		expect(resolveUsStateValue(DROPDOWN_OTHER, '  Ontario  ')).toBe('Ontario');
		expect(resolveUsStateValue('', '')).toBe('');
	});

	it('resolveCountryFields: US default vs OTHER detail', () => {
		expect(resolveCountryFields(COUNTRY_US, '')).toEqual({ country: COUNTRY_US });
		expect(resolveCountryFields(COUNTRY_OTHER, 'Canada')).toEqual({
			country: COUNTRY_OTHER,
			country_detail: 'Canada'
		});
	});

	it('resolveVehicleMake / resolveVehicleColor', () => {
		expect(resolveVehicleMake('Honda', '')).toBe('Honda');
		expect(resolveVehicleMake(DROPDOWN_OTHER, '  Kit  ')).toBe('Kit');
		expect(resolveVehicleColor(DROPDOWN_OTHER, 'Pearl')).toBe('Pearl');
	});

	it('suggestPersonDisplayLabel from name parts', () => {
		expect(
			suggestPersonDisplayLabel({ first_name: '', middle_name: '', last_name: '' })
		).toBe(null);
		expect(suggestPersonDisplayLabel({ first_name: 'Jane', middle_name: '', last_name: '' })).toBe('Jane');
		expect(
			suggestPersonDisplayLabel({ first_name: 'Jane', middle_name: 'Q', last_name: 'Doe' })
		).toBe('Doe, Jane Q');
	});

	it('suggestVehicleDisplayLabel uses plate+state and year/make/model', () => {
		expect(
			suggestVehicleDisplayLabel({
				plate: 'abc1234',
				plate_state: 'ny',
				year: '2019',
				make: 'Honda',
				model: 'Civic'
			})
		).toBe('NY ABC1234 · 2019 Honda Civic');
	});

	it('suggestVehicleDisplayLabel returns null when no useful fields', () => {
		expect(
			suggestVehicleDisplayLabel({
				plate: '',
				plate_state: '',
				year: '',
				make: '',
				model: ''
			})
		).toBe(null);
	});

	it('suggestLocationDisplayLabel prefers place + city + state', () => {
		expect(
			suggestLocationDisplayLabel({
				place_name: "Joe's Diner",
				address_line: '',
				unit: '',
				city: 'Albany',
				state: 'NY'
			})
		).toBe("Joe's Diner — Albany, NY");
	});

	it('suggestLocationDisplayLabel: address + unit + city + state', () => {
		expect(
			suggestLocationDisplayLabel({
				place_name: '',
				address_line: '100 Main St',
				unit: '2B',
				city: 'Albany',
				state: 'NY'
			})
		).toBe('100 Main St #2B, Albany, NY');
	});

	it('suggestLocationDisplayLabel falls back to address_line only', () => {
		expect(
			suggestLocationDisplayLabel({
				place_name: '',
				address_line: '100 Main St',
				unit: '',
				city: '',
				state: ''
			})
		).toBe('100 Main St');
	});

	it('buildPersonCoreAttributes maps phones, country, dob, omits noise', () => {
		const core = buildPersonCoreAttributes({
			first_name: 'A',
			middle_name: '',
			last_name: 'B',
			aliases: '',
			primary_phone: '(555) 111-2222',
			additional_phones: ['', ' 555-7777 '],
			address_line: '',
			unit: '',
			city: '',
			stateResolved: '',
			countrySelect: COUNTRY_US,
			countryOther: '',
			address_type: 'HOME',
			dob_iso: '1980-01-15',
			dob_approx: '',
			ethnicity: '',
			height_feet: '',
			height_inches: '',
			weight: '',
			hair_color: '',
			eye_color: '',
			notes: ''
		});
		expect(core).toMatchObject({
			first_name: 'A',
			last_name: 'B',
			primary_phone: '5551112222',
			additional_phones: ['5557777'],
			country: COUNTRY_US,
			address_type: 'HOME',
			dob: '1980-01-15'
		});
		expect(core).not.toHaveProperty('middle_name');
		expect(core).not.toHaveProperty('aliases');
	});

	it('buildPersonCoreAttributes: dob_approx path', () => {
		const core = buildPersonCoreAttributes({
			first_name: 'X',
			middle_name: '',
			last_name: '',
			aliases: '',
			primary_phone: '',
			additional_phones: [],
			address_line: '',
			unit: '',
			city: '',
			stateResolved: '',
			countrySelect: COUNTRY_US,
			countryOther: '',
			address_type: 'UNKNOWN',
			dob_iso: '',
			dob_approx: '~1980s',
			ethnicity: '',
			height_feet: '',
			height_inches: '',
			weight: '',
			hair_color: '',
			eye_color: '',
			notes: ''
		});
		expect(core).toMatchObject({ dob_approx: '~1980s' });
		expect(core).not.toHaveProperty('dob');
	});

	it('buildVehicleCoreAttributes normalizes plate and VIN', () => {
		const core = buildVehicleCoreAttributes({
			plate: '  x12  ',
			plate_state_resolved: 'ca',
			vin: ' abc  def ',
			make_resolved: 'Ford',
			model: 'F-150',
			color_resolved: 'Black',
			year: '2020',
			notes: 'n'
		});
		expect(core).toEqual({
			plate: 'X12',
			plate_state: 'CA',
			vin: 'ABCDEF',
			make: 'Ford',
			model: 'F-150',
			color: 'Black',
			year: '2020',
			notes: 'n'
		});
	});

	it('buildLocationCoreAttributes always emits address_line and city', () => {
		const core = buildLocationCoreAttributes({
			place_name: 'Shop',
			address_line: '  1 Main ',
			unit: '',
			city: ' X ',
			stateResolved: 'VT',
			countrySelect: COUNTRY_OTHER,
			countryOther: 'Mexico',
			notes: ''
		});
		expect(core).toMatchObject({
			place_name: 'Shop',
			address_line: '1 Main',
			city: 'X',
			state: 'VT',
			country: COUNTRY_OTHER,
			country_detail: 'Mexico'
		});
	});

	it('mergeCoreAttributesStructuredWins: structured overwrites advanced on key collision', () => {
		const merged = mergeCoreAttributesStructuredWins(
			{ phone: '111', notes: 'from json', extra: 1 },
			{ phone: '999' }
		);
		expect(merged.phone).toBe('999');
		expect(merged.notes).toBe('from json');
		expect(merged.extra).toBe(1);
	});

	it('pruneEmptyCoreValues strips empty strings and empty arrays', () => {
		expect(pruneEmptyCoreValues({ a: 'ok', b: '', c: [], d: null as unknown as string })).toEqual({ a: 'ok' });
	});

	it('assembleCoreAttributesForSubmit: empty advanced yields structured only', () => {
		const r = assembleCoreAttributesForSubmit({
			structured: { primary_phone: '555' },
			advancedJson: '   '
		});
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.core).toEqual({ primary_phone: '555' });
	});

	it('assembleCoreAttributesForSubmit: structured wins on collision', () => {
		const r = assembleCoreAttributesForSubmit({
			structured: { plate: 'ZZ' },
			advancedJson: '{"plate":"AA","vin":"X"}'
		});
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.core).toEqual({ plate: 'ZZ', vin: 'X' });
	});

	it('assembleCoreAttributesForSubmit: rejects non-object JSON', () => {
		const r = assembleCoreAttributesForSubmit({
			structured: {},
			advancedJson: '[1,2]'
		});
		expect(r.ok).toBe(false);
	});

	it('parseAdvancedCoreAttributesJson empty string is empty object', () => {
		const p = parseAdvancedCoreAttributesJson('  ');
		expect(p.ok).toBe(true);
		if (p.ok) expect(p.value).toEqual({});
	});
});
