import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import fs from 'node:fs';

import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	// HTTP/WS proxy target for dev: where Vite forwards /api, /ollama, /ws, etc. (Python uvicorn, typically 8080).
	// Browser Socket.IO uses the Vite origin (3001) by default; Vite proxies /ws here. Not the browser resolver.
	const owuiBackendPort = env.PUBLIC_WEBUI_BACKEND_PORT || env.WEBUI_BACKEND_PORT || '8080';
	const owuiBackendTarget = `http://127.0.0.1:${owuiBackendPort}`;
	const caseEngineTarget = 'http://127.0.0.1:3010';
	const devHttpsKeyPath = env.DEV_HTTPS_KEY_FILE?.trim();
	const devHttpsCertPath = env.DEV_HTTPS_CERT_FILE?.trim();

	const devHttps =
		devHttpsKeyPath &&
		devHttpsCertPath &&
		fs.existsSync(devHttpsKeyPath) &&
		fs.existsSync(devHttpsCertPath)
			? {
					key: fs.readFileSync(devHttpsKeyPath),
					cert: fs.readFileSync(devHttpsCertPath)
				}
			: undefined;

	return {
		plugins: [
			sveltekit(),
			{
				name: 'detective-stack-log-targets',
				configureServer(server) {
					server.httpServer?.once('listening', () => {
						console.log('');
						console.log('  [Detective Stack] Proxy targets:');
						console.log('    Case Engine:     ', caseEngineTarget);
						console.log('    WebUI backend:   ', owuiBackendTarget);
						console.log('    WebSocket /ws:   ', owuiBackendTarget);
						console.log(
							'    Frontend scheme: ',
							devHttps ? 'https (DEV_HTTPS_KEY_FILE/DEV_HTTPS_CERT_FILE)' : 'http'
						);
						console.log('');
					});
				}
			},
			viteStaticCopy({
				targets: [
					{
						src: 'node_modules/onnxruntime-web/dist/*.jsep.*',

						dest: 'wasm'
					}
				]
			})
		],
		define: {
			APP_VERSION: JSON.stringify(process.env.npm_package_version),
			APP_BUILD_HASH: JSON.stringify(process.env.APP_BUILD_HASH || 'dev-build')
		},
		server: {
			host: true,
			port: 3001,
			strictPort: true,
			https: devHttps,
			proxy: {
				'/case-api': {
					target: caseEngineTarget,
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/case-api/, '')
				},
				'/api': { target: owuiBackendTarget, changeOrigin: true },
				'/ollama': { target: owuiBackendTarget, changeOrigin: true },
				'/openai': { target: owuiBackendTarget, changeOrigin: true },
				// IMPORTANT:
				// Socket.IO (Engine.IO) requires:
				// - sticky session behavior via cookies
				// - exact path preservation (/ws/socket.io)
				// - ws: true for upgrade support
				// Any rewrite or header loss will cause 400 polling errors
				'/ws': {
					target:
						'http://127.0.0.1:' +
						(process.env.WEBUI_BACKEND_PORT ||
							env.WEBUI_BACKEND_PORT ||
							env.PUBLIC_WEBUI_BACKEND_PORT ||
							'8080'),
					ws: true,
					changeOrigin: true,
					secure: false,

					// CRITICAL: do NOT rewrite path
					// Socket.IO requires exact path preservation

					configure: (proxy, _options) => {
						proxy.on('proxyReq', (proxyReq, req, _res) => {
							// Preserve original headers for Engine.IO session continuity
							if (req.headers.cookie) {
								proxyReq.setHeader('cookie', req.headers.cookie);
							}
						});

						proxy.on('error', (err, _req, _res) => {
							console.error('[VITE PROXY ERROR]', err.message);
						});
					}
				},
				'/static': { target: owuiBackendTarget, changeOrigin: true }
			},
			watch: {
				ignored: ['**/.venv/**', '**/node_modules/.pnpm/**']
			}
		},
		build: {
			sourcemap: true
		},
		worker: {
			format: 'es'
		},
		esbuild: {
			pure: process.env.ENV === 'dev' ? [] : ['console.log', 'console.debug', 'console.error']
		}
	};
});
