/**
 * P64-10 — Stage 1 pilot panel: explicit staging vs committed labeling (source contract).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'CaseIntelligenceStage1Panel.svelte'), 'utf8');

describe('CaseIntelligenceStage1Panel (P64-10)', () => {
	it('exposes distinct test ids for committed vs staging sections', () => {
		expect(source).toContain('data-testid="case-intel-stage1-committed-section"');
		expect(source).toContain('data-testid="case-intel-stage1-staging-section"');
		expect(source).toContain('data-case-intel-authority="authoritative_case_intel"');
		expect(source).toContain('data-case-intel-authority="non_authoritative"');
	});

	it('reinforces non-authoritative staging copy and committed mirror framing (P68-07)', () => {
		expect(source).toContain('not authoritative');
		expect(source).toContain('Committed mirror — retire / restore');
		expect(source).toContain('case-intel-stage1-committed-mirror-help');
		expect(source).toContain('Promote to committed');
	});

	it('P68-06: staging create affordance is propose-first, not parallel committed register', () => {
		expect(source).toContain('Propose in staging');
		expect(source).not.toContain('Create staging record');
		expect(source).toContain('case-intel-stage1-proposal-framing');
	});

	it('wires action test ids for happy-path controls', () => {
		expect(source).toContain('data-testid="case-intel-create-submit"');
		expect(source).toContain('case-intel-staging-commit-');
		expect(source).toContain('case-intel-staging-reject-');
		expect(source).toContain('case-intel-retire-');
		expect(source).toContain('case-intel-restore-');
	});

	it('exposes scroll anchor for P67-05 Add-affordance handoff', () => {
		expect(source).toContain('id="case-intel-stage1-pilot-anchor"');
	});
});
