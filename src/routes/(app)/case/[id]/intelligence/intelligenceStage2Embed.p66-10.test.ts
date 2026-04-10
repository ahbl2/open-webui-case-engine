/**
 * P66-10 — intelligence page embeds Stage 2 associations panel.
 * P69-07 — embed is inside EntitiesOverviewBoardShell intake strip.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const shellSource = readFileSync(
	join(__dirname, '../../../../../lib/components/case/EntitiesOverviewBoardShell.svelte'),
	'utf8'
);
const assocPanelSource = readFileSync(
	join(__dirname, '../../../../../lib/components/case/CaseIntelligenceAssociationsPanel.svelte'),
	'utf8'
);

describe('intelligence Stage 2 associations embed', () => {
	it('board shell imports and renders CaseIntelligenceAssociationsPanel with case id and token', () => {
		expect(shellSource).toContain(
			"import CaseIntelligenceAssociationsPanel from '$lib/components/case/CaseIntelligenceAssociationsPanel.svelte'"
		);
		expect(shellSource).toContain('<CaseIntelligenceAssociationsPanel {caseId} {token} />');
	});

	it('Stage 2 panel exposes scroll anchor for entity detail handoff (P67-06)', () => {
		expect(assocPanelSource).toContain('id="case-intel-stage2-pilot-anchor"');
	});
});
