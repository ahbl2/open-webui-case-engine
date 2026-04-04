/**
 * P40-01A — Proposal review panel: truncation banner + document-origin labeling (static source checks).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const panelPath = join(process.cwd(), 'src/lib/components/proposals/ProposalReviewPanel.svelte');
const detTsPath = join(
	process.cwd(),
	'src/lib/components/proposals/DeterministicTimestampCandidatesReview.svelte'
);
const recPath = join(
	process.cwd(),
	'src/lib/components/proposals/OccurredAtTimestampReconciliationReview.svelte'
);
const guidancePath = join(
	process.cwd(),
	'src/lib/components/proposals/OccurredAtGuidanceReview.svelte'
);

describe('ProposalReviewPanel.svelte — P40-01A hardening', () => {
	it('exposes a prominent truncation banner test id and operator-facing partial-file wording', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('data-testid="document-ingest-truncation-banner"');
		expect(src).toContain('Partial file used for these proposals');
		expect(src).toMatch(/later in the (document|file)/i);
		expect(src).toContain('document-ingest-truncation-card-note');
	});

	it('labels case-file document ingest distinctly from chat thread scope', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('data-testid="proposal-origin-case-file"');
		expect(src).toContain('document-ingest-source-footer');
		expect(src).toMatch(/synthetic internal thread/i);
		expect(src).toMatch(/not chat/i);
	});
});

describe('ProposalReviewPanel.svelte — P40-03 chronology confidence', () => {
	it('surfaces low-chronology commit gate, operator confirm, and confidence badge', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('data-testid="timeline-commit-blocked-chronology"');
		expect(src).toContain('data-testid="timeline-low-chronology-operator-panel"');
		expect(src).toContain('data-testid="timeline-low-chronology-confirm-btn"');
		expect(src).toContain('data-testid="timeline-chronology-confidence-badge"');
		expect(src).toMatch(/Chronology responsibility/i);
	});
});

describe('ProposalReviewPanel.svelte — P40-03A semantics', () => {
	it('separates high vs medium chronology copy and approved pre-commit framing', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('data-testid="timeline-chronology-copy-high"');
		expect(src).toContain('data-testid="timeline-chronology-copy-medium"');
		expect(src).toContain('data-testid="timeline-chronology-copy-low"');
		expect(src).toMatch(/Source-explicit/i);
		expect(src).toMatch(/Partly inferred/i);
		expect(src).toContain('data-testid="approved-timeline-precommit-notice"');
		expect(src).toMatch(/controlled pre-commit corrections/i);
		expect(src).toMatch(/Pre-commit correction \(approval stands/i);
	});
});

describe('ProposalReviewPanel.svelte — P40-05G timezone + timeline-aligned editors', () => {
	it('uses datetime-local and shared type select for document-ingest edit (not raw ISO text)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('data-testid="document-ingest-occurred-input"');
		expect(src).toContain('type="datetime-local"');
		expect(src).toContain('data-testid="document-ingest-type-select"');
		expect(src).toContain('TIMELINE_ENTRY_TYPE_VALUES');
		expect(src).toContain('datetimeLocalToIso');
		expect(src).toContain('data-testid="proposal-timeline-occurred-display"');
		expect(src).not.toMatch(/occurred_at \(ISO 8601 with timezone\)/);
	});
});

describe('ProposalReviewPanel.svelte — P41-04 deterministic timestamp candidates', () => {
	it('wires document-ingest payload parsing into the review child component', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('parseDeterministicTimestampCandidatesFromPayload');
		expect(src).toContain('DeterministicTimestampCandidatesReview');
		expect(src).toContain('detTsItems');
		expect(src).toContain('isDocumentTimelineIntakePayload(payload)');
	});

	it('child component carries review-only copy and deterministic candidate test ids', () => {
		const child = readFileSync(detTsPath, 'utf8');
		expect(child).toContain('data-testid="deterministic-timestamp-candidates-section"');
		expect(child).toMatch(/Deterministic time hints/i);
		expect(child).toMatch(/<strong>not<\/strong> the official/);
		expect(child).toContain('data-confidence-category');
		expect(child).toContain('deterministic-candidate-ambiguous-alternates');
	});
});

describe('ProposalReviewPanel.svelte — P41-09 occurred_at_guidance', () => {
	it('wires OccurredAtGuidanceReview for timeline proposals with guidance', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('OccurredAtGuidanceReview');
		expect(src).toContain('occurred_at_guidance');
		const child = readFileSync(guidancePath, 'utf8');
		expect(child).toContain('occurred-at-guidance-review');
		expect(child).toMatch(/Advisory — timestamp guidance/i);
	});
});

describe('ProposalReviewPanel.svelte — P41-05 reconciliation surfacing', () => {
	it('wires OccurredAtTimestampReconciliationReview for timeline proposals', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('OccurredAtTimestampReconciliationReview');
		expect(src).toContain('occurred_at_timestamp_reconciliation');
	});

	it('reconciliation child is review-only and exposes test ids', () => {
		const child = readFileSync(recPath, 'utf8');
		expect(child).toContain('data-testid="occurred-at-timestamp-reconciliation"');
		expect(child).toContain('data-testid="reconciliation-state-badge"');
		expect(child).toContain('data-testid="reconciliation-operational-context"');
		expect(child).toMatch(/Informational only/i);
		expect(child).toMatch(/America\/New_York/i);
		expect(child).not.toMatch(/apply this timestamp/i);
	});
});
