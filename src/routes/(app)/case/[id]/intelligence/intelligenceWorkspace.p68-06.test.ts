/**
 * P68-06 — Stage 1 repositioned as proposal/intake; registries + Add remain primary for manual register.
 * P69-07 — intake lives in EntitiesIntakeSubordinate inside EntitiesOverviewBoardShell.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const pageSource = readFileSync(join(__dirname, '+page.svelte'), 'utf8');
const shellSource = readFileSync(
	join(__dirname, '..', '..', '..', '..', '..', 'lib', 'components', 'case', 'EntitiesOverviewBoardShell.svelte'),
	'utf8'
);

describe('intelligence/+page Stage 1 repositioning (P68-06 / P69-07)', () => {
	it('board shell embeds Stage 1 + Stage 2 under subordinate intake', () => {
		expect(shellSource).toContain('EntitiesIntakeSubordinate');
		expect(shellSource).toContain('<CaseIntelligenceStage1Panel {caseId} {token} />');
		expect(shellSource).toContain('<CaseIntelligenceAssociationsPanel {caseId} {token} />');
		expect(shellSource).toContain('data-testid="entities-intake-panels"');
	});

	it('page keeps Register vs staging guidance', () => {
		expect(pageSource).toContain('data-testid="intelligence-entities-workflow-path"');
		expect(pageSource).toContain('Staging');
		expect(pageSource).toContain('handleIntelCreateRequest');
		expect(pageSource).toContain('Register');
	});

	it('does not present Stage 1 as the default create-or-commit path in pilot intro', () => {
		expect(pageSource).not.toContain('Use Stage&nbsp;1 to create or commit');
	});

	it('P68-05 direct-create success path unchanged', () => {
		expect(pageSource).toContain('data-testid="intelligence-direct-create-success"');
		expect(pageSource).toContain('entityRegistryRefreshNonce += 1');
	});

	it('P19 proposals stay clearly separate (governed tab, not staging)', () => {
		expect(pageSource).toContain('P19');
		expect(pageSource).toContain('Proposals');
	});
});
