/**
 * P74-03 — Typography + semantic status CSS contracts.
 * P74-04 — Buttons, badges, chips, tooltip theme.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	DS_ASK_INTEGRITY_CLASSES,
	DS_BADGE_CLASSES,
	DS_BANNER_CLASSES,
	DS_APP_SHELL_CLASSES,
	DS_CASE_SHELL_CLASSES,
	DS_BTN_CLASSES,
	DS_CARD_CLASSES,
	DS_CHIP_CLASSES,
	DS_CONFIRM_CLASSES,
	DS_EMPTY_CLASSES,
	DS_ERROR_CLASSES,
	DS_DRAWER_CLASSES,
	DS_LOADING_CLASSES,
	DS_MODAL_CLASSES,
	DS_OVERLAY_CLASSES,
	DS_PANEL_CLASSES,
	DS_SCROLL_CLASSES,
	DS_SECTION_HEADER_CLASSES,
	DS_SKELETON_CLASSES,
	DS_STACK_CLASSES,
	DS_STATUS_SURFACE_CLASSES,
	DS_STATUS_TEXT_CLASSES,
	DS_SURFACE_CLASSES,
	DS_TOAST_CLASSES,
	DS_TYPE_CLASSES
} from './detectivePrimitiveFoundation';

const __dirname = dirname(fileURLToPath(import.meta.url));
const typoPath = join(__dirname, '../styles/detectiveTypography.css');
const statusPath = join(__dirname, '../styles/detectiveSemanticStatus.css');
const btnPath = join(__dirname, '../styles/detectiveButtons.css');
const badgePath = join(__dirname, '../styles/detectiveBadgesChips.css');
const tipPath = join(__dirname, '../styles/detectiveTooltip.css');
const surfacesPath = join(__dirname, '../styles/detectiveSurfaces.css');
const emptyLoadingSkeletonPath = join(__dirname, '../styles/detectiveEmptyLoadingSkeleton.css');
const errorBannerToastPath = join(__dirname, '../styles/detectiveErrorBannerToast.css');
const modalDrawerConfirmPath = join(__dirname, '../styles/detectiveModalDrawerConfirm.css');
const askIntegrityPath = join(__dirname, '../styles/detectiveAskIntegrity.css');
const typoCss = readFileSync(typoPath, 'utf8');
const statusCss = readFileSync(statusPath, 'utf8');
const btnCss = readFileSync(btnPath, 'utf8');
const badgeCss = readFileSync(badgePath, 'utf8');
const tipCss = readFileSync(tipPath, 'utf8');
const surfacesCss = readFileSync(surfacesPath, 'utf8');
const emptyLoadingSkeletonCss = readFileSync(emptyLoadingSkeletonPath, 'utf8');
const errorBannerToastCss = readFileSync(errorBannerToastPath, 'utf8');
const modalDrawerConfirmCss = readFileSync(modalDrawerConfirmPath, 'utf8');
const askIntegrityCss = readFileSync(askIntegrityPath, 'utf8');

describe('detectivePrimitiveFoundation (P74-03)', () => {
	it('defines every DS_TYPE_CLASSES selector in detectiveTypography.css', () => {
		for (const name of Object.values(DS_TYPE_CLASSES)) {
			expect(typoCss).toContain(`.${name}`);
		}
	});

	it('defines surface + text status classes in detectiveSemanticStatus.css', () => {
		for (const name of Object.values(DS_STATUS_SURFACE_CLASSES)) {
			expect(statusCss).toContain(`.${name}`);
		}
		for (const name of Object.values(DS_STATUS_TEXT_CLASSES)) {
			expect(statusCss).toContain(`.${name}`);
		}
	});

	it('status layer uses token references only (no raw hex in detectiveSemanticStatus.css)', () => {
		expect(statusCss).not.toMatch(/#[0-9a-fA-F]{3,8}/);
		expect(statusCss).toMatch(/var\(--ds-status-/);
		expect(statusCss).toContain('.ds-status-copy');
	});

	it('typography layer uses DS text + type tokens (no raw hex)', () => {
		expect(typoCss).not.toMatch(/#[0-9a-fA-F]{3,8}/);
		expect(typoCss).toMatch(/var\(--ds-type-/);
		expect(typoCss).toMatch(/var\(--ds-text-/);
	});
});

describe('detectivePrimitiveFoundation (P74-04)', () => {
	it('defines DS_BTN_CLASSES selectors in detectiveButtons.css', () => {
		for (const compound of Object.values(DS_BTN_CLASSES)) {
			for (const cls of compound.split(' ')) {
				expect(btnCss).toContain(`.${cls}`);
			}
		}
		expect(btnCss).not.toMatch(/#[0-9a-fA-F]{3,8}/);
		expect(btnCss).toMatch(/var\(--ds-accent\)/);
	});

	it('defines DS_BADGE_CLASSES + DS_CHIP_CLASSES in detectiveBadgesChips.css', () => {
		for (const compound of Object.values(DS_BADGE_CLASSES)) {
			for (const cls of compound.split(' ')) {
				expect(badgeCss).toContain(`.${cls}`);
			}
		}
		for (const compound of Object.values(DS_CHIP_CLASSES)) {
			for (const cls of compound.split(' ')) {
				expect(badgeCss).toContain(`.${cls}`);
			}
		}
		expect(badgeCss).not.toMatch(/#[0-9a-fA-F]{3,8}/);
	});

	it('detective tooltip theme uses DS tokens only', () => {
		expect(tipCss).toContain(`[data-theme~='detective']`);
		expect(tipCss).not.toMatch(/#[0-9a-fA-F]{3,8}/);
		expect(tipCss).toMatch(/var\(--ds-bg-elevated\)/);
	});
});

describe('detectivePrimitiveFoundation (P74-05)', () => {
	it('defines surface/panel/card/section/stack contracts in detectiveSurfaces.css', () => {
		for (const compound of Object.values(DS_SURFACE_CLASSES)) {
			for (const cls of compound.split(' ')) {
				expect(surfacesCss).toContain(`.${cls}`);
			}
		}
		for (const compound of Object.values(DS_PANEL_CLASSES)) {
			for (const cls of compound.split(' ')) {
				expect(surfacesCss).toContain(`.${cls}`);
			}
		}
		for (const compound of Object.values(DS_CARD_CLASSES)) {
			for (const cls of compound.split(' ')) {
				expect(surfacesCss).toContain(`.${cls}`);
			}
		}
		for (const compound of Object.values(DS_SECTION_HEADER_CLASSES)) {
			for (const cls of compound.split(' ')) {
				expect(surfacesCss).toContain(`.${cls}`);
			}
		}
		for (const compound of Object.values(DS_STACK_CLASSES)) {
			for (const cls of compound.split(' ')) {
				expect(surfacesCss).toContain(`.${cls}`);
			}
		}
		for (const compound of Object.values(DS_SCROLL_CLASSES)) {
			for (const cls of compound.split(' ')) {
				expect(surfacesCss).toContain(`.${cls}`);
			}
		}
		for (const compound of Object.values(DS_APP_SHELL_CLASSES)) {
			for (const cls of compound.split(' ')) {
				expect(surfacesCss).toContain(`.${cls}`);
			}
		}
		for (const compound of Object.values(DS_CASE_SHELL_CLASSES)) {
			for (const cls of compound.split(' ')) {
				expect(surfacesCss).toContain(`.${cls}`);
			}
		}
		expect(surfacesCss).not.toMatch(/#[0-9a-fA-F]{3,8}/);
		expect(surfacesCss).toMatch(/var\(--ds-bg-elevated\)/);
	});

	it('unlayered bounded scroll keeps flex column contract (P71-FU6)', () => {
		const idx = surfacesCss.indexOf('.ds-scroll-root {\n');
		expect(idx).toBeGreaterThan(-1);
		const block = surfacesCss.slice(idx, idx + 400);
		expect(block).toMatch(/display:\s*flex/);
		expect(block).toMatch(/flex-direction:\s*column/);
		expect(block).toMatch(/overflow:\s*hidden/);
		const bodyIdx = surfacesCss.indexOf('.ds-scroll-body {\n');
		expect(bodyIdx).toBeGreaterThan(-1);
		const bodyBlock = surfacesCss.slice(bodyIdx, bodyIdx + 320);
		expect(bodyBlock).toMatch(/overflow-y:\s*auto/);
	});
});

describe('detectivePrimitiveFoundation (P74-06)', () => {
	it('defines empty / loading / skeleton contracts in detectiveEmptyLoadingSkeleton.css', () => {
		for (const name of Object.values(DS_EMPTY_CLASSES)) {
			expect(emptyLoadingSkeletonCss).toContain(`.${name}`);
		}
		for (const compound of Object.values(DS_LOADING_CLASSES)) {
			for (const cls of compound.split(' ')) {
				expect(emptyLoadingSkeletonCss).toContain(`.${cls}`);
			}
		}
		for (const compound of Object.values(DS_SKELETON_CLASSES)) {
			for (const cls of compound.split(' ')) {
				expect(emptyLoadingSkeletonCss).toContain(`.${cls}`);
			}
		}
		expect(emptyLoadingSkeletonCss).not.toMatch(/#[0-9a-fA-F]{3,8}/);
		expect(emptyLoadingSkeletonCss).toMatch(/var\(--ds-/);
	});

	it('CaseEmptyState + CaseLoadingState reference DS class strings (migration anchor)', () => {
		const caseDir = join(__dirname, '../components/case');
		const emptySrc = readFileSync(join(caseDir, 'CaseEmptyState.svelte'), 'utf8');
		const loadSrc = readFileSync(join(caseDir, 'CaseLoadingState.svelte'), 'utf8');
		expect(emptySrc).toContain('ds-empty');
		expect(emptySrc).toContain(DS_EMPTY_CLASSES.title);
		expect(loadSrc).toContain('ds-loading');
		expect(loadSrc).toContain(DS_LOADING_CLASSES.icon);
	});
});

describe('detectivePrimitiveFoundation (P74-07)', () => {
	it('defines error / banner / toast contracts in detectiveErrorBannerToast.css', () => {
		for (const name of Object.values(DS_ERROR_CLASSES)) {
			expect(errorBannerToastCss).toContain(`.${name}`);
		}
		for (const name of Object.values(DS_BANNER_CLASSES)) {
			expect(errorBannerToastCss).toContain(`.${name}`);
		}
		for (const name of Object.values(DS_TOAST_CLASSES)) {
			expect(errorBannerToastCss).toContain(`.${name}`);
		}
		expect(errorBannerToastCss).not.toMatch(/#[0-9a-fA-F]{3,8}/);
		expect(errorBannerToastCss).toMatch(/var\(--ds-/);
	});

	it('CaseErrorState + NotificationToast reference DS class strings (migration anchor)', () => {
		const caseDir = join(__dirname, '../components/case');
		const errSrc = readFileSync(join(caseDir, 'CaseErrorState.svelte'), 'utf8');
		const toastSrc = readFileSync(join(__dirname, '../components/NotificationToast.svelte'), 'utf8');
		expect(errSrc).toContain('ds-error');
		expect(errSrc).toContain(DS_ERROR_CLASSES.title);
		expect(errSrc).toContain('DS_BTN_CLASSES.secondary');
		expect(toastSrc).toContain('ds-toast');
		expect(toastSrc).toContain(DS_TOAST_CLASSES.close);
	});
});

describe('detectivePrimitiveFoundation (P74-08)', () => {
	it('defines modal / drawer / confirm contracts in detectiveModalDrawerConfirm.css', () => {
		for (const name of Object.values(DS_OVERLAY_CLASSES)) {
			expect(modalDrawerConfirmCss).toContain(`.${name}`);
		}
		expect(modalDrawerConfirmCss).toContain(`.${DS_MODAL_CLASSES.panel}`);
		expect(modalDrawerConfirmCss).toContain(`.${DS_DRAWER_CLASSES.panel}`);
		for (const name of Object.values(DS_CONFIRM_CLASSES)) {
			expect(modalDrawerConfirmCss).toContain(`.${name}`);
		}
		expect(modalDrawerConfirmCss).not.toMatch(/#[0-9a-fA-F]{3,8}/);
		expect(modalDrawerConfirmCss).toMatch(/var\(--ds-/);
	});

	it('Modal / Drawer / ConfirmDialog reference DS overlay + panel classes (migration anchor)', () => {
		const commonDir = join(__dirname, '../components/common');
		const modalSrc = readFileSync(join(commonDir, 'Modal.svelte'), 'utf8');
		const drawerSrc = readFileSync(join(commonDir, 'Drawer.svelte'), 'utf8');
		const confirmSrc = readFileSync(join(commonDir, 'ConfirmDialog.svelte'), 'utf8');
		expect(modalSrc).toContain('ds-overlay-backdrop');
		expect(modalSrc).toContain('ds-overlay-backdrop-modal');
		expect(modalSrc).toContain(DS_MODAL_CLASSES.panel);
		expect(drawerSrc).toContain('ds-overlay-backdrop-drawer');
		expect(drawerSrc).toContain(DS_DRAWER_CLASSES.panel);
		expect(confirmSrc).toContain('ds-confirm-panel');
		expect(confirmSrc).toContain('DS_BTN_CLASSES');
	});
});

describe('detectivePrimitiveFoundation (P74-09)', () => {
	it('defines Ask integrity banner contracts in detectiveAskIntegrity.css', () => {
		for (const name of Object.values(DS_ASK_INTEGRITY_CLASSES)) {
			expect(askIntegrityCss).toContain(`.${name}`);
		}
		expect(askIntegrityCss).not.toMatch(/#[0-9a-fA-F]{3,8}/);
		expect(askIntegrityCss).toMatch(/var\(--ds-/);
	});

	it('CaseEngineAskIntegrityBanner + askIntegrityUi reference DS integrity classes', () => {
		const caseDir = join(__dirname, '../components/case');
		const bannerSrc = readFileSync(join(caseDir, 'CaseEngineAskIntegrityBanner.svelte'), 'utf8');
		const uiSrc = readFileSync(join(__dirname, '../utils/askIntegrityUi.ts'), 'utf8');
		expect(bannerSrc).toContain('DS_ASK_INTEGRITY_CLASSES');
		expect(uiSrc).toContain('DS_ASK_INTEGRITY_CLASSES');
	});
});
