import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
	if (env.PUBLIC_ENABLE_PLAYGROUND !== 'true') {
		throw redirect(307, '/home');
	}

	return {};
};
