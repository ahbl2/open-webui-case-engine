/**
 * Ticket 24: Deterministic graph layout for evidence graph visualization.
 * No physics; stable positions for identical graph data.
 */
import type { GraphNode, GraphEdge } from '$lib/apis/caseEngine';

export interface LayoutNode {
	id: string;
	x: number;
	y: number;
	node: GraphNode;
}

export interface LayoutEdge {
	id: string;
	from: string;
	to: string;
	edge: GraphEdge;
}

export interface GraphLayout {
	nodes: LayoutNode[];
	edges: LayoutEdge[];
	width: number;
	height: number;
}

const TYPE_ORDER: Record<string, number> = {
	person: 0,
	phone: 1,
	location: 2,
	event: 3
};

const PADDING = 80;
const NODE_SPACING = 120;

/**
 * Deterministic hierarchical layout: nodes grouped by type in rows.
 * Sorted by id within type for stability.
 */
export function computeGraphLayout(
	nodes: GraphNode[],
	edges: GraphEdge[],
	width: number,
	height: number
): GraphLayout {
	const sortedNodes = [...nodes].sort((a, b) => {
		const typeOrder = (TYPE_ORDER[a.type] ?? 4) - (TYPE_ORDER[b.type] ?? 4);
		if (typeOrder !== 0) return typeOrder;
		return a.id.localeCompare(b.id);
	});

	const sortedEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

	const nodeMap = new Map<string, GraphNode>();
	for (const n of sortedNodes) nodeMap.set(n.id, n);

	// Group by type, sorted by id
	const byType = new Map<string, GraphNode[]>();
	for (const n of sortedNodes) {
		const list = byType.get(n.type) ?? [];
		list.push(n);
		byType.set(n.type, list);
	}

	const types = ['person', 'phone', 'location', 'event'].filter((t) => byType.has(t));
	const contentW = width - 2 * PADDING;
	const contentH = height - 2 * PADDING;

	const layoutNodes: LayoutNode[] = [];
	let rowIndex = 0;
	for (const type of types) {
		const list = byType.get(type) ?? [];
		const count = list.length;
		const rowH = contentH / Math.max(types.length, 1);
		const y = PADDING + rowIndex * rowH + rowH / 2;
		for (let i = 0; i < count; i++) {
			const x = count === 1
				? PADDING + contentW / 2
				: PADDING + (contentW * (i + 1)) / (count + 1);
			layoutNodes.push({
				id: list[i].id,
				x,
				y,
				node: list[i]
			});
		}
		rowIndex++;
	}

	const layoutEdges: LayoutEdge[] = sortedEdges
		.filter((e) => nodeMap.has(e.from) && nodeMap.has(e.to))
		.map((e) => ({ id: e.id, from: e.from, to: e.to, edge: e }));

	return {
		nodes: layoutNodes,
		edges: layoutEdges,
		width,
		height
	};
}
