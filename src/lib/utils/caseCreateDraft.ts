import { createCase, type CaseEngineCase } from '$lib/apis/caseEngine';

export type CaseCreateUnit = 'CID' | 'SIU';
export type CaseCreateMissingField = 'unit' | 'case_number' | 'title';

export type CaseCreateDraft = {
	unit: string;
	case_number: string;
	title: string;
	incident_date: string;
};

export type NormalizedCaseCreateDraft = {
	unit: CaseCreateUnit;
	case_number: string;
	title: string;
	status: 'OPEN';
	incident_date: string;
};

export const CASE_CHAT_CREATE_REFUSAL_MESSAGE =
	'I can help draft case details, but new cases must be created from My Desktop chat or the Cases page.';

export const CASE_CREATE_UNSUPPORTED_FROM_CHAT_MESSAGE =
	'I can help draft the case details, but I cannot create a new case from chat yet. Please use the Cases page to create the case.';

export type DesktopCreateCaseWizardState = {
	active: boolean;
	awaiting: CaseCreateMissingField | 'incident_date_required' | 'confirm';
	draft: CaseCreateDraft;
};

export function detectCreateCaseIntent(text: string): boolean {
	const q = String(text ?? '').toLowerCase();
	return /\b(create|open|start)\b/.test(q) && /\b(case|case file)\b/.test(q);
}

export function normalizeCaseNumber(input: string): string {
	return String(input ?? '').trim().toUpperCase();
}

export function normalizeIncidentDate(input: string): string {
	return String(input ?? '').trim();
}

