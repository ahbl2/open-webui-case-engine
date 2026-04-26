import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appLayoutPath = join(__dirname, '../../../routes/(app)/+layout.svelte');
const userMenuPath = join(__dirname, 'Sidebar/UserMenu.svelte');

describe('global shortcuts modal mount', () => {
	it('mounts the shortcuts modal from app layout so it works when the sidebar is retracted', () => {
		const src = readFileSync(appLayoutPath, 'utf8');

		expect(src).toMatch(/import ShortcutsModal from '\$lib\/components\/chat\/ShortcutsModal\.svelte'/);
		expect(src).toMatch(/<ShortcutsModal bind:show=\{\$showShortcuts\} \/>/);
	});

	it('does not mount the shortcuts modal from the sidebar user menu', () => {
		const src = readFileSync(userMenuPath, 'utf8');

		expect(src).not.toMatch(/<ShortcutsModal/);
		expect(src).not.toMatch(/components\/chat\/ShortcutsModal\.svelte/);
	});
});
