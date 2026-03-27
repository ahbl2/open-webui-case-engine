import { describe, it, expect } from 'vitest';
import {
	PERSONAL_GOVERNED_TAB_IDS,
	ADMIN_GOVERNED_TAB_IDS,
	PERSONAL_ALLOWED_SETTINGS_UPDATE_KEYS,
	sanitizePersonalSettingsUpdate,
	mapAdminGeneralGovernedConfig,
	pickAdminGeneralGovernedConfig,
	pickAdminInterfaceGovernedTaskConfig
} from './settingsGovernance';

describe('settings governance tabs', () => {
	it('keeps only governed personal tabs', () => {
		expect(PERSONAL_GOVERNED_TAB_IDS).toEqual(['general', 'interface', 'account', 'about']);
		expect(PERSONAL_GOVERNED_TAB_IDS).not.toContain('audio');
		expect(PERSONAL_GOVERNED_TAB_IDS).not.toContain('connections');
		expect(PERSONAL_GOVERNED_TAB_IDS).not.toContain('tools');
		expect(PERSONAL_GOVERNED_TAB_IDS).not.toContain('personalization');
		expect(PERSONAL_GOVERNED_TAB_IDS).not.toContain('data_controls');
	});

	it('keeps only governed admin tabs', () => {
		expect(ADMIN_GOVERNED_TAB_IDS).toEqual(['general', 'interface']);
		expect(ADMIN_GOVERNED_TAB_IDS).not.toContain('audio');
		expect(ADMIN_GOVERNED_TAB_IDS).not.toContain('models');
		expect(ADMIN_GOVERNED_TAB_IDS).not.toContain('documents');
		expect(ADMIN_GOVERNED_TAB_IDS).not.toContain('web');
	});
});

describe('sanitizePersonalSettingsUpdate', () => {
	it('passes only governed personal keys and strips hidden keys', () => {
		const sanitized = sanitizePersonalSettingsUpdate({
			highContrastMode: true,
			widescreenMode: true,
			autoTags: true,
			voiceInterruption: true,
			richTextInput: true
		});

		expect(sanitized).toEqual({
			highContrastMode: true,
			widescreenMode: true
		});
	});

	it('normalizes notifications payload to webhook_url only', () => {
		const sanitized = sanitizePersonalSettingsUpdate({
			notifications: {
				webhook_url: 'https://example.invalid/hook',
				extra: 'should-not-pass'
			}
		});

		expect(sanitized).toEqual({
			notifications: {
				webhook_url: 'https://example.invalid/hook'
			}
		});
	});

	it('keeps allowlist explicit and free of removed keys', () => {
		expect(PERSONAL_ALLOWED_SETTINGS_UPDATE_KEYS).toContain('detectArtifacts');
		expect(PERSONAL_ALLOWED_SETTINGS_UPDATE_KEYS).not.toContain('autoTags');
		expect(PERSONAL_ALLOWED_SETTINGS_UPDATE_KEYS).not.toContain('voiceInterruption');
		expect(PERSONAL_ALLOWED_SETTINGS_UPDATE_KEYS).not.toContain('richTextInput');
	});
});

describe('admin governed config pickers', () => {
	it('maps admin general config to governed keys only with defaults', () => {
		const mapped = mapAdminGeneralGovernedConfig({
			DEFAULT_USER_ROLE: 'admin',
			ENABLE_SIGNUP: false,
			ENABLE_USER_STATUS: true,
			ENABLE_CHANNELS: true
		});

		expect(Object.keys(mapped).sort()).toEqual(
			[
				'ADMIN_EMAIL',
				'API_KEYS_ALLOWED_ENDPOINTS',
				'DEFAULT_USER_ROLE',
				'ENABLE_API_KEYS',
				'ENABLE_API_KEYS_ENDPOINT_RESTRICTIONS',
				'ENABLE_SIGNUP',
				'JWT_EXPIRES_IN',
				'PENDING_USER_OVERLAY_CONTENT',
				'PENDING_USER_OVERLAY_TITLE',
				'SHOW_ADMIN_DETAILS'
			].sort()
		);
		expect(mapped.DEFAULT_USER_ROLE).toBe('admin');
		expect(mapped.ENABLE_SIGNUP).toBe(false);
		expect((mapped as Record<string, unknown>).ENABLE_USER_STATUS).toBeUndefined();
		expect((mapped as Record<string, unknown>).ENABLE_CHANNELS).toBeUndefined();
	});

	it('picks admin general payload keys only', () => {
		const picked = pickAdminGeneralGovernedConfig({
			DEFAULT_USER_ROLE: 'pending',
			ENABLE_SIGNUP: true,
			SHOW_ADMIN_DETAILS: false,
			ADMIN_EMAIL: 'admin@example.invalid',
			PENDING_USER_OVERLAY_TITLE: 'Pending',
			PENDING_USER_OVERLAY_CONTENT: 'Please contact admin.',
			ENABLE_API_KEYS: true,
			ENABLE_API_KEYS_ENDPOINT_RESTRICTIONS: true,
			API_KEYS_ALLOWED_ENDPOINTS: '/api/v1/messages',
			JWT_EXPIRES_IN: '30m',
			ENABLE_USER_WEBHOOKS: true,
			ENABLE_CHANNELS: true
		});

		expect(Object.keys(picked).sort()).toEqual(
			[
				'ADMIN_EMAIL',
				'API_KEYS_ALLOWED_ENDPOINTS',
				'DEFAULT_USER_ROLE',
				'ENABLE_API_KEYS',
				'ENABLE_API_KEYS_ENDPOINT_RESTRICTIONS',
				'ENABLE_SIGNUP',
				'JWT_EXPIRES_IN',
				'PENDING_USER_OVERLAY_CONTENT',
				'PENDING_USER_OVERLAY_TITLE',
				'SHOW_ADMIN_DETAILS'
			].sort()
		);
		expect((picked as Record<string, unknown>).ENABLE_USER_WEBHOOKS).toBeUndefined();
		expect((picked as Record<string, unknown>).ENABLE_CHANNELS).toBeUndefined();
	});

	it('picks admin interface task model keys only', () => {
		const picked = pickAdminInterfaceGovernedTaskConfig({
			TASK_MODEL: 'local:model-a',
			TASK_MODEL_EXTERNAL: 'external:model-b',
			ENABLE_TITLE_GENERATION: true,
			QUERY_GENERATION_PROMPT_TEMPLATE: 'legacy hidden prompt'
		});

		expect(picked).toEqual({
			TASK_MODEL: 'local:model-a',
			TASK_MODEL_EXTERNAL: 'external:model-b'
		});
		expect((picked as Record<string, unknown>).ENABLE_TITLE_GENERATION).toBeUndefined();
	});
});
