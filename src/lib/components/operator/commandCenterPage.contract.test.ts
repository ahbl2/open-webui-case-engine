/**
 * P131-01 — UI contract: framing + placeholders (source-level).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const panelPath = join(dirname(fileURLToPath(import.meta.url)), 'CommandCenterPanel.svelte');
const pagePath = join(dirname(fileURLToPath(import.meta.url)), '../../../routes/(app)/command-center/+page.svelte');

describe('Command Center P131-01 UI contract', () => {
	it('panel exposes framing and placeholder testids', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toContain('data-testid="command-center-framing"');
		expect(src).toContain('data-testid="command-center-placeholder-case-list"');
		expect(src).toContain('data-testid="command-center-placeholder-activity"');
		expect(src).toContain('data-testid="command-center-placeholder-workflow"');
		expect(src).toContain('P131_COMMAND_CENTER_CORE_PRINCIPLE');
	});

	it('route page mounts CommandCenterPanel only', () => {
		const src = readFileSync(pagePath, 'utf8');
		expect(src).toContain('CommandCenterPanel');
		expect(src).toContain('data-testid="command-center-page"');
	});
});
