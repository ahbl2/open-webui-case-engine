import { browser } from '$app/environment';
import { io, type Socket } from 'socket.io-client';
import { getSocketIoOrigin } from '$lib/constants';
import { SOCKET_IO_SERVER_PATH } from '$lib/socketOrigin';

let singletonSocket: Socket | null = null;
let devOriginMismatchWarned = false;

/** Dev-only: misconfigured PUBLIC_WS_URL (wrong port/host vs the page) breaks Vite /ws proxying. */
function warnDevIfPublicWsUrlMismatchesPage(): void {
	if (!import.meta.env.DEV || devOriginMismatchWarned || typeof window === 'undefined') return;
	const explicit = getSocketIoOrigin();
	if (!explicit) return;
	try {
		const a = new URL(explicit);
		const b = new URL(window.location.href);
		const portA = a.port || (a.protocol === 'https:' ? '443' : '80');
		const portB = b.port || (b.protocol === 'https:' ? '443' : '80');
		if (a.protocol !== b.protocol || a.hostname !== b.hostname || portA !== portB) {
			devOriginMismatchWarned = true;
			console.warn(
				'[socket] PUBLIC_WS_URL does not match this page’s origin. Socket.IO will bypass the Vite dev proxy and often breaks (wrong port, CORS, or 400 on Engine.IO POST).\n' +
					'Fix: remove PUBLIC_WS_URL from .env (recommended), or set it to exactly the browser origin (e.g. https://192.168.x.x:3001 for Vite).\n' +
					'Never point PUBLIC_WS_URL at the Python backend port (8080) in the standard Detective stack.',
				{ PUBLIC_WS_URL: explicit, pageOrigin: b.origin }
			);
		}
	} catch {
		devOriginMismatchWarned = true;
		console.warn('[socket] PUBLIC_WS_URL is not a valid URL:', explicit);
	}
}

/** Marks that root layout lifecycle listeners were bound (prevents duplicate `.on` on remount / HMR). */
const LAYOUT_LISTENERS_BOUND = Symbol.for('openwebui.layoutSocketListenersBound');

/**
 * Register layout-level Socket.IO handlers at most once per socket instance.
 * Safe if `setupSocket` runs again: duplicate `connect` / `disconnect` handlers would multiply heartbeats and `user-join` work.
 * Each fresh socket instance from `resetSocket()` has no symbol yet, so it will accept exactly one listener registration.
 */
export function attachLayoutSocketListenersOnce(socket: Socket, register: (s: Socket) => void): void {
	const box = socket as unknown as Record<symbol, boolean | undefined>;
	if (box[LAYOUT_LISTENERS_BOUND]) {
		return;
	}
	box[LAYOUT_LISTENERS_BOUND] = true;
	register(socket);
}

/**
 * Single Socket.IO client for the app. Do not call `io()` elsewhere.
 * Multiple calls return the same instance; `io()` runs at most once per tab session.
 */
export function getSocket(): Socket {
	if (!browser) {
		throw new Error('getSocket() is only available in the browser');
	}
	if (!singletonSocket) {
		warnDevIfPublicWsUrlMismatchesPage();
		// Single `io()` per module load — all callers must use `getSocket()`.
		singletonSocket = io(getSocketIoOrigin(), {
			path: SOCKET_IO_SERVER_PATH,
			withCredentials: true,
			transports: ['polling', 'websocket'],
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
			randomizationFactor: 0.5,
			auth: { token: typeof localStorage !== 'undefined' ? localStorage.token : undefined }
		});
	}
	return singletonSocket;
}

/**
 * Dispose the stale socket instance and clear the singleton so the next `getSocket()` call
 * creates a fresh connection with a new Engine.IO handshake.
 *
 * Call this when the backend restarts and the existing SID is invalid (repeated polling 400s).
 * The caller is responsible for immediately calling `getSocket()` and reattaching listeners.
 */
export function resetSocket(): void {
	if (!singletonSocket) return;
	try {
		singletonSocket.removeAllListeners();
		singletonSocket.disconnect();
	} catch {
		// ignore errors during cleanup of a stale socket
	}
	singletonSocket = null;
}
