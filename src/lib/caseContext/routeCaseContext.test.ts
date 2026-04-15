/**
 * P123-03 — Route case context: pure helpers, no storage, no fallback case ids.
 */
import { describe, it, expect } from 'vitest';
import { getRouteCaseId, getRouteCaseIdString, isCaseWorkspacePathname } from './routeCaseContext';

describe('routeCaseContext (P123-03)', () => {
	describe('getRouteCaseId', () => {
		it('returns trimmed id from params', () => {
			expect(getRouteCaseId({ id: '  abc-1  ' })).toBe('abc-1');
		});

		it('returns null when id is missing, empty, or whitespace-only', () => {
			expect(getRouteCaseId(undefined)).toBe(null);
			expect(getRouteCaseId(null)).toBe(null);
			expect(getRouteCaseId({})).toBe(null);
			expect(getRouteCaseId({ id: '' })).toBe(null);
			expect(getRouteCaseId({ id: '   ' })).toBe(null);
		});

		it('does not invent or default a case id', () => {
			expect(getRouteCaseId({ id: 'case-a' })).toBe('case-a');
			expect(getRouteCaseId({ id: 'case-b' })).toBe('case-b');
		});
	});

	describe('getRouteCaseIdString', () => {
		it('returns empty string when no route id (not a fabricated id)', () => {
			expect(getRouteCaseIdString(undefined)).toBe('');
			expect(getRouteCaseIdString({ id: '' })).toBe('');
		});

		it('matches getRouteCaseId when present', () => {
			expect(getRouteCaseIdString({ id: 'x' })).toBe('x');
		});
	});

	describe('isCaseWorkspacePathname', () => {
		it('is true for /case/:id/... with non-empty id', () => {
			expect(isCaseWorkspacePathname('/case/u1/timeline')).toBe(true);
		});

		it('is false for bare /case or missing id', () => {
			expect(isCaseWorkspacePathname('/case')).toBe(false);
			expect(isCaseWorkspacePathname('/cases')).toBe(false);
		});
	});

	it('module has no localStorage/sessionStorage references', async () => {
		const { readFileSync } = await import('node:fs');
		const { join, dirname } = await import('node:path');
		const { fileURLToPath } = await import('node:url');
		const p = join(dirname(fileURLToPath(import.meta.url)), 'routeCaseContext.ts');
		const src = readFileSync(p, 'utf8');
		expect(src).not.toMatch(/localStorage/);
		expect(src).not.toMatch(/sessionStorage/);
	});
});