function formatDateLocalYYYYMMDD(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function normalizeIncidentDateInput(input: string, now: Date = new Date()): string | null {
	const value = normalizeIncidentDate(input).toLowerCase();
	if (!value) return null;
	if (value === 'today') return formatDateLocalYYYYMMDD(now);
	if (!isValidIncidentDate(value)) return null;
	return value;
}

export function isValidIncidentDate(input: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
	const [yearRaw, monthRaw, dayRaw] = input.split('-');
	const year = Number(yearRaw);
	const month = Number(monthRaw);
	const day = Number(dayRaw);
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
	if (month < 1 || month > 12 || day < 1 || day > 31) return false;
	const dt = new Date(Date.UTC(year, month - 1, day));
	return (
		dt.getUTCFullYear() === year &&
		dt.getUTCMonth() === month - 1 &&
		dt.getUTCDate() === day
	);
}

export function normalizeCaseCreateDraft(input: Partial<CaseCreateDraft>): {
	unit: string;
	case_number: string;
	title: string;
	status: 'OPEN';
	incident_date: string;
} {
	const normalizedIncidentDate = normalizeIncidentDate(String(input.incident_date ?? ''));
	return {
		unit: String(input.unit ?? '').trim().toUpperCase(),
		case_number: normalizeCaseNumber(String(input.case_number ?? '')),
		title: String(input.title ?? '').trim(),
		status: 'OPEN',
		incident_date: normalizedIncidentDate
	};
}

export function validateCaseCreateDraft(input: Partial<CaseCreateDraft>): {
	valid: boolean;
	errors: Record<CaseCreateMissingField, string>;
	missing: CaseCreateMissingField[];
	incident_date_error: string;
	normalized: ReturnType<typeof normalizeCaseCreateDraft>;
} {
	const normalized = normalizeCaseCreateDraft(input);
	const errors: Record<CaseCreateMissingField, string> = {
		unit: '',
		case_number: '',
		title: ''
	};
	const missing: CaseCreateMissingField[] = [];
	let incident_date_error = '';

	if (normalized.unit !== 'CID' && normalized.unit !== 'SIU') {
		errors.unit = 'Unit must be CID or SIU.';
		missing.push('unit');
	}
	if (!normalized.case_number) {
		errors.case_number = 'Case number is required.';
		missing.push('case_number');
	}
	if (!normalized.title) {
		errors.title = 'Title is required.';
		missing.push('title');
	}
	if (!normalized.incident_date) {
		incident_date_error = 'Incident date is required.';
	} else if (!isValidIncidentDate(normalized.incident_date)) {
		incident_date_error = 'Incident date must use YYYY-MM-DD.';
	}

	return {
		valid: missing.length === 0 && !incident_date_error,
		errors,
		missing,
		incident_date_error,
		normalized
	};
}

export function mergeCaseCreateDraft(
	base: CaseCreateDraft,
	patch: Partial<CaseCreateDraft>
): CaseCreateDraft {
	const merged = {
		unit: patch.unit ?? base.unit,
		case_number: patch.case_number ?? base.case_number,
		title: patch.title ?? base.title,
		incident_date: patch.incident_date ?? base.incident_date
	};
	return {
		unit: String(merged.unit ?? ''),
		case_number: String(merged.case_number ?? ''),
		title: String(merged.title ?? ''),
		incident_date: String(merged.incident_date ?? '')
	};
}

export function parseCaseCreateHints(
	text: string,
	awaiting?: CaseCreateMissingField | 'incident_date_required' | 'confirm'
): Partial<CaseCreateDraft> {
	const raw = String(text ?? '').trim();
	const lower = raw.toLowerCase();
	const patch: Partial<CaseCreateDraft> = {};

	if (/\bcid\b/.test(lower) && !/\bsiu\b/.test(lower)) patch.unit = 'CID';
	if (/\bsiu\b/.test(lower) && !/\bcid\b/.test(lower)) patch.unit = 'SIU';

	const explicitNumber =
		raw.match(/\bcase(?:\s+file|\s+number)?\s*(?:is|=|:)?\s*([A-Za-z-]*\d[A-Za-z0-9-]*)\b/i)?.[1] ??
		raw.match(/\b([A-Za-z]{2,8}-\d[A-Za-z0-9-]*)\b/)?.[1];
	if (explicitNumber) patch.case_number = explicitNumber;

	const explicitTitle =
		raw.match(/\btitle\s*(?:is|=|:)\s*(.+)$/i)?.[1] ??
		raw.match(/\btitled\s+(.+)$/i)?.[1] ??
		raw.match(/\bnamed\s+(.+)$/i)?.[1];
	if (explicitTitle) patch.title = explicitTitle.trim();

	const explicitIncidentDateRaw =
		raw.match(/\bincident(?:\s+date)?\s*(?:is|=|:)?\s*(\d{4}-\d{2}-\d{2})\b/i)?.[1] ??
		raw.match(/\bdate\s*(?:is|=|:)?\s*(\d{4}-\d{2}-\d{2}|today)\b/i)?.[1];
	const explicitIncidentDate = explicitIncidentDateRaw
		? normalizeIncidentDateInput(explicitIncidentDateRaw)
		: null;
	if (explicitIncidentDate) patch.incident_date = explicitIncidentDate;

	if (awaiting === 'title' && !patch.title && raw.length > 0) {
		patch.title = raw;
	}
	if (awaiting === 'case_number' && !patch.case_number && raw.length > 0) {
		patch.case_number = raw.split(/\s+/)[0];
	}
	if (awaiting === 'unit' && !patch.unit) {
		if (/^cid$/i.test(raw)) patch.unit = 'CID';
		if (/^siu$/i.test(raw)) patch.unit = 'SIU';
	}
	if (awaiting === 'incident_date_required' && !patch.incident_date) {
		const normalized = normalizeIncidentDateInput(raw);
		if (normalized) patch.incident_date = normalized;
	}

	return patch;
}

export function isCreateCaseConfirm(text: string): boolean {
	return /^(yes|confirm|create it)$/i.test(String(text ?? '').trim());
}

export function isCreateCaseCancel(text: string): boolean {
	return /^(no|n|cancel|stop|nevermind|never mind|abort)$/i.test(String(text ?? '').trim());
}

export function buildCreateCaseConfirmMessage(draft: Partial<CaseCreateDraft>): string {
	const normalized = normalizeCaseCreateDraft(draft);
	return [
		'Please confirm case creation:',
		`- Unit: ${normalized.unit || '(missing)'}`,
		`- Case number: ${normalized.case_number || '(missing)'}`,
		`- Title: ${normalized.title || '(missing)'}`,
		...(normalized.incident_date ? [`- Incident date: ${normalized.incident_date}`] : []),
		'- Status: OPEN',
		'Create this case now? Reply with "yes" to confirm or "no" to cancel.'
	].join('\n');
}

export function buildCreateCaseMissingFieldPrompt(field: CaseCreateMissingField): string {
	if (field === 'unit') return 'Is this a CID or SIU case?';
	if (field === 'case_number') return 'What is the case number?';
	return 'What should the case title be?';
}

export function buildCreateCaseIncidentDatePrompt(): string {
	return 'What is the incident date? Use YYYY-MM-DD, or type today to use today\'s date.';
}

export function startDesktopCreateCaseWizard(
	initialText: string
): { state: DesktopCreateCaseWizardState; assistantMessage: string } {
	const draft = mergeCaseCreateDraft(
		{ unit: '', case_number: '', title: '', incident_date: '' },
		parseCaseCreateHints(initialText)
	);
	const checked = validateCaseCreateDraft(draft);
	if (checked.valid) {
		return {
			state: { active: true, awaiting: 'confirm', draft },
			assistantMessage: buildCreateCaseConfirmMessage(draft)
		};
	}
	if (checked.incident_date_error && checked.missing.length === 0) {
		return {
			state: { active: true, awaiting: 'incident_date_required', draft },
			assistantMessage:
				checked.incident_date_error === 'Incident date is required.'
					? buildCreateCaseIncidentDatePrompt()
					: 'Incident date must use YYYY-MM-DD, or type today.'
		};
	}
	const missing = checked.missing[0];
	return {
		state: { active: true, awaiting: missing, draft },
		assistantMessage: buildCreateCaseMissingFieldPrompt(missing)
	};
}

export function advanceDesktopCreateCaseWizard(
	state: DesktopCreateCaseWizardState,
	userText: string
):
	| { action: 'ask'; state: DesktopCreateCaseWizardState; assistantMessage: string }
	| { action: 'confirm'; state: DesktopCreateCaseWizardState; assistantMessage: string }
	| { action: 'cancel'; assistantMessage: string }
	| { action: 'submit'; payload: NormalizedCaseCreateDraft } {
	if (state.awaiting === 'confirm') {
		if (isCreateCaseCancel(userText)) {
			return { action: 'cancel', assistantMessage: 'Case creation cancelled.' };
		}
		if (!isCreateCaseConfirm(userText)) {
			return {
				action: 'confirm',
				state,
				assistantMessage: buildCreateCaseConfirmMessage(state.draft)
			};
		}
		const checked = validateCaseCreateDraft(state.draft);
		if (!checked.valid) {
			if (checked.incident_date_error && checked.missing.length === 0) {
				return {
					action: 'ask',
					state: { active: true, awaiting: 'incident_date_required', draft: state.draft },
					assistantMessage:
						checked.incident_date_error === 'Incident date is required.'
							? buildCreateCaseIncidentDatePrompt()
							: 'Incident date must use YYYY-MM-DD, or type today.'
				};
			}
			const missing = checked.missing[0];
			return {
				action: 'ask',
				state: { active: true, awaiting: missing, draft: state.draft },
				assistantMessage: buildCreateCaseMissingFieldPrompt(missing)
			};
		}
		return { action: 'submit', payload: checked.normalized as NormalizedCaseCreateDraft };
	}
	if (state.awaiting === 'incident_date_required') {
		const raw = String(userText ?? '').trim();
		const patch = parseCaseCreateHints(userText, 'incident_date_required');
		const draft = mergeCaseCreateDraft(state.draft, patch);
		const checked = validateCaseCreateDraft(draft);
		if (checked.incident_date_error) {
			return {
				action: 'ask',
				state: { active: true, awaiting: 'incident_date_required', draft: state.draft },
				assistantMessage:
					'Incident date is required. Use YYYY-MM-DD, or type today.'
			};
		}
		const nextState: DesktopCreateCaseWizardState = { active: true, awaiting: 'confirm', draft };
		return {
			action: 'confirm',
			state: nextState,
			assistantMessage: buildCreateCaseConfirmMessage(draft)
		};
	}

	const patch = parseCaseCreateHints(userText, state.awaiting);
	const draft = mergeCaseCreateDraft(state.draft, patch);
	const checked = validateCaseCreateDraft(draft);
	if (checked.valid) {
		const nextState: DesktopCreateCaseWizardState = { active: true, awaiting: 'confirm', draft };
		return {
			action: 'confirm',
			state: nextState,
			assistantMessage: buildCreateCaseConfirmMessage(draft)
		};
	}
	if (checked.incident_date_error && checked.missing.length === 0) {
		return {
			action: 'ask',
			state: { active: true, awaiting: 'incident_date_required', draft },
			assistantMessage:
				checked.incident_date_error === 'Incident date is required.'
					? buildCreateCaseIncidentDatePrompt()
					: 'Incident date must use YYYY-MM-DD, or type today.'
		};
	}
	const missing = checked.missing[0];
	return {
		action: 'ask',
		state: { active: true, awaiting: missing, draft },
		assistantMessage: buildCreateCaseMissingFieldPrompt(missing)
	};
}

export async function createCaseFromDraft(
	token: string,
	draft: Partial<CaseCreateDraft>
): Promise<CaseEngineCase> {
	const checked = validateCaseCreateDraft(draft);
	if (!checked.valid) {
		throw new Error(
			checked.errors[checked.missing[0]] ||
				checked.incident_date_error ||
				'Invalid case details.'
		);
	}
	return createCase(token, checked.normalized);
}

