/**
 * Tests for structuredNotesCleanText.ts
 *
 * Covers:
 *   - renderNotesCleanText: certainty/disclaimer exclusion (~h blocks)
 *   - renderNotesCleanText: section reconstruction (statements, conflicts, etc.)
 *   - renderNotesCleanText: preservation of legitimate hedged wording in statements
 *   - renderNotesCleanText: multi-segment numeric suffix handling
 *   - isNotesCleanTextEmpty: guard helper
 */
import { describe, it, expect } from 'vitest';
import { renderNotesCleanText, isNotesCleanTextEmpty } from './structuredNotesCleanText';

// ── renderNotesCleanText ─────────────────────────────────────────────────────

describe('renderNotesCleanText', () => {
	it('returns empty string when blocks array is empty', () => {
		expect(renderNotesCleanText([])).toBe('');
	});

	it('returns a single statement block text unchanged', () => {
		const blocks = [
			{ blockId: 'stmt-1', kind: 'statement' as const, text: 'Subject was seen at 14:00.' }
		];
		expect(renderNotesCleanText(blocks)).toBe('Subject was seen at 14:00.');
	});

	it('joins multiple statement blocks with double newline (Notes multi-paragraph format)', () => {
		const blocks = [
			{ blockId: 'stmt-1', kind: 'statement' as const, text: 'Subject arrived at 09:00.' },
			{ blockId: 'stmt-2', kind: 'statement' as const, text: 'Vehicle was a blue Honda.' }
		];
		expect(renderNotesCleanText(blocks)).toBe(
			'Subject arrived at 09:00.\n\nVehicle was a blue Honda.'
		);
	});

	// ── Certainty disclaimer exclusion ───────────────────────────────────────

	it('excludes certainty disclaimer block (~h suffix) from output', () => {
		// Known failing example: "I think if this still works tell me what you think"
		// AI detects certainty: 'hedged' → backend emits ~h block
		const blocks = [
			{
				blockId: 'stmt-s1~0',
				kind: 'statement' as const,
				text: 'I think if this still works, let me know what you think.'
			},
			{
				blockId: 'stmt-s1~h',
				kind: 'statement' as const,
				text: 'This information is not confirmed.'
			}
		];
		const result = renderNotesCleanText(blocks);
		expect(result).not.toContain('This information is not confirmed.');
		expect(result).toBe('I think if this still works, let me know what you think.');
	});

	it('excludes ~h block even when it follows multiple statement blocks', () => {
		const blocks = [
			{ blockId: 'stmt-a', kind: 'statement' as const, text: 'First observation.' },
			{ blockId: 'stmt-b~0', kind: 'statement' as const, text: 'Second observation.' },
			{ blockId: 'stmt-b~h', kind: 'statement' as const, text: 'This information is not confirmed.' }
		];
		const result = renderNotesCleanText(blocks);
		expect(result).not.toContain('This information is not confirmed.');
		expect(result).toBe('First observation.\n\nSecond observation.');
	});

	it('keeps ~0 and ~1 numeric-suffix segments (multi-sentence statement splits)', () => {
		const blocks = [
			{ blockId: 'stmt-x~0', kind: 'statement' as const, text: 'Subject arrived at 10:00.' },
			{ blockId: 'stmt-x~1', kind: 'statement' as const, text: 'Suspect fled on foot.' }
		];
		// Both are narrative; should be included
		expect(renderNotesCleanText(blocks)).toBe('Subject arrived at 10:00.\n\nSuspect fled on foot.');
	});

	it('preserves hedged wording already in the detective text (not injected)', () => {
		// When verbatim carries uncertainty the backend does NOT add ~h block.
		// The hedge wording stays in the statement body and must be preserved.
		const blocks = [
			{
				blockId: 'stmt-1',
				kind: 'statement' as const,
				text: 'Subject possibly fled north; could not confirm direction.'
			}
		];
		expect(renderNotesCleanText(blocks)).toBe(
			'Subject possibly fled north; could not confirm direction.'
		);
	});

	// ── Section reconstruction ────────────────────────────────────────────────

	it('appends conflict section with header when conflict blocks are present', () => {
		const blocks = [
			{ blockId: 'stmt-1', kind: 'statement' as const, text: 'Statement A.' },
			{
				blockId: 'conf-1',
				kind: 'conflict' as const,
				text: 'The following statements appear to conflict: stmt-1.\n- stmt-1: ...'
			}
		];
		const result = renderNotesCleanText(blocks);
		expect(result).toContain('### Conflicting details');
		expect(result).toContain('The following statements appear to conflict');
		expect(result).toBe(
			'Statement A.\n\n### Conflicting details\nThe following statements appear to conflict: stmt-1.\n- stmt-1: ...'
		);
	});

	it('appends ambiguity section with header when ambiguity blocks are present', () => {
		const blocks = [
			{ blockId: 'stmt-1', kind: 'statement' as const, text: 'Statement B.' },
			{ blockId: 'amb-1', kind: 'ambiguity' as const, text: '- Unclear timing.' }
		];
		const result = renderNotesCleanText(blocks);
		expect(result).toContain('### Unresolved or unclear details');
		expect(result).toContain('- Unclear timing.');
	});

	it('appends action section with header when action blocks are present', () => {
		const blocks = [
			{ blockId: 'stmt-1', kind: 'statement' as const, text: 'Statement C.' },
			{ blockId: 'act-1', kind: 'action' as const, text: '- Obtain CCTV footage.' }
		];
		const result = renderNotesCleanText(blocks);
		expect(result).toContain('### Planned or stated next steps');
		expect(result).toContain('- Obtain CCTV footage.');
	});

	it('appends issue section with header when issue blocks are present', () => {
		const blocks = [
			{ blockId: 'stmt-1', kind: 'statement' as const, text: 'Statement D.' },
			{ blockId: 'iss-1', kind: 'issue' as const, text: '- Extraction note: ambiguous date.' }
		];
		const result = renderNotesCleanText(blocks);
		expect(result).toContain('### Extraction notes');
		expect(result).toContain('- Extraction note: ambiguous date.');
	});

	it('includes all sections together in correct order, without ~h blocks', () => {
		const blocks = [
			{ blockId: 'stmt-a~0', kind: 'statement' as const, text: 'First statement.' },
			{ blockId: 'stmt-a~h', kind: 'statement' as const, text: 'This information is not confirmed.' },
			{ blockId: 'stmt-b', kind: 'statement' as const, text: 'Second statement.' },
			{ blockId: 'conf-1', kind: 'conflict' as const, text: '- Conflict text.' },
			{ blockId: 'amb-1', kind: 'ambiguity' as const, text: '- Ambiguity text.' },
			{ blockId: 'act-1', kind: 'action' as const, text: '- Action text.' },
			{ blockId: 'iss-1', kind: 'issue' as const, text: '- Issue text.' }
		];
		const result = renderNotesCleanText(blocks);
		expect(result).not.toContain('This information is not confirmed.');
		expect(result).toContain('First statement.');
		expect(result).toContain('Second statement.');
		expect(result).toContain('### Conflicting details');
		expect(result).toContain('### Unresolved or unclear details');
		expect(result).toContain('### Planned or stated next steps');
		expect(result).toContain('### Extraction notes');
		// Statements must appear before sections
		const stmtPos = result.indexOf('First statement.');
		const confPos = result.indexOf('### Conflicting details');
		expect(stmtPos).toBeLessThan(confPos);
	});

	it('produces output without ~h disclaimer even when no other statements exist', () => {
		const blocks = [
			{ blockId: 'stmt-x~h', kind: 'statement' as const, text: 'This information is not confirmed.' }
		];
		expect(renderNotesCleanText(blocks)).toBe('');
	});
});

// ── isNotesCleanTextEmpty ────────────────────────────────────────────────────

describe('isNotesCleanTextEmpty', () => {
	it('returns true for empty blocks array', () => {
		expect(isNotesCleanTextEmpty([])).toBe(true);
	});

	it('returns true when only ~h blocks are present', () => {
		const blocks = [
			{ blockId: 'stmt-x~h', kind: 'statement' as const, text: 'This information is not confirmed.' }
		];
		expect(isNotesCleanTextEmpty(blocks)).toBe(true);
	});

	it('returns false when at least one non-~h statement block is present', () => {
		const blocks = [
			{ blockId: 'stmt-1', kind: 'statement' as const, text: 'Some text.' },
			{ blockId: 'stmt-1~h', kind: 'statement' as const, text: 'This information is not confirmed.' }
		];
		expect(isNotesCleanTextEmpty(blocks)).toBe(false);
	});

	it('returns false when only annotation sections are present (no statements)', () => {
		const blocks = [
			{ blockId: 'act-1', kind: 'action' as const, text: '- Follow up.' }
		];
		expect(isNotesCleanTextEmpty(blocks)).toBe(false);
	});
});
