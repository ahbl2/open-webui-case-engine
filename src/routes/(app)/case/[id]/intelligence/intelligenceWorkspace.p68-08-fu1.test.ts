/**
 * P68-08-FU1 — Direct-create Add buttons: callback props from registry to page (Svelte 5).
 * P69-07 — wiring consolidated through EntitiesOverviewBoardShell + EntitiesRegistryPanel.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const pageSource = readFileSync(join(__dirname, '+page.svelte'), 'utf8');
const registrySource = readFileSync(
	join(__dirname, '..', '..', '..', '..', '..', 'lib', 'components', 'case', 'EntitiesRegistryPanel.svelte'),
	'utf8'
);

describe('P68-08-FU1 intelligence direct-create wiring (P69-07 shell)', () => {
	it('page passes handleIntelCreateRequest to board shell as onAddRequest', () => {
		expect(pageSource).toContain('onAddRequest={handleIntelCreateRequest}');
		expect(pageSource).not.toContain('on:createRequest');
		expect(pageSource).not.toContain('on:select');
	});

	it('handleIntelCreateRequest takes detail object (not CustomEvent)', () => {
		expect(pageSource).toContain(
			'function handleIntelCreateRequest(detail: { entityKind: CaseIntelligenceEntityKind }): void {'
		);
		expect(pageSource).toContain('createModalKind = detail.entityKind;');
		expect(pageSource).toContain('createModalOpen = true;');
		expect(pageSource).not.toContain('e.detail.entityKind');
	});

	it('create modal still receives open + entityKind from page state (P68-05 success path intact)', () => {
		expect(pageSource).toContain('open={createModalOpen}');
		expect(pageSource).toContain('entityKind={createModalKind}');
		expect(pageSource).toContain('on:created={handleIntelDirectEntityCreated}');
	});

	it('EntitiesRegistryPanel invokes onAddRequest from direct create (header + empty-add)', () => {
		expect(registrySource).toContain('function requestDirectCreate(): void {');
		expect(registrySource).toContain('onAddRequest?.({ entityKind: apiKind })');
		expect(registrySource).toContain('data-testid="{testId}-add"');
		expect(registrySource).toContain('data-testid="{testId}-empty-add"');
		expect(registrySource.match(/on:click=\{requestDirectCreate\}/g)?.length).toBe(2);
	});
});
