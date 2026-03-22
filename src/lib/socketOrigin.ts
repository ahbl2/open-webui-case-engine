/**
 * Single source of truth for Socket.IO **origin** (no path).
 * Path is fixed in the client: {@link SOCKET_IO_SERVER_PATH}.
 *
 * Default: same origin as the page — in dev, the Vite server (3001) proxies `/ws` to the Python backend.
 * Optional override: `PUBLIC_WS_URL` (full origin, no path).
 */
export const SOCKET_IO_SERVER_PATH = '/ws/socket.io';

export type ResolveSocketIoOriginParams = {
	browser: boolean;
	/** From `$env/dynamic/public` PUBLIC_WS_URL — optional explicit origin */
	publicWsUrl: string;
};

/**
 * Pure resolver for tests and `getSocketIoOrigin()`.
 * - If `PUBLIC_WS_URL` is set (after trim), use it as the Socket.IO origin (no implicit port in code).
 * - Otherwise `undefined` → socket.io-client uses the same origin as the page (dev: Vite proxies `/ws`).
 */
export function resolveSocketIoOrigin(p: ResolveSocketIoOriginParams): string | undefined {
	if (!p.browser) return undefined;

	const explicit = String(p.publicWsUrl ?? '').trim();
	if (explicit) {
		return explicit.replace(/\/+$/, '');
	}

	return undefined;
}
