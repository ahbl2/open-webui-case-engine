/**
 * P19-06 — Tests for caseNavSection utility.
 *
 * Verifies that the left-nav active-section resolver correctly identifies
 * every blueprint section from a URL pathname and falls back to 'chat' for
 * unknown or bare paths.
 */
import { describe, it, expect } from 'vitest';
import { resolveActiveCaseSection, type CaseNavSection } from './caseNavSection';

describe('resolveActiveCaseSection', () => {
	// ── Known sections ──────────────────────────────────────────────────────
	it('resolves /case/[id]/chat to chat', () => {
		expect(resolveActiveCaseSection('/case/abc123/chat')).toBe('chat');
	});

	it('resolves /case/[id]/timeline to timeline', () => {
		expect(resolveActiveCaseSection('/case/abc123/timeline')).toBe('timeline');
	});

	it('resolves /case/[id]/summary to summary', () => {
		expect(resolveActiveCaseSection('/case/abc123/summary')).toBe('summary');
	});

	it('resolves /case/[id]/workflow to workflow', () => {
		expect(resolveActiveCaseSection('/case/abc123/workflow')).toBe('workflow');
	});

	it('resolves /case/[id]/warrants to warrants', () => {
		expect(resolveActiveCaseSection('/case/abc123/warrants')).toBe('warrants');
	});

	it('resolves /case/[id]/intelligence to intelligence', () => {
		expect(resolveActiveCaseSection('/case/abc123/intelligence')).toBe('intelligence');
	});

	it('keeps intelligence active for nested intelligence routes', () => {
		expect(resolveActiveCaseSection('/case/abc123/intelligence/entity/phone/5551234567')).toBe('intelligence');
	});

	it('resolves /case/[id]/graph to graph', () => {
		expect(resolveActiveCaseSection('/case/abc123/graph')).toBe('graph');
	});

	it('resolves /case/[id]/files to files', () => {
		expect(resolveActiveCaseSection('/case/abc123/files')).toBe('files');
	});

	it('resolves /case/[id]/notes to notes', () => {
		expect(resolveActiveCaseSection('/case/abc123/notes')).toBe('notes');
	});

	it('resolves /case/[id]/activity to activity', () => {
		expect(resolveActiveCaseSection('/case/abc123/activity')).toBe('activity');
	});

	// ── Fallback behaviour ──────────────────────────────────────────────────
	it('falls back to chat for the bare /case/[id] path', () => {
		expect(resolveActiveCaseSection('/case/abc123')).toBe('chat');
	});

	it('falls back to chat for an unknown subroute', () => {
		expect(resolveActiveCaseSection('/case/abc123/unknown')).toBe('chat');
	});

	it('falls back to chat for an empty string', () => {
		expect(resolveActiveCaseSection('')).toBe('chat');
	});

	// ── Section completeness ────────────────────────────────────────────────
	it('covers all blueprint sections', () => {
		const expected: CaseNavSection[] = ['chat', 'summary', 'workflow', 'warrants', 'intelligence', 'graph', 'timeline', 'files', 'notes', 'activity'];
		for (const section of expected) {
			expect(resolveActiveCaseSection(`/case/x/${section}`)).toBe(section);
		}
	});

	// ── Determinism ────────────────────────────────────────────────────────
	it('returns the same result on repeated calls with the same input', () => {
		const path = '/case/abc123/timeline';
		const first = resolveActiveCaseSection(path);
		const second = resolveActiveCaseSection(path);
		expect(first).toBe(second);
	});
});
