import type { IntelSearchResult, SearchResultItem } from '$lib/apis/caseEngine';

export interface IntelligenceEvidenceItem {
	id: string;
	caseId: string;
	caseNumber: string;
	caseTitle: string;
	unit: string;
	sourceType: 'timeline' | 'file' | 'entity' | 'record';
	sourceKind: string;
	entityType?: string;
	entityValue?: string;
	entityNormalized?: string;
	excerpt: string;
	timestamp?: string;
	label: string;
}

export interface IntelligenceEvidenceTypeGroup {
	type: IntelligenceEvidenceItem['sourceType'];
	label: string;
	items: IntelligenceEvidenceItem[];
}

export interface IntelligenceEvidenceCaseGroup {
	caseId: string;
	caseNumber: string;
	caseTitle: string;
	unit: string;
	matchCount: number;
	typeGroups: IntelligenceEvidenceTypeGroup[];
}

function parseTime(value?: string): number | null {
	if (!value || !value.trim()) return null;
	const t = Date.parse(value);
	return Number.isFinite(t) ? t : null;
}

function rankTimestampDesc(a?: string, b?: string): number {
	const ta = parseTime(a);
	const tb = parseTime(b);
	if (ta == null && tb == null) return 0;
	if (ta == null) return 1;
	if (tb == null) return -1;
	return tb - ta;
}

function sourceTypeLabel(type: IntelligenceEvidenceItem['sourceType']): string {
	if (type === 'timeline') return 'Timeline';
	if (type === 'file') return 'File';
	if (type === 'entity') return 'Entity';
	return 'Record';
}

function sourceTypeOrder(type: IntelligenceEvidenceItem['sourceType']): number {
	if (type === 'timeline') return 0;
	if (type === 'file') return 1;
	if (type === 'entity') return 2;
	return 3;
}

export function mapIntelResultToEvidenceItem(row: IntelSearchResult): IntelligenceEvidenceItem {
	const sourceType: IntelligenceEvidenceItem['sourceType'] =
		row.source.kind === 'timeline_entry'
			? 'timeline'
			: row.source.kind === 'file_excerpt'
				? 'file'
				: row.source.kind === 'graph_entity'
					? 'entity'
					: 'record';
	return {
		id: row.source.id,
		caseId: row.case.id,
		caseNumber: row.case.case_number,
		caseTitle: row.case.title,
		unit: row.case.unit,
		sourceType,
		sourceKind: row.source.kind,
		entityType: row.source.entity_type,
		entityValue: row.source.value,
		entityNormalized: row.source.normalized_value,
		excerpt: row.match.excerpt,
		timestamp: row.source.occurred_at ?? row.source.uploaded_at ?? row.source.created_at,
		label: sourceTypeLabel(sourceType)
	};
}

export function mapCaseSearchResultToEvidenceItem(
	row: SearchResultItem,
	current: { id: string; caseNumber: string; caseTitle: string; unit: string }
): IntelligenceEvidenceItem {
	const sourceType: IntelligenceEvidenceItem['sourceType'] =
		row.type === 'entry' ? 'timeline' : row.type === 'file' ? 'file' : 'record';
	return {
		id: row.id,
		caseId: current.id,
		caseNumber: current.caseNumber,
		caseTitle: current.caseTitle,
		unit: current.unit,
		sourceType,
		sourceKind: row.type,
		excerpt: row.snippet,
		timestamp: row.sort_time,
		label: sourceTypeLabel(sourceType)
	};
}

export function buildEvidenceCaseGroups(items: IntelligenceEvidenceItem[]): IntelligenceEvidenceCaseGroup[] {
	const byCase = new Map<string, IntelligenceEvidenceItem[]>();
	for (const item of items) {
		const existing = byCase.get(item.caseId) ?? [];
		existing.push(item);
		byCase.set(item.caseId, existing);
	}

	const groups: IntelligenceEvidenceCaseGroup[] = [];
	for (const [caseId, caseItems] of byCase.entries()) {
		const sample = caseItems[0];
		const typeBuckets = new Map<IntelligenceEvidenceItem['sourceType'], IntelligenceEvidenceItem[]>();
		for (const item of caseItems) {
			const bucket = typeBuckets.get(item.sourceType) ?? [];
			bucket.push(item);
			typeBuckets.set(item.sourceType, bucket);
		}

		const typeGroups: IntelligenceEvidenceTypeGroup[] = Array.from(typeBuckets.entries())
			.map(([type, typedItems]) => ({
				type,
				label: sourceTypeLabel(type),
				items: [...typedItems].sort((a, b) => rankTimestampDesc(a.timestamp, b.timestamp))
			}))
			.sort((a, b) => sourceTypeOrder(a.type) - sourceTypeOrder(b.type));

		groups.push({
			caseId,
			caseNumber: sample.caseNumber,
			caseTitle: sample.caseTitle,
			unit: sample.unit,
			matchCount: caseItems.length,
			typeGroups
		});
	}

	return groups.sort((a, b) => b.matchCount - a.matchCount);
}

export function groupEntityEvidenceByType(items: IntelligenceEvidenceItem[]): Array<{ type: string; items: IntelligenceEvidenceItem[] }> {
	const entities = items.filter((i) => i.sourceType === 'entity');
	const byType = new Map<string, IntelligenceEvidenceItem[]>();
	for (const item of entities) {
		const key =
			item.entityType && item.entityType.trim()
				? item.entityType
				: item.sourceKind && item.sourceKind.trim()
					? item.sourceKind
					: 'entity';
		const bucket = byType.get(key) ?? [];
		bucket.push(item);
		byType.set(key, bucket);
	}

	return Array.from(byType.entries())
		.map(([type, typed]) => ({
			type,
			items: [...typed].sort((a, b) => rankTimestampDesc(a.timestamp, b.timestamp))
		}))
		.sort((a, b) => a.type.localeCompare(b.type));
}
