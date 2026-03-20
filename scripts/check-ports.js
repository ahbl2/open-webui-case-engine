#!/usr/bin/env node
/**
 * Fail-fast port validation for Detective Stack local dev.
 * Ports 3001, 3010, 8080 are fixed infrastructure—no auto-fallback.
 *
 * Usage:
 *   node scripts/check-ports.js              # check 3001, 3010, 8080
 *   node scripts/check-ports.js 8080         # check only 8080
 *   node scripts/check-ports.js 3001 8080    # check 3001 and 8080
 */

import net from 'node:net';

const DEFAULTS = [3001, 3010, 8080];
const LABELS = {
	3001: 'Open WebUI frontend (Vite)',
	3010: 'Case Engine API',
	8080: 'Open WebUI backend (Python/uvicorn)'
};

function isPortInUse(port) {
	return new Promise((resolve) => {
		const server = net.createServer(() => {});
		server.once('error', (err) => {
			resolve(err.code === 'EADDRINUSE');
		});
		server.once('listening', () => {
			server.close(() => resolve(false));
		});
		server.listen(port, '127.0.0.1');
	});
}

async function checkPort(port) {
	const inUse = await isPortInUse(port);
	return { port, inUse, label: LABELS[port] || `port ${port}` };
}

async function main() {
	const ports = process.argv.slice(2).map((p) => parseInt(p, 10)).filter((n) => !isNaN(n) && n > 0);
	const toCheck = ports.length ? ports : DEFAULTS;

	const results = await Promise.all(toCheck.map(checkPort));
	const occupied = results.filter((r) => r.inUse);

	if (occupied.length === 0) {
		process.exit(0);
	}

	for (const r of occupied) {
		console.error('');
		console.error(`  required port ${r.port} is already in use (${r.label})`);
	}
	console.error('');
	console.error('  Detective Stack ports are fixed and may not auto-fallback.');
	console.error('  Stop the conflicting process or reconfigure that other service, then retry.');
	console.error('');
	process.exit(1);
}

main();
