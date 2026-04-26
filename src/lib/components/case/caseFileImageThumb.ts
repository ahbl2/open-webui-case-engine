/**
 * Grid card image thumbs: downscale large photos client-side so decode/paint stays light.
 * Network still fetches the full file unless the API adds a resize param later.
 */
const GRID_THUMB_MAX_EDGE_PX = 900;

function canvasToJpegObjectUrl(canvas: HTMLCanvasElement): Promise<string> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(b) => {
				if (!b) reject(new Error('toBlob'));
				else resolve(URL.createObjectURL(b));
			},
			'image/jpeg',
			0.88
		);
	});
}

/**
 * Returns a blob: URL suitable for a small card preview. Large images are resized;
 * tiny files or decode failures fall back to the original blob URL.
 */
export async function blobToGridThumbObjectUrl(blob: Blob): Promise<string> {
	if (typeof document === 'undefined') {
		throw new Error('Image thumb preview is client-only');
	}
	const t = blob.type || '';
	if (!t.startsWith('image/') || t === 'image/svg+xml') {
		return URL.createObjectURL(blob);
	}
	if (blob.size < 100_000) {
		return URL.createObjectURL(blob);
	}

	let bmp: ImageBitmap | null = null;
	try {
		bmp = await createImageBitmap(blob);
		const w = bmp.width;
		const h = bmp.height;
		const maxEdge = Math.max(w, h);
		const scale = Math.min(1, GRID_THUMB_MAX_EDGE_PX / maxEdge);
		if (scale >= 0.995) {
			bmp.close();
			return URL.createObjectURL(blob);
		}
		const tw = Math.max(1, Math.round(w * scale));
		const th = Math.max(1, Math.round(h * scale));

		try {
			const resized = await createImageBitmap(bmp, {
				resizeWidth: tw,
				resizeHeight: th,
				resizeQuality: 'high'
			});
			bmp.close();
			bmp = null;
			const canvas = document.createElement('canvas');
			canvas.width = resized.width;
			canvas.height = resized.height;
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				resized.close();
				return URL.createObjectURL(blob);
			}
			ctx.drawImage(resized, 0, 0);
			resized.close();
			return await canvasToJpegObjectUrl(canvas);
		} catch {
			/* resize option unsupported — scale on 2D canvas */
			const canvas = document.createElement('canvas');
			canvas.width = tw;
			canvas.height = th;
			const ctx = canvas.getContext('2d');
			if (!ctx || !bmp) {
				bmp?.close();
				return URL.createObjectURL(blob);
			}
			ctx.drawImage(bmp, 0, 0, tw, th);
			bmp.close();
			bmp = null;
			return await canvasToJpegObjectUrl(canvas);
		}
	} catch {
		bmp?.close();
		return URL.createObjectURL(blob);
	}
}
