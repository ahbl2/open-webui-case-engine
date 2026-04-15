/**
 * P131-05 — Runtime behavior for Command Center navigation guards.
 */
import { describe, expect, it, vi } from 'vitest';
import {
	assertCommandCenterCaseIdForNavigation,
	commandCenterCaseWorkspaceHref,
	navigateCommandCenterToCaseWorkspace
} from './commandCenterGuardrails';

describe('commandCenterGuardrails', () => {
	it('assertCommandCenterCaseIdForNavigation accepts UUID-style ids', () => {
		expect(assertCommandCenterCaseIdForNavigation('550e8400-e29b-41d4-a716-446655440000')).toBe(
			'550e8400-e29b-41d4-a716-446655440000'
		);
	});

	it('assertCommandCenterCaseIdForNavigation rejects empty and path-like values', () => {
		expect(() => assertCommandCenterCaseIdForNavigation('')).toThrow();
		expect(() => assertCommandCenterCaseIdForNavigation('  ')).toThrow();
		expect(() => assertCommandCenterCaseIdForNavigation('../x')).toThrow();
		expect(() => assertCommandCenterCaseIdForNavigation('a/b')).toThrow();
	});

	it('commandCenterCaseWorkspaceHref returns /case/:id only', () => {
		expect(commandCenterCaseWorkspaceHref('abc-123')).toBe('/case/abc-123');
	});

	it('navigateCommandCenterToCaseWorkspace invokes goto with guarded href', () => {
		const goto = vi.fn();
		navigateCommandCenterToCaseWorkspace(goto, 'case-one', 'case_list');
		expect(goto).toHaveBeenCalledTimes(1);
		expect(goto).toHaveBeenCalledWith('/case/case-one');
	});
});
