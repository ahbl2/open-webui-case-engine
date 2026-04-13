import { describe, expect, it } from 'vitest';
import {
	parseCaseEntityAttributesJsonText,
	validateCaseEntityTypeForSave,
	validateDisplayLabelForSave
} from './p107CaseEntityFormValidation';

describe('p107CaseEntityFormValidation', () => {
	it('validateCaseEntityTypeForSave rejects empty and reserved prefixes', () => {
		expect(validateCaseEntityTypeForSave('').ok).toBe(false);
		expect(validateCaseEntityTypeForSave('  ').ok).toBe(false);
		expect(validateCaseEntityTypeForSave('case_intelligence_x').ok).toBe(false);
		expect(validateCaseEntityTypeForSave('person').ok).toBe(true);
	});

	it('validateDisplayLabelForSave rejects empty and oversize', () => {
		expect(validateDisplayLabelForSave('').ok).toBe(false);
		expect(validateDisplayLabelForSave('ok').ok).toBe(true);
		expect(validateDisplayLabelForSave('x'.repeat(2001)).ok).toBe(false);
	});

	it('parseCaseEntityAttributesJsonText accepts empty as {}', () => {
		const r = parseCaseEntityAttributesJsonText('   ');
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.attributes).toEqual({});
	});

	it('parseCaseEntityAttributesJsonText rejects non-object JSON', () => {
		expect(parseCaseEntityAttributesJsonText('[]').ok).toBe(false);
		expect(parseCaseEntityAttributesJsonText('null').ok).toBe(false);
		expect(parseCaseEntityAttributesJsonText('{').ok).toBe(false);
	});

	it('parseCaseEntityAttributesJsonText accepts object payload', () => {
		const r = parseCaseEntityAttributesJsonText('{"a":1,"b":"x"}');
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.attributes).toEqual({ a: 1, b: 'x' });
	});
});
