/**
 * P13-07: EntityWorkspace helper tests.
 * Verifies basic display label behavior used for entity header.
 */
import { describe, it, expect } from 'vitest';
import * as EntityModule from './EntityWorkspace.svelte';

describe('EntityWorkspace helpers', () => {
	it('displayLabel combines type and id safely', () => {
		const fn = (EntityModule as any).displayLabel as (t: string, id: string) => string;
		expect(fn('phone', '5025551234')).toBe('phone – 5025551234');
		expect(fn('person', 'JOHN_DOE')).toBe('person – JOHN_DOE');
	});
});

