import { describe, expect, it } from 'vitest';
import type { CaseEngineCaseEntity } from '$lib/apis/caseEngine/caseEntitiesApi';
import {
	filterEntitiesForOrganization,
	groupByEntityTypePreservingOrder,
	uniqueSortedEntityTypes
} from './p107CaseEntityOrganization';

function e(
	id: string,
	type: string,
	label: string,
	deleted: boolean | null = null
): CaseEngineCaseEntity {
	return {
		id,
		case_id: 'c1',
		entity_type: type,
		display_label: label,
		attributes: {},
		created_at: '2020-01-01T00:00:00.000Z',
		created_by: 'u',
		updated_at: '2020-01-01T00:00:00.000Z',
		updated_by: null,
		deleted_at: deleted ? '2020-01-02T00:00:00.000Z' : null,
		deleted_by: deleted ? 'u' : null
	};
}

describe('p107CaseEntityOrganization', () => {
	it('uniqueSortedEntityTypes returns sorted distinct types', () => {
		const types = uniqueSortedEntityTypes([e('1', 'b', 'x'), e('2', 'a', 'y'), e('3', 'b', 'z')]);
		expect(types).toEqual(['a', 'b']);
	});

	it('filterEntitiesForOrganization filters by type and label substring', () => {
		const rows = [e('1', 'person', 'Alice'), e('2', 'org', 'Bob')];
		expect(filterEntitiesForOrganization(rows, { entityType: '', labelSubstring: '' })).toHaveLength(2);
		expect(filterEntitiesForOrganization(rows, { entityType: 'person', labelSubstring: '' })).toEqual([rows[0]]);
		expect(filterEntitiesForOrganization(rows, { entityType: '', labelSubstring: 'bob' })).toEqual([rows[1]]);
	});

	it('groupByEntityTypePreservingOrder keeps server order within groups and sorts group keys', () => {
		const rows = [e('1', 'b', 'x'), e('2', 'a', 'y'), e('3', 'b', 'z')];
		const g = groupByEntityTypePreservingOrder(rows);
		expect(g.map((x) => x.groupKey)).toEqual(['a', 'b']);
		expect(g[0].items.map((x) => x.id)).toEqual(['2']);
		expect(g[1].items.map((x) => x.id)).toEqual(['1', '3']);
	});
});
