import { describe, expect, it } from 'vitest';
import {
	validateCaseCreateDraft,
	startDesktopCreateCaseWizard,
	advanceDesktopCreateCaseWizard,
	normalizeCaseNumber,
	normalizeIncidentDate,
	normalizeIncidentDateInput,
	isValidIncidentDate,
	detectCreateCaseIntent,
	CASE_CHAT_CREATE_REFUSAL_MESSAGE
} from './caseCreateDraft';

describe('caseCreateDraft validation', () => {
	it('flags missing required fields for create modal flow', () => {
		const checked = validateCaseCreateDraft({
			unit: '',
			case_number: '   ',
			title: ''
		});
		expect(checked.valid).toBe(false);
		expect(checked.missing).toEqual(['unit', 'case_number', 'title']);
	});

	it('normalizes and accepts valid draft', () => {
		const checked = validateCaseCreateDraft({
			unit: 'cid',
			case_number: ' CID-001-233333444 ',
			title: '  Burglary lead  ',
			incident_date: ' 2026-03-22 '
		});
		expect(checked.valid).toBe(true);
		expect(checked.normalized).toEqual({
			unit: 'CID',
			case_number: 'CID-001-233333444',
			title: 'Burglary lead',
			status: 'OPEN',
			incident_date: '2026-03-22'
		});
	});

	it('normalizes case number to trimmed uppercase', () => {
		expect(normalizeCaseNumber(' cid-001 ')).toBe('CID-001');
	});

	it('normalizes and validates required incident date', () => {
		expect(normalizeIncidentDate(' 2026-03-22 ')).toBe('2026-03-22');
		expect(isValidIncidentDate('2026-03-22')).toBe(true);
		expect(isValidIncidentDate('2026-02-31')).toBe(false);
		expect(isValidIncidentDate('2026-03-22T00:00:00.000Z')).toBe(false);
	});

	it('normalizes "today" to local YYYY-MM-DD', () => {
		const normalized = normalizeIncidentDateInput('today', new Date(2026, 2, 23, 12, 30, 0));
		expect(normalized).toBe('2026-03-23');
	});

	it('normalizes "today" by local date near midnight boundaries', () => {
		expect(normalizeIncidentDateInput('today', new Date(2026, 2, 23, 0, 0, 1))).toBe('2026-03-23');
		expect(normalizeIncidentDateInput('today', new Date(2026, 2, 23, 23, 59, 59))).toBe('2026-03-23');
	});

	it('rejects invalid incident date when provided', () => {
		const checked = validateCaseCreateDraft({
			unit: 'CID',
			case_number: 'CID-001',
			title: 'Title',
			incident_date: '2026-02-31'
		});
		expect(checked.valid).toBe(false);
		expect(checked.incident_date_error).toBe('Incident date must use YYYY-MM-DD.');
	});

	it('requires incident date for create draft', () => {
		const checked = validateCaseCreateDraft({
			unit: 'CID',
			case_number: 'CID-001',
			title: 'Title'
		});
		expect(checked.valid).toBe(false);
		expect(checked.incident_date_error).toBe('Incident date is required.');
	});
});

