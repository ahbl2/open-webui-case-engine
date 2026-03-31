import { describe, expect, it } from 'vitest';
import { accessUnavailableBanner } from './accessUnavailableBanner';

describe('accessUnavailableBanner', () => {
	it('rate_limited is distinct from unreachable copy', () => {
		const r = accessUnavailableBanner('rate_limited');
		const u = accessUnavailableBanner('unavailable');
		expect(r.title).toContain('Too many');
		expect(r.lead.toLowerCase()).not.toContain('could not be reached');
		expect(u.lead).toContain('could not be reached');
		expect(r.title).not.toBe(u.title);
	});

	it('defaults unknown / null to unreachable messaging', () => {
		const a = accessUnavailableBanner(null);
		const b = accessUnavailableBanner('pending');
		expect(a.title).toBe('Service Unavailable');
		expect(b.title).toBe('Service Unavailable');
	});
});
