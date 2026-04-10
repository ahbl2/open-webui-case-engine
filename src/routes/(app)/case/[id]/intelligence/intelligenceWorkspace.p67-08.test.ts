/**
 * P67-08 — Intelligence sub-workspace: structured sections, framing, testids (source contract).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const pageSource = readFileSync(join(__dirname, '+page.svelte'), 'utf8');

describe('intelligence/+page Intelligence mode workspace (P67-08)', () => {
	it('wraps Intelligence mode in a panel testid and section landmarks', () => {
		expect(pageSource).toContain('data-testid="intelligence-workspace-intelligence-panel"');
		expect(pageSource).toContain('data-testid="intelligence-ws-framing"');
		expect(pageSource).toContain('data-testid="intelligence-ws-signals"');
		expect(pageSource).toContain('data-testid="intelligence-ws-retrieval"');
		expect(pageSource).toContain('data-testid="intelligence-ws-ask-search"');
		expect(pageSource).toContain('data-testid="intelligence-ws-structured-queries"');
		expect(pageSource).toContain('data-testid="intelligence-ws-results-intro"');
	});

	it('preserves alerts section testid and entities panel isolation', () => {
		expect(pageSource).toContain('data-testid="intelligence-alerts-section"');
		expect(pageSource).toContain('data-testid="intelligence-workspace-entities-panel"');
		expect(pageSource).toContain("{#if workspaceMode === 'entities'}");
	});

	it('framing copy distinguishes Entities authority vs Intelligence support', () => {
		expect(pageSource).toContain('Intelligence mode — analysis');
		expect(pageSource).toContain('non-authoritative support');
		expect(pageSource).toContain('registries first, then Stage&nbsp;1 staging');
		expect(pageSource).toContain('/proposals');
	});
});