describe('desktop create-case wizard guard', () => {
	it('does not submit before explicit confirmation', () => {
		const started = startDesktopCreateCaseWizard(
			'Create a new case file CID-001-233333444 titled Warehouse Burglary'
		);
		expect(started.state.awaiting).toBe('incident_date_required');
		const withDate = advanceDesktopCreateCaseWizard(started.state, '2026-03-20');
		expect(withDate.action).toBe('confirm');
		if (withDate.action !== 'confirm') return;

		const notConfirmed = advanceDesktopCreateCaseWizard(withDate.state, 'looks good');
		expect(notConfirmed.action).toBe('confirm');
	});

	it('submits only after explicit confirmation', () => {
		const started = startDesktopCreateCaseWizard(
			'Create a new case file CID-001-233333444 titled Warehouse Burglary'
		);
		const withDate = advanceDesktopCreateCaseWizard(started.state, '2026-03-20');
		expect(withDate.action).toBe('confirm');
		if (withDate.action !== 'confirm') return;
		const confirmed = advanceDesktopCreateCaseWizard(withDate.state, 'yes');
		expect(confirmed.action).toBe('submit');
		if (confirmed.action === 'submit') {
			expect(confirmed.payload.case_number).toBe('CID-001-233333444');
			expect(confirmed.payload.title).toBe('Warehouse Burglary');
			expect(confirmed.payload.unit).toBe('CID');
			expect(confirmed.payload.status).toBe('OPEN');
			expect(confirmed.payload.incident_date).toBe('2026-03-20');
		}
	});

	it('keeps confirmation pending for ambiguous replies', () => {
		const started = startDesktopCreateCaseWizard(
			'Create a new case file CID-001-233333444 titled Warehouse Burglary'
		);
		const withDate = advanceDesktopCreateCaseWizard(started.state, '2026-03-20');
		expect(withDate.action).toBe('confirm');
		if (withDate.action !== 'confirm') return;
		const ambiguousA = advanceDesktopCreateCaseWizard(withDate.state, 'okay');
		expect(ambiguousA.action).toBe('confirm');
		const ambiguousB = advanceDesktopCreateCaseWizard(withDate.state, 'sure?');
		expect(ambiguousB.action).toBe('confirm');
	});

	it('accepts only strict affirmative confirmation phrases', () => {
		const started = startDesktopCreateCaseWizard(
			'Create a new case file CID-001-233333444 titled Warehouse Burglary'
		);
		const withDate = advanceDesktopCreateCaseWizard(started.state, '2026-03-20');
		expect(withDate.action).toBe('confirm');
		if (withDate.action !== 'confirm') return;
		for (const phrase of ['yes', 'confirm', 'create it']) {
			const out = advanceDesktopCreateCaseWizard(withDate.state, phrase);
			expect(out.action).toBe('submit');
		}
	});

	it('cancel response uses resolved cancellation wording', () => {
		const started = startDesktopCreateCaseWizard(
			'Create a new case file CID-001-233333444 titled Warehouse Burglary'
		);
		const withDate = advanceDesktopCreateCaseWizard(started.state, '2026-03-20');
		expect(withDate.action).toBe('confirm');
		if (withDate.action !== 'confirm') return;
		const cancelled = advanceDesktopCreateCaseWizard(withDate.state, 'cancel');
		expect(cancelled.action).toBe('cancel');
		if (cancelled.action === 'cancel') {
			expect(cancelled.assistantMessage).toBe('Case creation cancelled.');
		}
	});

	it('requires incident date and captures "today" before confirmation', () => {
		const started = startDesktopCreateCaseWizard(
			'Create a new case file CID-001-233333444 titled Warehouse Burglary'
		);
		expect(started.state.awaiting).toBe('incident_date_required');
		const withDate = advanceDesktopCreateCaseWizard(started.state, 'today');
		expect(withDate.action).toBe('confirm');
		if (withDate.action !== 'confirm') return;
		expect(withDate.state.draft.incident_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		const confirmed = advanceDesktopCreateCaseWizard(withDate.state, 'confirm');
		expect(confirmed.action).toBe('submit');
		if (confirmed.action === 'submit') {
			expect(confirmed.payload.incident_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
	});

	it('does not allow skip for required incident date', () => {
		const started = startDesktopCreateCaseWizard(
			'Create a new case file CID-001-233333444 titled Warehouse Burglary'
		);
		const skipped = advanceDesktopCreateCaseWizard(started.state, 'skip');
		expect(skipped.action).toBe('ask');
		if (skipped.action === 'ask') {
			expect(skipped.assistantMessage).toContain('Incident date is required');
		}
	});
});

describe('intent/refusal helpers', () => {
	it('detects create-case intent phrase', () => {
		expect(detectCreateCaseIntent('Create a new case file CID-001-233333444')).toBe(true);
	});

	it('exports case-chat refusal message', () => {
		expect(CASE_CHAT_CREATE_REFUSAL_MESSAGE).toContain('My Desktop chat');
	});
});

