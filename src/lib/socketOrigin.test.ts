/**
 * WebSocket / Socket.IO origin resolution — explicit `PUBLIC_WS_URL` or same-origin (see socketOrigin.ts).
 */
import { describe, it, expect } from 'vitest';
import { resolveSocketIoOrigin, SOCKET_IO_SERVER_PATH } from './socketOrigin';

describe('resolveSocketIoOrigin', () => {
	it('uses PUBLIC_WS_URL when set (strips trailing slash)', () => {
		expect(
			resolveSocketIoOrigin({
				browser: true,
				publicWsUrl: 'http://192.168.1.5:8080/'
			})
		).toBe('http://192.168.1.5:8080');
	});

	it('undefined when PUBLIC_WS_URL unset — same origin as page; Vite proxies /ws (no :8080 in resolver)', () => {
		expect(
			resolveSocketIoOrigin({
				browser: true,
				publicWsUrl: ''
			})
		).toBeUndefined();
	});

	it('SSR (browser=false): undefined', () => {
		expect(
			resolveSocketIoOrigin({
				browser: false,
				publicWsUrl: ''
			})
		).toBeUndefined();
	});

	it('SOCKET_IO_SERVER_PATH is stable', () => {
		expect(SOCKET_IO_SERVER_PATH).toBe('/ws/socket.io');
	});
});
