import { describe, expect, it } from 'vitest';
import { ageInFullYearsToReference, ageInYearsFromDobString } from './formatDateTime';

describe('age from DOB (PERSON pretab display)', () => {
	it('ageInYearsFromDobString parses YYYY-MM-DD in local calendar', () => {
		const ref = new Date(2020, 5, 15); // 15 Jun 2020
		expect(ageInYearsFromDobString('2010-06-15', ref)).toBe(10);
		expect(ageInYearsFromDobString('2010-06-16', ref)).toBe(9);
		expect(ageInYearsFromDobString('2010-06-14', ref)).toBe(10);
	});

	it('ageInFullYearsToReference is null for future DOB on reference day', () => {
		const ref = new Date(2020, 0, 1);
		expect(ageInFullYearsToReference(new Date(2021, 0, 1), ref)).toBeNull();
	});

	it('ageInYearsFromDobString returns null for unparseable strings', () => {
		expect(ageInYearsFromDobString('')).toBeNull();
		expect(ageInYearsFromDobString('not-a-date')).toBeNull();
	});
});
