import type { WorkflowItem, WorkflowProposal } from '$lib/apis/caseEngine';

export function detectWorkflowListIntent(text: string): boolean {
	const q = String(text ?? '').toLowerCase();
	if (!q) return false;
	return (
		/\bworkflow\b/.test(q) &&
		(/\b(show|list|view|what|open)\b/.test(q) || /\bitems?\b/.test(q) || /\bproposals?\b/.test(q))
	);
}

export function detectWorkflowCreateIntent(text: string): boolean {
	const q = String(text ?? '').toLowerCase();
	if (!q) return false;
	return /\b(create|add|new)\b/.test(q) && /\bworkflow\b/.test(q) && /\b(item|proposal)\b/.test(q);
}

function isOpenItem(item: WorkflowItem): boolean {
	return String(item.status ?? '').toUpperCase() !== 'CLOSED' && !item.deleted_at;
}

export function formatWorkflowOverviewForChat(
	items: WorkflowItem[],
	proposals: WorkflowProposal[],
	caseId: string
): string {
	const activeItems = items.filter((item) => !item.deleted_at);
	const openItems = activeItems.filter(isOpenItem);
	const pendingProposals = proposals.filter((p) => String(p.status ?? '').toUpperCase() === 'PENDING');

	const lines: string[] = [];
	lines.push(`Here are the current workflow items for this case.`);
	lines.push(`- Active items: ${activeItems.length}`);
	lines.push(`- Open items: ${openItems.length}`);
	lines.push(`- Pending proposals: ${pendingProposals.length}`);

	if (activeItems.length > 0) {
		lines.push('Top workflow items:');
		for (const item of activeItems.slice(0, 5)) {
			lines.push(`- [${item.type}] ${item.title} (${item.status})`);
		}
	} else {
		lines.push('No workflow items yet.');
	}

	if (pendingProposals.length > 0) {
		lines.push('Pending proposals:');
		for (const proposal of pendingProposals.slice(0, 3)) {
			const title = proposal.suggested_payload?.title ?? '(no title)';
			lines.push(`- [${proposal.proposal_type}] ${title}`);
		}
	} else {
		lines.push('No workflow proposals.');
	}

	lines.push(`View full details in the Workflow tab.`);
	lines.push(`/case/${caseId}/workflow`);
	return lines.join('\n');
}
