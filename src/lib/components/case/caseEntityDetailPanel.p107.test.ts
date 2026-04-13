/**
 * P107-05 — Entity detail audit visibility + UI constraint guardrails (static source).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const panelPath = join(here, 'CaseEntityDetailPanel.svelte');
const auditCopyPath = join(here, '../../case/p107CaseEntityAuditCopy.ts');

describe('CaseEntityDetailPanel.svelte (P107-05)', () => {
	const src = readFileSync(panelPath, 'utf8');
	const lower = src.toLowerCase();

	it('exposes read-only audit section wired to Case Engine entity fields (literal reads only)', () => {
		expect(src).toContain('data-testid="case-entity-detail--audit"');
		expect(src).toContain('auditFieldDisplay');
		expect(src).toContain('$lib/case/p107CaseEntityAudit');
		expect(src).toContain('detail.case_entity.created_at');
		expect(src).toContain('detail.case_entity.created_by');
		expect(src).toContain('detail.case_entity.updated_at');
		expect(src).toContain('detail.case_entity.updated_by');
		expect(src).toContain('detail.case_entity.deleted_at');
		expect(src).toContain('detail.case_entity.deleted_by');
		expect(src).toContain('data-testid="case-entity-detail--audit-created-at"');
		expect(src).toContain('data-testid="case-entity-detail--audit-retired-by"');
	});

	it('does not introduce inline fetch or new API routes', () => {
		expect(src).not.toContain('fetch(');
	});

	it('avoids graph, relationship-discovery, and intelligence-like framing in panel source', () => {
		expect(lower).not.toContain('graph');
		expect(lower).not.toContain('related entities');
		expect(lower).not.toContain('relationship');
		expect(lower).not.toContain('cluster');
		expect(lower).not.toContain('rank');
	});
});

describe('p107CaseEntityAuditCopy (P107-05)', () => {
	const src = readFileSync(auditCopyPath, 'utf8');
	const lower = src.toLowerCase();

	it('states read-only literal metadata and supporting-only doctrine', () => {
		expect(src).toContain('P107_AUDIT_SECTION_HEADING');
		expect(src).toContain('Timeline authority');
		expect(lower).not.toContain('graph');
		expect(lower).not.toContain('related entities');
	});
});
