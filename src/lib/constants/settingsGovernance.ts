export type GovernedSettingsTab = {
	id: string;
	title: string;
	keywords: string[];
	route?: string;
};

export const PERSONAL_GOVERNED_TABS: GovernedSettingsTab[] = [
	{
		id: 'general',
		title: 'General',
		keywords: [
			'general',
			'personal preferences',
			'theme',
			'language',
			'notifications',
			'webui settings'
		]
	},
	{
		id: 'interface',
		title: 'Interface',
		keywords: [
			'interface',
			'ui scale',
			'high contrast mode',
			'display chat title in tab',
			'notification sound',
			'chat direction',
			'landing page mode',
			'chat background image',
			'chat bubble ui',
			'widescreen mode',
			'temporary chat by default',
			'floating quick actions',
			'enter key behavior',
			'detect artifacts automatically',
			'iframe sandbox allow same origin',
			'iframe sandbox allow forms',
			'image compression',
			'compress images in channels'
		]
	},
	{
		id: 'account',
		title: 'Account',
		keywords: [
			'account preferences',
			'account settings',
			'accountpreferences',
			'accountsettings',
			'api keys',
			'apikeys',
			'change password',
			'changepassword',
			'login',
			'new password',
			'newpassword',
			'notification webhook url',
			'notificationwebhookurl',
			'personal settings',
			'personalsettings',
			'privacy settings',
			'privacysettings',
			'profileavatar',
			'profile avatar',
			'profile details',
			'profile image',
			'profile picture',
			'profiledetails',
			'profileimage',
			'profilepicture',
			'security settings',
			'securitysettings',
			'update account',
			'update password',
			'updateaccount',
			'updatepassword',
			'user account',
			'user data',
			'user preferences',
			'user profile',
			'useraccount',
			'userdata',
			'username',
			'userpreferences',
			'userprofile',
			'webhook url',
			'webhookurl'
		]
	},
	{
		id: 'about',
		title: 'About',
		keywords: [
			'about app',
			'about me',
			'about page',
			'about us',
			'aboutapp',
			'aboutme',
			'aboutpage',
			'aboutus',
			'check for updates',
			'checkforupdates',
			'contact',
			'copyright',
			'details',
			'documentation',
			'help',
			'information',
			'license',
			'redistributions',
			'release',
			'settings',
			'software info',
			'softwareinfo',
			'support',
			'terms and conditions',
			'terms of use',
			'termsandconditions',
			'termsofuse',
			'update info',
			'updateinfo',
			'version info',
			'versioninfo'
		]
	}
];

export const PERSONAL_GOVERNED_TAB_IDS = PERSONAL_GOVERNED_TABS.map((tab) => tab.id);

export const PERSONAL_ALLOWED_SETTINGS_UPDATE_KEYS = [
	'notificationEnabled',
	'highContrastMode',
	'showChatTitleInTab',
	'notificationSound',
	'notificationSoundAlways',
	'enableMessageQueue',
	'chatDirection',
	'landingPageMode',
	'backgroundImageUrl',
	'chatBubble',
	'showUsername',
	'widescreenMode',
	'temporaryChatByDefault',
	'ctrlEnterToSend',
	'detectArtifacts',
	'iframeSandboxAllowSameOrigin',
	'iframeSandboxAllowForms',
	'showFloatingActionButtons',
	'floatingActionButtons',
	'imageCompression',
	'imageCompressionInChannels',
	'imageCompressionSize',
	'textScale',
	'notifications'
] as const;

const PERSONAL_ALLOWED_SETTINGS_UPDATE_KEYS_SET = new Set<string>(PERSONAL_ALLOWED_SETTINGS_UPDATE_KEYS);

export const sanitizePersonalSettingsUpdate = (updated: Record<string, unknown>) => {
	const sanitized = Object.fromEntries(
		Object.entries(updated).filter(([key]) => PERSONAL_ALLOWED_SETTINGS_UPDATE_KEYS_SET.has(key))
	);

	if ('notifications' in sanitized) {
		const notifications = sanitized.notifications as Record<string, unknown> | undefined;
		sanitized.notifications = {
			webhook_url: notifications?.webhook_url ?? ''
		};
	}

	return sanitized;
};

export const ADMIN_GOVERNED_TABS: GovernedSettingsTab[] = [
	{
		id: 'general',
		title: 'System General',
		route: '/admin/settings/general',
		keywords: ['general', 'system', 'admin settings', 'roles', 'sign up', 'ldap', 'authentication', 'api keys', 'jwt']
	},
	{
		id: 'interface',
		title: 'System Interface',
		route: '/admin/settings/interface',
		keywords: ['interface', 'ui', 'tasks', 'task model', 'local task model', 'external task model']
	}
];

export const ADMIN_GOVERNED_TAB_IDS = ADMIN_GOVERNED_TABS.map((tab) => tab.id);

export const ADMIN_GENERAL_GOVERNED_CONFIG_KEYS = [
	'DEFAULT_USER_ROLE',
	'ENABLE_SIGNUP',
	'SHOW_ADMIN_DETAILS',
	'ADMIN_EMAIL',
	'PENDING_USER_OVERLAY_TITLE',
	'PENDING_USER_OVERLAY_CONTENT',
	'ENABLE_API_KEYS',
	'ENABLE_API_KEYS_ENDPOINT_RESTRICTIONS',
	'API_KEYS_ALLOWED_ENDPOINTS',
	'JWT_EXPIRES_IN'
] as const;

const ADMIN_GENERAL_GOVERNED_DEFAULTS: Record<(typeof ADMIN_GENERAL_GOVERNED_CONFIG_KEYS)[number], unknown> = {
	DEFAULT_USER_ROLE: 'pending',
	ENABLE_SIGNUP: true,
	SHOW_ADMIN_DETAILS: false,
	ADMIN_EMAIL: '',
	PENDING_USER_OVERLAY_TITLE: '',
	PENDING_USER_OVERLAY_CONTENT: '',
	ENABLE_API_KEYS: false,
	ENABLE_API_KEYS_ENDPOINT_RESTRICTIONS: false,
	API_KEYS_ALLOWED_ENDPOINTS: '',
	JWT_EXPIRES_IN: '30m'
};

export const mapAdminGeneralGovernedConfig = (config: Record<string, any>) => {
	return Object.fromEntries(
		ADMIN_GENERAL_GOVERNED_CONFIG_KEYS.map((key) => [key, config?.[key] ?? ADMIN_GENERAL_GOVERNED_DEFAULTS[key]])
	);
};

export const pickAdminGeneralGovernedConfig = (config: Record<string, any>) => {
	return Object.fromEntries(
		ADMIN_GENERAL_GOVERNED_CONFIG_KEYS.map((key) => [key, config?.[key]])
	);
};

export const ADMIN_INTERFACE_GOVERNED_TASK_KEYS = ['TASK_MODEL', 'TASK_MODEL_EXTERNAL'] as const;

export const pickAdminInterfaceGovernedTaskConfig = (config: Record<string, any>) => {
	return Object.fromEntries(ADMIN_INTERFACE_GOVERNED_TASK_KEYS.map((key) => [key, config?.[key] ?? '']));
};
