/**
 * P68-05 — direct-create modal wiring (source contract).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'CaseIntelligenceEntityCreateModal.svelte'), 'utf8');

describe('CaseIntelligenceEntityCreateModal (P68-05)', () => {
	it('calls createCaseIntelligenceCommittedEntityDirect and dispatches created', () => {
		expect(source).toContain('createCaseIntelligenceCommittedEntityDirect');
		expect(source).toContain("dispatch('created', { entity:");
	});

	it('kind-specific titles (modalHeading + key) and PERSON posture field only', () => {
		expect(source).toContain("'Add person'");
		expect(source).toContain("'Add vehicle'");
		expect(source).toContain("'Add location'");
		expect(source).toContain('modalHeading');
		expect(source).toContain('{#key entityKind}');
		expect(source).toContain("{#if entityKind === 'PERSON'}");
		expect(source).toContain('case-intel-create-person-posture');
	});

	it('submit button shows in-flight label and disables controls while submitting', () => {
		expect(source).toContain("'Creating…'");
		expect(source).toContain('disabled={submitting}');
	});

	it('surfaces submit errors with alert test id', () => {
		expect(source).toContain('case-intel-create-error');
		expect(source).toContain('role="alert"');
	});

	it('native dialog has test id and aria-modal', () => {
		expect(source).toContain('data-testid="case-intel-entity-create-modal"');
		expect(source).toContain('aria-modal="true"');
	});

	it('P68-08-FU3: dialog open sync reads `open` synchronously in `$:` (showModal after Add)', () => {
		expect(source).toContain('const shouldOpen = open');
		expect(source).toContain('el.isConnected');
		expect(source).toContain('el.showModal()');
		expect(source).not.toContain('$: if (dialogEl !== null) void syncDialog()');
	});
});

describe('CaseIntelligenceEntityCreateModal (P68-FU7 normalized field sets)', () => {
	const source = readFileSync(join(__dirname, 'CaseIntelligenceEntityCreateModal.svelte'), 'utf8');

	it('uses assembleCoreAttributesForSubmit + build*CoreAttributes', () => {
		expect(source).toContain('assembleCoreAttributesForSubmit');
		expect(source).toContain('buildPersonCoreAttributes');
		expect(source).toContain('buildVehicleCoreAttributes');
		expect(source).toContain('buildLocationCoreAttributes');
	});

	it('PERSON: names, phones (repeatable), geo dropdowns, DOB paths, posture', () => {
		expect(source).toContain('data-testid="case-intel-create-person-structured"');
		expect(source).toContain('data-testid="case-intel-create-person-aliases"');
		expect(source).toContain('data-testid="case-intel-create-person-posture"');
		expect(source.match(/case-intel-create-person-posture/g)?.length).toBe(1);
		expect(source).toContain('case-intel-create-person-phone-add');
		expect(source).toContain('case-intel-create-person-state-select');
		expect(source).toContain('case-intel-create-person-country-select');
		expect(source).toContain('case-intel-create-person-dob-approx-toggle');
		expect(source).toContain('case-intel-create-suggest-person-label');
	});

	it('P68-FU9: PERSON section order — identifiers → contact → address → physical → notes', () => {
		const id = source.indexOf('case-intel-create-person-section-identifiers');
		const contact = source.indexOf('case-intel-create-person-section-contact');
		const addr = source.indexOf('case-intel-create-person-section-address');
		const phys = source.indexOf('case-intel-create-person-section-physical');
		const notes = source.indexOf('case-intel-create-person-section-notes');
		const vehicle = source.indexOf('case-intel-create-vehicle-structured');
		expect(id).toBeLessThan(contact);
		expect(contact).toBeLessThan(addr);
		expect(addr).toBeLessThan(phys);
		expect(phys).toBeLessThan(notes);
		expect(notes).toBeLessThan(vehicle);
	});

	it('P68-FU8: PERSON ethnicity + masked phones; vehicle markup has no ethnicity control', () => {
		expect(source).toContain('data-testid="case-intel-create-person-ethnicity"');
		expect((source.match(/case-intel-create-person-ethnicity/g) ?? []).length).toBe(1);
		expect(source).toContain('PERSON_ETHNICITY_OPTIONS');
		expect(source).toContain('formatUsPersonPhoneMask');
		expect(source).toContain('usPersonPhoneDigitsFromInput');
		expect(source).toContain('onPersonPrimaryPhoneInput');
		expect(source).toContain('onPersonExtraPhoneInput');
		expect(source).toContain('onPersonPrimaryPhonePaste');
		expect(source).toContain('onPersonExtraPhonePaste');
		expect(source).toContain('case-intel-create-person-height-feet');
		expect(source).toContain('case-intel-create-person-hair-color');
		const vehicleTpl = source.indexOf('data-testid="case-intel-create-vehicle-structured"');
		const ethnicityTpl = source.indexOf('case-intel-create-person-ethnicity');
		expect(ethnicityTpl).toBeGreaterThan(-1);
		expect(vehicleTpl).toBeGreaterThan(ethnicityTpl);
	});

	it('VEHICLE: registration + make/color dropdowns + suggest label', () => {
		expect(source).toContain('data-testid="case-intel-create-vehicle-structured"');
		expect(source).toContain('data-testid="case-intel-create-vehicle-plate"');
		expect(source).toContain('case-intel-create-vehicle-make-select');
		expect(source).toContain('case-intel-create-vehicle-color-select');
		expect(source).toContain('data-testid="case-intel-create-suggest-vehicle-label"');
	});

	it('LOCATION: required address/city/state + suggest label', () => {
		expect(source).toContain('data-testid="case-intel-create-location-structured"');
		expect(source).toContain('data-testid="case-intel-create-location-place-name"');
		expect(source).toContain('data-testid="case-intel-create-location-state-select');
		expect(source).toContain('data-testid="case-intel-create-suggest-location-label"');
	});

	it('Advanced JSON is collapsible secondary, not primary body', () => {
		expect(source).toContain('data-testid="case-intel-create-advanced-json-region"');
		expect(source).toContain('data-testid="case-intel-create-advanced-json-toggle"');
		expect(source).toContain('advancedJsonOpen');
		expect(source).toContain('case-intel-create-core-attrs-json');
	});
});
