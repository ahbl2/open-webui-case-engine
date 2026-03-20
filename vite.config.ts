import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const owuiBackendPort = env.PUBLIC_WEBUI_BACKEND_PORT || env.WEBUI_BACKEND_PORT || '8080';
	const owuiBackendTarget = `http://127.0.0.1:${owuiBackendPort}`;
	const caseEngineTarget = 'http://127.0.0.1:3010';

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
			proxy: {
				'/case-api': {
					target: caseEngineTarget,
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/case-api/, '')
				},
				'/api': { target: owuiBackendTarget, changeOrigin: true },
				'/ollama': { target: owuiBackendTarget, changeOrigin: true },
				'/openai': { target: owuiBackendTarget, changeOrigin: true },
				'/ws': { target: owuiBackendTarget, changeOrigin: true, ws: true },
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
