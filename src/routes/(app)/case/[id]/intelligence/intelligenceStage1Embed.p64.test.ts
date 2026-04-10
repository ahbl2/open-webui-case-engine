/**
 * P64-10 — Intelligence route embeds Stage 1 pilot panel.
 * P69-07 — embed is via EntitiesOverviewBoardShell (intake subordinate).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const shellSource = readFileSync(
	join(__dirname, '..', '..', '..', '..', '..', 'lib', 'components', 'case', 'EntitiesOverviewBoardShell.svelte'),
	'utf8'
);

describe('intelligence Stage 1 embed (P64 / P69-07)', () => {
	it('board shell imports and renders CaseIntelligenceStage1Panel with case id and token', () => {
		expect(shellSource).toContain(
			"import CaseIntelligenceStage1Panel from '$lib/components/case/CaseIntelligenceStage1Panel.svelte'"
		);
		expect(shellSource).toContain('<CaseIntelligenceStage1Panel {caseId} {token} />');
	});
});
