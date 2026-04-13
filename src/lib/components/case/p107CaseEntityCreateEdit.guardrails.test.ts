/**
 * P107-01 — Create/edit entity UI guardrails (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const listPanelPath = join(here, 'CaseEntitiesPanel.svelte');
const detailPanelPath = join(here, 'CaseEntityDetailPanel.svelte');
const formPath = join(here, 'CaseEntityMutateForm.svelte');
const copyPath = join(here, '../../case/p107CaseEntityCreateEditCopy.ts');
const validationPath = join(here, '../../case/p107CaseEntityFormValidation.ts');

describe('CaseEntitiesPanel.svelte (P107-01)', () => {
	const src = readFileSync(listPanelPath, 'utf8');

	it('exposes create entry point and mounts mutate form (mutations live in CaseEntityMutateForm; no inline fetch)', () => {
		expect(src).toContain('data-testid="case-entities-panel--create-open"');
		expect(src).toContain('CaseEntityMutateForm');
		expect(src).toContain('$lib/apis/caseEngine/caseEntitiesApi');
		expect(src).not.toContain('fetch(');
	});

	it('does not add retire/restore or evidence-link routes', () => {
		expect(src).not.toContain('/case-entities/retire');
		expect(src).not.toContain('/case-entities/restore');
		expect(src).not.toContain('evidence-links');
	});

	it('remains case-scoped for navigation after create', () => {
		expect(src).toContain('$app/navigation');
		expect(src).toContain('/entities/');
	});
});

describe('CaseEntityDetailPanel.svelte (P107-01)', () => {
	const src = readFileSync(detailPanelPath, 'utf8');

	it('exposes edit entry point and uses API module for mutations (no inline fetch)', () => {
		expect(src).toContain('data-testid="case-entity-detail--edit-open"');
		expect(src).toContain('CaseEntityMutateForm');
		expect(src).not.toContain('fetch(');
	});

	it('does not add evidence-link POST/remove controls in this ticket scope', () => {
		expect(src).not.toContain('/evidence-links');
		// P107-02: entity lifecycle uses retire/restore in the API module, not evidence-links.
	});
});

describe('CaseEntityMutateForm.svelte (P107-01)', () => {
	const src = readFileSync(formPath, 'utf8');

	it('calls createCaseEntity and patchCaseEntity with explicit submit only', () => {
		expect(src).toContain('createCaseEntity');
		expect(src).toContain('patchCaseEntity');
		expect(src).toContain('data-testid="case-entity-form--submit"');
		expect(src).toContain('autocomplete="off"');
	});

	it('uses validation module for literal checks (no suggestion hooks)', () => {
		expect(src).toContain('p107CaseEntityFormValidation');
		expect(src).not.toMatch(/\bsuggest/i);
		expect(src).not.toMatch(/\bAI\b/i);
	});

	it('exposes form field test ids for create/edit coverage', () => {
		expect(src).toContain('data-testid="case-entity-form--entity-type"');
		expect(src).toContain('data-testid="case-entity-form--display-label"');
		expect(src).toContain('data-testid="case-entity-form--attributes-json"');
		expect(src).toContain('data-testid="case-entity-form--error"');
	});
});

describe('p107CaseEntityCreateEditCopy (P107-01)', () => {
	const src = readFileSync(copyPath, 'utf8');
	const lower = src.toLowerCase();

	it('avoids inference, graph, related-entity, and intelligence framing', () => {
		expect(lower).not.toContain('related entities');
		expect(lower).not.toContain('graph');
		expect(lower).not.toContain('intelligence');
		expect(lower).not.toContain('inference');
		expect(lower).not.toContain('suggest');
	});
});

describe('p107CaseEntityFormValidation.ts (P107-01)', () => {
	const src = readFileSync(validationPath, 'utf8');

	it('mirrors Phase 105 reserved entity_type prefixes', () => {
		expect(src).toContain("'case_intelligence'");
		expect(src).toContain("'cross_case'");
	});
});
