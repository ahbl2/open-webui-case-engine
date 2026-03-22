/**
 * Socket.IO singleton + layout listener guard (see socket.ts, +layout.svelte).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Socket } from 'socket.io-client';
import { attachLayoutSocketListenersOnce } from './socket';

describe('attachLayoutSocketListenersOnce', () => {
	it('invokes register only once for the same socket instance', () => {
		const register = vi.fn();
		const mockSocket = {} as Socket;
		attachLayoutSocketListenersOnce(mockSocket, register);
		attachLayoutSocketListenersOnce(mockSocket, register);
		expect(register).toHaveBeenCalledTimes(1);
	});

	it('invokes register once per distinct socket instance', () => {
		const register = vi.fn();
		attachLayoutSocketListenersOnce({} as Socket, register);
		attachLayoutSocketListenersOnce({} as Socket, register);
		expect(register).toHaveBeenCalledTimes(2);
	});
});

const ioMock = vi.hoisted(() =>
	vi.fn(() => ({
		on: vi.fn(),
		off: vi.fn(),
		disconnect: vi.fn()
	}))
);

vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('socket.io-client', () => ({ io: ioMock }));
vi.mock('$lib/constants', () => ({ getSocketIoOrigin: () => undefined }));

describe('getSocket', () => {
	beforeEach(async () => {
		vi.resetModules();
		ioMock.mockClear();
	});

	it('calls io() once when getSocket() is invoked multiple times', async () => {
		const { getSocket } = await import('./socket');
		getSocket();
		getSocket();
		expect(ioMock).toHaveBeenCalledTimes(1);
	});
});
