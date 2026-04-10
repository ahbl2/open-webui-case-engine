import { describe, it, expect } from 'vitest';
import {
	canonicalizeAssociatedWithEndpoints,
	parsePlainObjectJson
} from './caseIntelligenceAssociationStagingDraft';

describe('caseIntelligenceAssociationStagingDraft', () => {
	it('canonicalizeAssociatedWithEndpoints orders lexicographically', () => {
		expect(canonicalizeAssociatedWithEndpoints('b', 'a').endpoint_a_entity_id).toBe('a');
		expect(canonicalizeAssociatedWithEndpoints('a', 'b').endpoint_a_entity_id).toBe('a');
	});

	it('parsePlainObjectJson rejects non-objects', () => {
		expect(() => parsePlainObjectJson('[]', 'attrs')).toThrow(/JSON object/);
	});
});
