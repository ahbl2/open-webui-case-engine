import { error } from '@sveltejs/kit';

/** P74-02 — dev-only token preview; production builds return 404. */
export const load = async () => {
	if (!import.meta.env.DEV) {
		throw error(404, 'Not found');
	}
	return {};
};
