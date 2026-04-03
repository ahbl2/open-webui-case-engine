import { describe, it, expect } from 'vitest';
import { buildAutoNoteTitle } from './buildAutoNoteTitle';

describe('buildAutoNoteTitle', () => {
	it('pulls a Cedar anchor from "on cedar" phrasing', () => {
		const t = buildAutoNoteTitle(
			'worked this place on cedar for a few weeks and nothing much happened'
		);
		expect(t.toLowerCase()).toContain('cedar');
	});

	it('pulls Elm from house-on-elm style openings', () => {
		const t = buildAutoNoteTitle('house on elm active again. lots in/out overnight');
		expect(t.toLowerCase()).toContain('elm');
	});

	it('uses road-style anchors when present', () => {
		expect(buildAutoNoteTitle('Traffic stop near Bardstown Rd around 2pm')).toMatch(/Bardstown/i);
	});

	it('blank or whitespace-only body yields Untitled Note', () => {
		expect(buildAutoNoteTitle('')).toBe('Untitled Note');
		expect(buildAutoNoteTitle('   \n  \t  ')).toBe('Untitled Note');
	});

	it('meaningful body without special anchors still yields a stable title', () => {
		const body = 'witness recalled seeing vehicle leave northbound quickly';
		const t = buildAutoNoteTitle(body);
		expect(t.length).toBeGreaterThan(3);
		expect(t).not.toBe('Untitled Note');
	});

	it('weak / noisy body falls back without crashing', () => {
		const t = buildAutoNoteTitle('the a an of in on at');
		expect(t).toBeTruthy();
	});

	it('is deterministic for the same input', () => {
		const body = 'house on maple side street quiet';
		expect(buildAutoNoteTitle(body)).toBe(buildAutoNoteTitle(body));
	});

	it('strips filler and uses anchor + complaints for noisy maple note', () => {
		const t = buildAutoNoteTitle(
			'been on this maple house little over 2 wks now after complaints'
		);
		const lower = t.toLowerCase();
		expect(lower).toContain('maple');
		expect(lower).toContain('complaints');
		expect(lower).not.toContain('wks');
		expect(lower).not.toContain('now');
		expect(lower).not.toContain('little');
		expect(lower).not.toContain('after');
		expect(t).toMatch(/Maple house complaints/i);
	});
});
