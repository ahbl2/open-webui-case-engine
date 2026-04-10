import { describe, expect, it } from 'vitest';
import { resolveDetectiveGnavPrimaryActive } from './detectiveGnav';

describe('detectiveGnav (P75-04 / P75-08)', () => {
	it('prioritizes search modal open', () => {
		expect(resolveDetectiveGnavPrimaryActive('/home', true)).toBe('search');
		expect(resolveDetectiveGnavPrimaryActive('/cases', true)).toBe('search');
	});

	it('resolves home', () => {
		expect(resolveDetectiveGnavPrimaryActive('/home', false)).toBe('home');
		expect(resolveDetectiveGnavPrimaryActive('/home?x=1', false)).toBe('home');
	});

	it('resolves cases list and case workspace', () => {
		expect(resolveDetectiveGnavPrimaryActive('/cases', false)).toBe('cases');
		expect(resolveDetectiveGnavPrimaryActive('/case/abc123/chat', false)).toBe('cases');
	});

	it('admin has no core primary active', () => {
		expect(resolveDetectiveGnavPrimaryActive('/admin', false)).toBe(null);
		expect(resolveDetectiveGnavPrimaryActive('/admin/users', false)).toBe(null);
	});

	it('search route without modal', () => {
		expect(resolveDetectiveGnavPrimaryActive('/search', false)).toBe('search');
		expect(resolveDetectiveGnavPrimaryActive('/search/foo', false)).toBe('search');
	});
});
