/**
 * P97-01 — Synthesis → source navigation contract (read-only; no storage/URL target persistence).
 */
import { describe, it, expect, vi } from 'vitest';
import {
	intentFromSupportingContextItem,
	intentFromTimelineFact,
	navigateToSynthesisSource,
	synthesisDestinationPath,
	synthesisSourceNavigateButtonText,
	type SynthesisSourceNavigationIntent
} from './caseSynthesisSourceNavigation';

describe('caseSynthesisSourceNavigation (P97-01)', () => {
	it('builds authoritative timeline intent with exact entry id', () => {
		const intent = intentFromTimelineFact('case-a', { entry_id: 'ent-1' });
		expect(intent).toEqual({
			v: 1,
			case_id: 'case-a',
			authority: 'authoritative',
			source_kind: 'timeline_entry',
			source_record_id: 'ent-1',
			destination_surface: 'timeline'
		});
		expect(synthesisDestinationPath('case-a', 'timeline')).toBe('/case/case-a/timeline');
	});

	it('builds supporting task intent (Tasks surface)', () => {
		const intent = intentFromSupportingContextItem('case-b', {
			source_type: 'task',
			source_id: 'task-9',
			reference_text: 'x'
		});
		expect(intent?.authority).toBe('supporting');
		expect(intent?.source_kind).toBe('task');
		expect(intent?.destination_surface).toBe('tasks');
		expect(synthesisDestinationPath('case-b', 'tasks')).toBe('/case/case-b/tasks');
	});

	it('builds supporting file vs extracted_text intents (Files surface)', () => {
		const fileIntent = intentFromSupportingContextItem('c', {
			source_type: 'file',
			source_id: 'f1',
			reference_text: 'a.pdf'
		});
		const extIntent = intentFromSupportingContextItem('c', {
			source_type: 'extracted_text',
			source_id: 'f1',
			reference_text: 'blob'
		});
		expect(fileIntent?.source_kind).toBe('case_file');
		expect(extIntent?.source_kind).toBe('extracted_text');
		expect(fileIntent?.destination_surface).toBe('files');
		expect(extIntent?.destination_surface).toBe('files');
		expect(synthesisDestinationPath('c', 'files')).toBe('/case/c/files');
	});

	it('returns null when ids are missing (predictable unsupported)', () => {
		expect(intentFromTimelineFact('', { entry_id: 'e' })).toBeNull();
		expect(intentFromTimelineFact('c', { entry_id: '' })).toBeNull();
		expect(
			intentFromSupportingContextItem('c', {
				source_type: 'task',
				source_id: '',
				reference_text: ''
			})
		).toBeNull();
	});

	it('navigateToSynthesisSource calls goto with path and state only (no URL query)', async () => {
		const goto = vi.fn().mockResolvedValue(undefined);
		const intent: SynthesisSourceNavigationIntent = {
			v: 1,
			case_id: 'cx',
			authority: 'authoritative',
			source_kind: 'timeline_entry',
			source_record_id: 'e99',
			destination_surface: 'timeline'
		};
		await navigateToSynthesisSource(intent, goto as Parameters<typeof navigateToSynthesisSource>[1]);
		expect(goto).toHaveBeenCalledTimes(1);
		expect(goto).toHaveBeenCalledWith('/case/cx/timeline', {
			state: { synthesisSourceNavigationIntent: intent }
		});
		const url = String(goto.mock.calls[0][0]);
		expect(url).not.toMatch(/[?#]/);
	});

	it('distinguishes authoritative vs supporting in button text and labels', () => {
		const t: SynthesisSourceNavigationIntent = {
			v: 1,
			case_id: 'c',
			authority: 'authoritative',
			source_kind: 'timeline_entry',
			source_record_id: 'e',
			destination_surface: 'timeline'
		};
		const s: SynthesisSourceNavigationIntent = {
			v: 1,
			case_id: 'c',
			authority: 'supporting',
			source_kind: 'task',
			source_record_id: 't',
			destination_surface: 'tasks'
		};
		expect(t.authority).toBe('authoritative');
		expect(s.authority).toBe('supporting');
		expect(synthesisSourceNavigateButtonText(t)).toContain('Timeline');
		expect(synthesisSourceNavigateButtonText(s)).toContain('Tasks');
	});
});
