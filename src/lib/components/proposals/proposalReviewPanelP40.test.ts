/**
 * P40-01A — Proposal review panel: truncation banner + document-origin labeling (static source checks).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const panelPath = join(process.cwd(), 'src/lib/components/proposals/ProposalReviewPanel.svelte');

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
