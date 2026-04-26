/**
 * DOCX / spreadsheet grid previews via mammoth + SheetJS + html2canvas-pro.
 * Client-only; dynamic-import from CaseFileGridThumb so SSR stays clean.
 */

const MAX_OFFICE_BYTES = 22 * 1024 * 1024;
const PREVIEW_WRAP_W = 440;
const PREVIEW_WRAP_H = 240;

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

function escapeCell(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildPreviewTable(rows: unknown[][]): string {
	let h =
		'<table style="border-collapse:collapse;width:100%;font:11px/1.35 system-ui,Segoe UI,sans-serif;color:#111">';
	for (let i = 0; i < rows.length; i++) {
		h += '<tr>';
		const r = rows[i] ?? [];
		for (let j = 0; j < r.length; j++) {
			const raw = r[j];
			const cell = raw === null || raw === undefined ? '' : String(raw);
			h += `<td style="border:1px solid #e5e7eb;padding:4px 8px;max-width:140px;vertical-align:top">${escapeCell(cell)}</td>`;
		}
		h += '</tr>';
	}
	h += '</table>';
	return h;
}

/** Sanitized HTML for scrollable DOCX previews (side panel, modal); client-only. */
export async function docxArrayBufferToSanitizedHtml(arrayBuffer: ArrayBuffer): Promise<string> {
	if (typeof document === 'undefined') throw new Error('DOCX preview is client-only');
	if (arrayBuffer.byteLength > MAX_OFFICE_BYTES) throw new Error('document too large for preview');

	const [{ default: mammoth }, { default: DOMPurify }] = await Promise.all([
		import('mammoth'),
		import('dompurify')
	]);

	const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
	return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

export async function snapDocxToPreviewUrl(arrayBuffer: ArrayBuffer): Promise<string> {
	if (typeof document === 'undefined') throw new Error('DOCX preview is client-only');

	const clean = await docxArrayBufferToSanitizedHtml(arrayBuffer);
	const { default: html2canvas } = await import('html2canvas-pro');

	const wrap = document.createElement('div');
	wrap.style.cssText = [
		`position:fixed`,
		`left:-9999px`,
		`top:0`,
		`width:${PREVIEW_WRAP_W}px`,
		`height:${PREVIEW_WRAP_H}px`,
		`overflow:hidden`,
		`background:#fff`,
		`color:#111`,
		`font:12px/1.45 system-ui,Segoe UI,sans-serif`,
		`padding:14px 18px`,
		`box-sizing:border-box`,
		`border:1px solid #e5e7eb`
	].join(';');
	wrap.innerHTML = clean;
	document.body.appendChild(wrap);
	await new Promise<void>((r) => requestAnimationFrame(() => r()));

	try {
		const canvas = await html2canvas(wrap, {
			backgroundColor: '#ffffff',
			scale: Math.min(1.2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1),
			width: PREVIEW_WRAP_W,
			height: PREVIEW_WRAP_H,
			windowWidth: PREVIEW_WRAP_W,
			windowHeight: PREVIEW_WRAP_H,
			useCORS: true
		});
		return await canvasToJpegObjectUrl(canvas, 0.82);
	} finally {
		wrap.remove();
	}
}

export async function snapSpreadsheetToPreviewUrl(arrayBuffer: ArrayBuffer): Promise<string> {
	if (typeof document === 'undefined') throw new Error('Spreadsheet preview is client-only');
	if (arrayBuffer.byteLength > MAX_OFFICE_BYTES) throw new Error('spreadsheet too large for preview');

	const [{ default: XLSX }, { default: DOMPurify }, { default: html2canvas }] = await Promise.all([
		import('xlsx'),
		import('dompurify'),
		import('html2canvas-pro')
	]);

	const wb = XLSX.read(arrayBuffer, { type: 'array' });
	if (!wb.SheetNames?.length) throw new Error('no sheets');
	const ws = wb.Sheets[wb.SheetNames[0]];
	const rawRows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
		header: 1,
		defval: '',
		blankrows: false
	}) as unknown[][];
	const rows = rawRows.slice(0, 24).map((r) => (Array.isArray(r) ? r.slice(0, 14) : []));
	if (!rows.length) {
		const empty = document.createElement('canvas');
		empty.width = 2;
		empty.height = 2;
		const ctx = empty.getContext('2d');
		if (ctx) {
			ctx.fillStyle = '#fff';
			ctx.fillRect(0, 0, 2, 2);
		}
		return await canvasToJpegObjectUrl(empty, 0.82);
	}

	const tableHtml = buildPreviewTable(rows);
	const clean = DOMPurify.sanitize(tableHtml, { USE_PROFILES: { html: true } });

	const wrap = document.createElement('div');
	wrap.style.cssText = [
		`position:fixed`,
		`left:-9999px`,
		`top:0`,
		`width:${PREVIEW_WRAP_W}px`,
		`height:${PREVIEW_WRAP_H}px`,
		`overflow:hidden`,
		`background:#fff`,
		`padding:10px 12px`,
		`box-sizing:border-box`,
		`border:1px solid #e5e7eb`
	].join(';');
	wrap.innerHTML = clean;
	document.body.appendChild(wrap);
	await new Promise<void>((r) => requestAnimationFrame(() => r()));

	try {
		const canvas = await html2canvas(wrap, {
			backgroundColor: '#ffffff',
			scale: Math.min(1.2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1),
			width: PREVIEW_WRAP_W,
			height: PREVIEW_WRAP_H,
			windowWidth: PREVIEW_WRAP_W,
			windowHeight: PREVIEW_WRAP_H,
			useCORS: true
		});
		return await canvasToJpegObjectUrl(canvas, 0.82);
	} finally {
		wrap.remove();
	}
}
