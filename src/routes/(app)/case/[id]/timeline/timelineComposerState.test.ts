/**
 * P39-03 — Bottom composer state helpers tests.
 * Covers open/close readiness, required field enforcement, and dirty tracking.
 */
import { describe, expect, it } from 'vitest';
import {
	isDirtyBottomComposer,
	isBottomComposerSaveValid,
	type BottomComposerDraft
} from './timelineUnsavedDirty';

const clean: BottomComposerDraft = {
	occurred_date: '',
	occurred_time: '',
	type: 'note',
	text_original: '',
	location_text: '',
	linked_images: []
};

// ── Dirty state ──────────────────────────────────────────────────────────────

describe('isDirtyBottomComposer — open/close and dirty detection', () => {
	it('false when null (composer closed)', () => {
		expect(isDirtyBottomComposer(null)).toBe(false);
	});

	it('false when all fields empty (just opened, nothing touched)', () => {
		expect(isDirtyBottomComposer(clean)).toBe(false);
	});

	it('true when text_original has content', () => {
		expect(isDirtyBottomComposer({ ...clean, text_original: 'Witness sighted' })).toBe(true);
	});

	it('true when occurred_date set', () => {
		expect(isDirtyBottomComposer({ ...clean, occurred_date: '2024-06-01' })).toBe(true);
	});

	it('true when occurred_time set', () => {
		expect(isDirtyBottomComposer({ ...clean, occurred_time: '14:30' })).toBe(true);
	});

	it('true when location_text set', () => {
		expect(isDirtyBottomComposer({ ...clean, location_text: '123 Main St' })).toBe(true);
	});

	it('false when only type changed (type always has a value; not a meaningful dirty signal)', () => {
		expect(isDirtyBottomComposer({ ...clean, type: 'evidence' })).toBe(false);
	});

	it('true when linked_images non-empty', () => {
		expect(
			isDirtyBottomComposer({
				...clean,
				linked_images: [{ id: 'f1', original_filename: 'a.png' }]
			})
		).toBe(true);
	});
});

// ── Save validity / required field enforcement ───────────────────────────────

describe('isBottomComposerSaveValid — required field enforcement', () => {
	it('false when null', () => {
		expect(isBottomComposerSaveValid(null)).toBe(false);
	});

	it('false when date missing', () => {
		expect(
			isBottomComposerSaveValid({ ...clean, occurred_time: '10:00', text_original: 'abc' })
		).toBe(false);
	});

	it('false when time missing', () => {
		expect(
			isBottomComposerSaveValid({ ...clean, occurred_date: '2024-06-01', text_original: 'abc' })
		).toBe(false);
	});

	it('false when text missing', () => {
		expect(
			isBottomComposerSaveValid({ ...clean, occurred_date: '2024-06-01', occurred_time: '10:00' })
		).toBe(false);
	});

	it('false when text is only whitespace', () => {
		expect(
			isBottomComposerSaveValid({
				...clean,
				occurred_date: '2024-06-01',
				occurred_time: '10:00',
				text_original: '   '
			})
		).toBe(false);
	});

	it('true when date, time, and text are all present', () => {
		expect(
			isBottomComposerSaveValid({
				...clean,
				occurred_date: '2024-06-01',
				occurred_time: '10:00',
				text_original: 'Witness sighted near fence'
			})
		).toBe(true);
	});

	it('true regardless of optional location_text', () => {
		expect(
			isBottomComposerSaveValid({
				...clean,
				occurred_date: '2024-06-01',
				occurred_time: '10:00',
				text_original: 'Entry',
				location_text: '14 Elm St'
			})
		).toBe(true);
	});
});

// ── Cancel with / without dirty state ────────────────────────────────────────
// These are pure logic checks; UI confirm-dialog flow is handled by +page.svelte.

describe('cancel decision — dirty check determines confirm needed', () => {
	it('clean draft → cancel does not need confirm', () => {
		expect(isDirtyBottomComposer(clean)).toBe(false);
	});

	it('draft with text → cancel requires confirm', () => {
		expect(isDirtyBottomComposer({ ...clean, text_original: 'Started writing' })).toBe(true);
	});
});

// ── Save blocked when invalid ─────────────────────────────────────────────────

describe('save blocked when invalid', () => {
	it('all required fields missing → save invalid', () => {
		expect(isBottomComposerSaveValid(clean)).toBe(false);
	});

	it('one required field missing → save invalid', () => {
		const partial = { ...clean, occurred_date: '2024-06-01', text_original: 'Entry' };
		expect(isBottomComposerSaveValid(partial)).toBe(false);
	});

	it('all required fields present → save valid', () => {
		const full = {
			...clean,
			occurred_date: '2024-06-01',
			occurred_time: '09:30',
			text_original: 'Completed patrol'
		};
		expect(isBottomComposerSaveValid(full)).toBe(true);
	});
});
