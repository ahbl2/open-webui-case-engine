/**
 * P132.5-01 / P132.5-02 — `CaseWorkspaceLayoutShell` + `CaseWorkspaceShellPanel`: structural layout only.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const shellPath = join(__dirname, 'CaseWorkspaceLayoutShell.svelte');
const panelPath = join(__dirname, 'CaseWorkspaceShellPanel.svelte');

describe('CaseWorkspaceLayoutShell / CaseWorkspaceShellPanel P132.5 shell', () => {
	it('layout shell is presentational only (no fetch, stores, navigation, lifecycle loading)', () => {
		const src = readFileSync(shellPath, 'utf8');
		expect(src).not.toMatch(/\bfetch\b/);
		expect(src).not.toMatch(/getCaseById/);
		expect(src).not.toMatch(/\$lib\/stores/);
		expect(src).not.toMatch(/onMount\b/);
		expect(src).not.toMatch(/\bgoto\b/);
		expect(src).not.toMatch(/<script[^>]*>[\s\S]*\bpage\b/);
	});

	it('declares center + optional right zones with stable test ids and primary center landmark (no left rail)', () => {
		const src = readFileSync(shellPath, 'utf8');
		expect(src).toMatch(/data-testid="case-workspace-layout-shell"/);
		expect(src).not.toMatch(/data-testid="case-workspace-shell-left"/);
		expect(src).toMatch(/data-testid="case-workspace-shell-center"/);
		expect(src).toMatch(/data-testid="case-workspace-shell-right"/);
		expect(src).not.toMatch(/<slot name="left"/);
		expect(src).toMatch(/<slot name="center"/);
		expect(src).toMatch(/<slot name="right"/);
		expect(src).toMatch(/Primary work area/);
		expect(src).toMatch(/data-p1325-center-primary/);
	});

	it('shell panel supports delegated body scroll for Tier L nested scrollports (P132.5-02)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).toMatch(/export let delegateBodyScroll/);
		expect(src).toMatch(/data-p1325-delegate-body-scroll/);
	});

	it('shell panel is frame-only (no fetch, stores, mutation controls)', () => {
		const src = readFileSync(panelPath, 'utf8');
		expect(src).not.toMatch(/\bfetch\b/);
		expect(src).not.toMatch(/\$lib\/stores/);
		expect(src).not.toMatch(/onMount\b/);
		expect(src).not.toMatch(/\bon:click\b/);
		expect(src).toMatch(/<slot/);
	});
});
