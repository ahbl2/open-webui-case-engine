/**
 * P108-04 — Stable `entityLens` banner test ids (timeline + files surfaces).
 */
import { describe, expect, it } from 'vitest';

import { p108EntityLensBannerTestIds } from './p108EntityLensViewState';

describe('p108EntityLensViewState', () => {
	it('maps timeline and files surfaces to distinct stable test ids', () => {
		expect(p108EntityLensBannerTestIds('timeline')).toEqual({
			banner: 'case-timeline-entity-lens-banner',
			returnToEntity: 'case-timeline-entity-lens-return-to-entity',
			clear: 'case-timeline-entity-lens-clear'
		});
		expect(p108EntityLensBannerTestIds('files')).toEqual({
			banner: 'case-files-entity-lens-banner',
			returnToEntity: 'case-files-entity-lens-return-to-entity',
			clear: 'case-files-entity-lens-clear'
		});
	});
});
