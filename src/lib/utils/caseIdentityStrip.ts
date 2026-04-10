/**
 * P76-04 — Case workspace identity strip helpers (CASE_WORKSPACE_SHELL_SPEC §Case identity doctrine).
 * Pure functions only — no fabricated backend fields.
 */
import { DS_BADGE_CLASSES } from '$lib/case/detectivePrimitiveFoundation';
import type { CaseNavSection } from '$lib/utils/caseNavSection';

/** Title / nickname: always show a string; controlled truncation lives on the element (`title` attr). */
export function displayCaseTitle(title: string | undefined | null): string {
	const t = (title ?? '').trim();
	return t.length > 0 ? t : 'Untitled case';
}

/** DS badge compound for lifecycle status (truthful to API string). */
export function caseStatusDsBadgeCompound(status: string): string {
	switch (status?.trim().toUpperCase()) {
		case 'OPEN':
			return `${DS_BADGE_CLASSES.base} ${DS_BADGE_CLASSES.success}`;
		case 'CLOSED':
			return `${DS_BADGE_CLASSES.base} ${DS_BADGE_CLASSES.neutral}`;
		case 'PENDING':
			return `${DS_BADGE_CLASSES.base} ${DS_BADGE_CLASSES.warning}`;
		default:
			return status?.trim()
				? `${DS_BADGE_CLASSES.base} ${DS_BADGE_CLASSES.info}`
				: `${DS_BADGE_CLASSES.base} ${DS_BADGE_CLASSES.neutral}`;
	}
}

/**
 * Expanded vs compact shell identity posture (CASE_WORKSPACE_SHELL_SPEC §Shell context compression).
 * Summary tab is the closest product surface to an “overview / entry” moment for orientation.
 */
export function caseIdentityStripExpandedPosture(section: CaseNavSection): boolean {
	return section === 'summary';
}
