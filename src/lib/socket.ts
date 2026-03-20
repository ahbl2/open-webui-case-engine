import { browser } from '$app/environment';
import { io, type Socket } from 'socket.io-client';
import { getSocketIoOrigin } from '$lib/constants';

let singletonSocket: Socket | null = null;

/**
 * Single Socket.IO client for the app. Do not call `io()` elsewhere.
 */
export function getSocket(): Socket {
	if (!browser) {
		throw new Error('getSocket() is only available in the browser');
	}
	if (!singletonSocket) {
		singletonSocket = io(getSocketIoOrigin(), {
			path: '/ws/socket.io',
			withCredentials: true,
			transports: ['websocket', 'polling'],
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
			randomizationFactor: 0.5,
			auth: { token: typeof localStorage !== 'undefined' ? localStorage.token : undefined }
		});
	}
	return singletonSocket;
}
