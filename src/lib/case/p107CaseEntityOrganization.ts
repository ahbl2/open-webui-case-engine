/**
 * P107-04 — Deterministic client-side organization for entity list reads (no ranking; server order preserved within buckets).
 */
import type { CaseEngineCaseEntity } from '$lib/apis/caseEngine/caseEntitiesApi';

/** Distinct `entity_type` values, sorted lexically for stable UI (group headers / filter dropdown). */
export function uniqueSortedEntityTypes(entities: readonly CaseEngineCaseEntity[]): string[] {
	const s = new Set<string>();
	for (const e of entities) {
		s.add(e.entity_type);
	}
	return [...s].sort((a, b) => a.localeCompare(b));
}

export interface OrganizationFilterInput {
	/** Empty string = all types. */
	entityType: string;
	/** Case-insensitive substring on `display_label`; empty = no filter. */
	labelSubstring: string;
}

export function filterEntitiesForOrganization(
	entities: readonly CaseEngineCaseEntity[],
	input: OrganizationFilterInput
): CaseEngineCaseEntity[] {
	const et = String(input.entityType ?? '').trim();
	const lq = String(input.labelSubstring ?? '').trim().toLowerCase();
	const out: CaseEngineCaseEntity[] = [];
	for (const e of entities) {
		if (et && e.entity_type !== et) continue;
		if (lq && !String(e.display_label ?? '').toLowerCase().includes(lq)) continue;
		out.push(e);
	}
	return out;
}

export interface EntityTypeGroup {
	groupKey: string;
	items: CaseEngineCaseEntity[];
}

/**
 * Group by literal `entity_type`. Order within each group follows **input array order** (Case Engine list order).
 * Group keys are emitted in **lexical** order of `entity_type`.
 */
export function groupByEntityTypePreservingOrder(ordered: readonly CaseEngineCaseEntity[]): EntityTypeGroup[] {
	const map = new Map<string, CaseEngineCaseEntity[]>();
	for (const e of ordered) {
		const k = e.entity_type;
		let arr = map.get(k);
		if (!arr) {
			arr = [];
			map.set(k, arr);
		}
		arr.push(e);
	}
	const keys = [...map.keys()].sort((a, b) => a.localeCompare(b));
	return keys.map((groupKey) => ({ groupKey, items: map.get(groupKey)! }));
}
