/**
 * Client-side previews for Files grid: PDF page 1 and a representative video frame.
 * Output is object URLs (JPEG) sized for thumbnails — callers must revoke when done.
 *
 * Must stay free of top-level `pdfjs-dist` / `?url` worker imports so SvelteKit SSR
 * can render the Files route without touching browser-only modules.
 */
let pdfjsModule: typeof import('pdfjs-dist') | null = null;

async function getPdfjs(): Promise<typeof import('pdfjs-dist')> {
	if (typeof document === 'undefined') {
		throw new Error('PDF snapshots are client-only');
	}
	if (!pdfjsModule) {
		const pdfjs = await import('pdfjs-dist');
		const { default: workerSrc } = await import('pdfjs-dist/build/pdf.worker.mjs?url');
		pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
		pdfjsModule = pdfjs;
	}
	return pdfjsModule;
}

function canvasToJpegObjectUrl(canvas: HTMLCanvasElement, quality: number): Promise<string> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(b) => {
				if (!b) reject(new Error('canvas.toBlob failed'));
				else resolve(URL.createObjectURL(b));
			},
			'image/jpeg',
			quality
		);
	});
}

/** Renders PDF page 1 to a JPEG blob URL; destroys the document when done. */
export async function snapPdfFirstPageToObjectUrl(arrayBuffer: ArrayBuffer): Promise<string> {
	if (typeof document === 'undefined') {
		throw new Error('PDF snapshots are client-only');
	}
	const pdfjs = await getPdfjs();
	const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
	try {
		const page = await pdf.getPage(1);
		const base = page.getViewport({ scale: 1 });
		const maxCssPx = 520;
		const scale = Math.min(maxCssPx / base.width, 2.75);
		const viewport = page.getViewport({ scale });
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d', { alpha: false });
		if (!ctx) throw new Error('2d context unavailable');
		canvas.width = Math.ceil(viewport.width);
		canvas.height = Math.ceil(viewport.height);
		await page.render({ canvasContext: ctx, viewport }).promise;
		// Upper band only — keeps letterheads/titles readable when the rest of the page is sparse.
		const topPx = Math.min(
			canvas.height,
			Math.max(140, Math.floor(canvas.height * 0.42)),
			360
		);
		const cropped = document.createElement('canvas');
		cropped.width = canvas.width;
		cropped.height = topPx;
		const cctx = cropped.getContext('2d', { alpha: false });
		if (!cctx) throw new Error('2d context unavailable');
		cctx.drawImage(canvas, 0, 0, canvas.width, topPx, 0, 0, canvas.width, topPx);
		return await canvasToJpegObjectUrl(cropped, 0.82);
	} finally {
		await pdf.destroy().catch(() => {});
	}
}

/**
 * Decodes a frame from a video blob URL and returns a JPEG object URL.
 * Revokes `blobUrl` before returning (caller should not use it afterward).
 */
export async function snapVideoFrameToObjectUrl(blobUrl: string): Promise<string> {
	if (typeof document === 'undefined') {
		throw new Error('Video snapshots are client-only');
	}
	const video = document.createElement('video');
	video.muted = true;
	video.playsInline = true;
	video.setAttribute('playsinline', '');
	video.preload = 'metadata';
	video.src = blobUrl;

	try {
		await new Promise<void>((resolve, reject) => {
			video.onloadedmetadata = () => resolve();
			video.onerror = () => reject(new Error('video decode failed'));
			if (video.readyState >= HTMLMediaElement.HAVE_METADATA) resolve();
		});

		try {
			await video.play();
		} catch {
			/* decode path varies by browser / autoplay policy */
		}
		video.pause();

		const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 2;
		const t = Math.min(0.5, Math.max(0.04, dur * 0.02));
		if (Math.abs(video.currentTime - t) > 0.001) {
			video.currentTime = t;
			await new Promise<void>((resolve, reject) => {
				video.onseeked = () => resolve();
				video.onerror = () => reject(new Error('video seek failed'));
			});
		}

		const vw = video.videoWidth;
		const vh = video.videoHeight;
		if (!vw || !vh) throw new Error('missing video dimensions');

		const maxCssPx = 520;
		const s = Math.min(maxCssPx / vw, maxCssPx / vh, 2.75);
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d', { alpha: false });
		if (!ctx) throw new Error('2d context unavailable');
		canvas.width = Math.ceil(vw * s);
		canvas.height = Math.ceil(vh * s);
		ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		return await canvasToJpegObjectUrl(canvas, 0.82);
	} finally {
		URL.revokeObjectURL(blobUrl);
		video.removeAttribute('src');
		video.load();
	}
}
